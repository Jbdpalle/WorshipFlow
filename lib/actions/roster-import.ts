"use server";

import { revalidatePath } from "next/cache";
import type { TeamMember, TeamPlan } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireUser, isLeaderRole } from "@/lib/auth/guard";
import {
  parseRosterWorkbookBuffer,
  parseRosterCsvBuffer,
  type RosterRow,
} from "@/lib/songs/roster-import";
import { ensurePrimaryTeamMemberRole } from "@/lib/songs/team-member-roles";
import { normalizeMemberName } from "@/lib/songs/member-name";
import { runAction, type ActionResultData } from "@/lib/actions/action-result";
import { checkCanCreateSet } from "@/lib/plans/limits";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export type DateRosterResult = {
  dateText: string; // as formatted for display, e.g. "Sunday, October 11"
  serviceId: string;
  serviceCreated: boolean;
  roster: { name: string; role: string }[];
};

export type NeedsReviewEntry = {
  name: string;
  dateText: string | null;
  reason: "ambiguous" | "service-limit-reached";
  detail: string;
};

export type RosterImportSummary = {
  membersCreated: number;
  membersUpdated: number;
  servicesCreated: number;
  assignmentsCreated: number;
  matchedSets: { id: string; title: string }[];
  dateResults: DateRosterResult[];
  needsReview: NeedsReviewEntry[];
  rowsSkipped: number;
};

function parseRosterDate(dateText: string | null): Date | null {
  if (!dateText) return null;
  const isoMatch = dateText.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }
  const slashMatch = dateText.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (slashMatch) {
    const [, m, d, yRaw] = slashMatch;
    const y = yRaw.length === 2 ? 2000 + Number(yRaw) : Number(yRaw);
    return new Date(y, Number(m) - 1, Number(d));
  }
  const parsed = new Date(dateText);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatServiceTitle(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

type MatchResult =
  | { kind: "exact" | "prefix"; member: TeamMember }
  | { kind: "ambiguous"; candidates: TeamMember[] }
  | { kind: "none" };

// Exact match (case/whitespace-insensitive) first. Failing that, a
// first-name-style prefix match ("Joel" against an existing "Joel Palle")
// — but ONLY when exactly one existing member could plausibly be meant.
// Multiple candidates are reported for review rather than guessed at,
// since a wrong auto-match silently points someone's assignment at the
// wrong person, which is worse than asking a human to resolve it once.
function matchMember(csvName: string, members: TeamMember[]): MatchResult {
  const normalized = normalizeMemberName(csvName);
  const exact = members.find((m) => normalizeMemberName(m.name) === normalized);
  if (exact) return { kind: "exact", member: exact };

  const prefixCandidates = members.filter((m) => {
    const memberNormalized = normalizeMemberName(m.name);
    return (
      memberNormalized.startsWith(`${normalized} `) || normalized.startsWith(`${memberNormalized} `)
    );
  });
  if (prefixCandidates.length === 1) return { kind: "prefix", member: prefixCandidates[0] };
  if (prefixCandidates.length > 1) return { kind: "ambiguous", candidates: prefixCandidates };
  return { kind: "none" };
}

// Wraps the actual per-row work below: any single row can throw (a DB
// constraint, a transient connection issue), and left uncaught that would
// fail the whole import with an opaque, redacted production error instead
// of a message that at least says something went wrong and to retry.
async function applyRosterRows(
  teamId: string,
  teamPlan: TeamPlan,
  isDemo: boolean,
  rows: RosterRow[],
): Promise<ActionResultData<RosterImportSummary>> {
  try {
    return { ok: true, data: await applyRosterRowsUnsafe(teamId, teamPlan, isDemo, rows) };
  } catch (err) {
    console.error("Roster import failed partway through:", err);
    return { ok: false, error: "Something went wrong partway through importing — please try again." };
  }
}

async function applyRosterRowsUnsafe(
  teamId: string,
  teamPlan: TeamPlan,
  isDemo: boolean,
  rows: RosterRow[],
): Promise<RosterImportSummary> {
  const summary: RosterImportSummary = {
    membersCreated: 0,
    membersUpdated: 0,
    servicesCreated: 0,
    assignmentsCreated: 0,
    matchedSets: [],
    dateResults: [],
    needsReview: [],
    rowsSkipped: 0,
  };

  const members = await prisma.teamMember.findMany({ where: { teamId } });

  type DateBucket = { date: Date; entries: { member: TeamMember; role: string }[] };
  const rowsByDate = new Map<string, DateBucket>();

  for (const row of rows) {
    const name = row.name.trim();
    if (!name) {
      summary.rowsSkipped++;
      continue;
    }

    const date = parseRosterDate(row.dateText);
    const match = matchMember(name, members);

    if (match.kind === "ambiguous") {
      summary.needsReview.push({
        name,
        dateText: date ? formatServiceTitle(date) : row.dateText,
        reason: "ambiguous",
        detail: `"${name}" could match ${match.candidates.map((c) => c.name).join(" or ")} — not assigned. Fix the name in the file (or the roster) and re-import this row.`,
      });
      continue;
    }

    let member: TeamMember;
    if (match.kind === "none") {
      member = await prisma.teamMember.create({
        data: { teamId, name, role: row.role, instrument: row.role },
      });
      members.push(member);
      summary.membersCreated++;
    } else {
      member = match.member;
      if (member.role !== row.role) {
        member = await prisma.teamMember.update({
          where: { id: member.id },
          data: { role: row.role, instrument: row.role },
        });
        const idx = members.findIndex((m) => m.id === member.id);
        if (idx !== -1) members[idx] = member;
        summary.membersUpdated++;
      }
    }
    // A person can play different roles across weeks (e.g. Acoustic one
    // Sunday, Bass the next); accumulate all of them, not just the latest.
    await ensurePrimaryTeamMemberRole(prisma, member.id, row.role);

    if (date) {
      const key = date.toDateString();
      const bucket = rowsByDate.get(key) ?? { date, entries: [] };
      bucket.entries.push({ member, role: row.role });
      rowsByDate.set(key, bucket);
    }
  }

  if (rowsByDate.size === 0) return summary;

  // The whole-service roster (who's serving this Sunday, in what role) is
  // what the CSV actually describes — SetTeamMember, not a per-song
  // override. This also means a date doesn't need any songs added yet for
  // its roster to land, and a person can hold more than one role for the
  // same date without one silently overwriting the other (SetTeamMember's
  // unique key includes role).
  const existingSets = await prisma.worshipSet.findMany({
    where: { teamId, serviceDate: { not: null } },
  });

  for (const { date, entries } of rowsByDate.values()) {
    let set = existingSets.find((s) => s.serviceDate && sameDay(s.serviceDate, date));
    let serviceCreated = false;

    if (!set) {
      const limit = await checkCanCreateSet(teamId, teamPlan, isDemo);
      if (!limit.ok) {
        summary.needsReview.push({
          name: "(service)",
          dateText: formatServiceTitle(date),
          reason: "service-limit-reached",
          detail: `Couldn't create a service for ${formatServiceTitle(date)}: ${limit.error}`,
        });
        continue;
      }
      set = await prisma.worshipSet.create({
        data: { teamId, title: formatServiceTitle(date), serviceDate: date },
      });
      existingSets.push(set);
      serviceCreated = true;
      summary.servicesCreated++;
    }

    summary.matchedSets.push({ id: set.id, title: set.title });

    const dateRoster: { name: string; role: string }[] = [];
    for (const { member, role } of entries) {
      await prisma.setTeamMember.upsert({
        where: { setId_teamMemberId_role: { setId: set.id, teamMemberId: member.id, role } },
        update: {},
        create: { setId: set.id, teamMemberId: member.id, role },
      });
      summary.assignmentsCreated++;
      dateRoster.push({ name: member.name, role });
    }

    summary.dateResults.push({
      dateText: formatServiceTitle(date),
      serviceId: set.id,
      serviceCreated,
      roster: dateRoster,
    });
  }

  return summary;
}

export async function importRosterFromSpreadsheet(
  formData: FormData,
): Promise<ActionResultData<RosterImportSummary>> {
  return runAction(async () => {
    const { user, team, membershipRole } = await requireUser();
    if (!isLeaderRole(membershipRole)) {
      return { ok: false, error: "Only the worship leader can import a roster." };
    }

    const file = formData.get("file");
    if (!(file instanceof File)) return { ok: false, error: "No file was provided." };
    if (file.size > MAX_FILE_BYTES) return { ok: false, error: "File is too large (max 10MB)." };

    const buffer = Buffer.from(await file.arrayBuffer());
    const isCsv = file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";

    const rows = isCsv
      ? await parseRosterCsvBuffer(buffer)
      : await parseRosterWorkbookBuffer(buffer);

    if (rows.length === 0) {
      return {
        ok: false,
        error:
          "Couldn't find any rows with a name in that file. Expect columns like Name, Role, and optionally Date.",
      };
    }

    const result = await applyRosterRows(team.id, team.plan, user.isDemo, rows);
    if (!result.ok) return result;
    revalidatePath("/team");
    revalidatePath("/sets");
    revalidatePath("/my-part");
    revalidatePath("/dashboard");
    return result;
  });
}

export async function importRosterFromImage(
  formData: FormData,
): Promise<ActionResultData<RosterImportSummary>> {
  return runAction(async () => {
    const { user, team, membershipRole } = await requireUser();
    if (!isLeaderRole(membershipRole)) {
      return { ok: false, error: "Only the worship leader can import a roster." };
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        ok: false,
        error:
          "Image roster import is coming in a future update — stay tuned! Spreadsheet import (.xlsx/.csv) works today.",
      };
    }

    const file = formData.get("file");
    if (!(file instanceof File)) return { ok: false, error: "No image was provided." };
    if (file.size > MAX_FILE_BYTES) return { ok: false, error: "Image is too large (max 10MB)." };

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    const SUPPORTED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
    type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number];
    const normalizedType = file.type === "image/jpg" ? "image/jpeg" : file.type;
    if (!SUPPORTED_MEDIA_TYPES.includes(normalizedType as SupportedMediaType)) {
      return { ok: false, error: "Please upload a PNG, JPEG, GIF, or WEBP image." };
    }
    const mediaType = normalizedType as SupportedMediaType;

    let textBlock: { type: "text"; text: string } | undefined;
    try {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: base64 },
              },
              {
                type: "text",
                text: `This is a photo or screenshot of a worship team roster/schedule. It may be laid out as a simple list ("Name — Role"), or as a table/grid — most commonly with one row per service date and one column per role (e.g. columns "Leader", "Acoustic", "Bass", "Keys", "Drums", "Vocals"), where each cell holds the name(s) assigned to that role for that date.

Extract every (person, role, date) combination:
- If a table has dates down the rows and roles across the columns (or vice versa), treat each row/column intersection as one entry: the cell's role comes from its column header (or row header), and the date from that row's (or column's) date.
- If a cell lists more than one person (separated by "/", ",", "&", or "and", e.g. "Kezia/Kundu"), create a separate entry for each person, all with that same role and date.
- Skip cells that are blank, or that don't name a real person (e.g. a row marked "CAMP", "OFF", "TBD", or similarly not a normal service).
- Dates are often written without a year (e.g. "4th October"). Today's date is ${new Date().toISOString().slice(0, 10)}. For any date missing a year, infer the year assuming this schedule runs forward from around today — i.e. pick whichever year (this one or next) makes that month/day fall on or after today, or continues a visible sequence of consecutive dates in the image. Always output dates as YYYY-MM-DD. If a date is genuinely illegible or entirely absent for an entry, use null — don't guess a specific day you can't read.

Respond with ONLY a JSON array, no other text, in this exact shape:
[{"name": "Full Name", "role": "Role or Instrument", "date": "YYYY-MM-DD" | null}]

If you cannot read the image clearly enough to extract real names, respond with an empty array: []`,
              },
            ],
          },
        ],
      });

      const block = message.content.find((b) => b.type === "text");
      if (block && block.type === "text") textBlock = block;
    } catch (err) {
      console.error("Roster image extraction failed:", err);
      return { ok: false, error: "The image analysis service is unavailable right now — please try again." };
    }

    if (!textBlock) {
      return { ok: false, error: "Couldn't read a response from the image — please try again." };
    }

    let parsed: { name: string; role: string; date: string | null }[];
    try {
      const jsonMatch = textBlock.text.match(/\[[\s\S]*\]/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : textBlock.text);
    } catch {
      return {
        ok: false,
        error: "Couldn't understand that image as a roster — try a clearer typed image or a spreadsheet.",
      };
    }

    const rows: RosterRow[] = parsed
      .filter((p) => p && typeof p.name === "string" && p.name.trim())
      .map((p) => ({ name: p.name.trim(), role: (p.role || "Other").trim(), dateText: p.date }));

    if (rows.length === 0) {
      return {
        ok: false,
        error: "Couldn't find any names in that image — try a clearer typed image or a spreadsheet.",
      };
    }

    const result = await applyRosterRows(team.id, team.plan, user.isDemo, rows);
    if (!result.ok) return result;
    revalidatePath("/team");
    revalidatePath("/sets");
    revalidatePath("/my-part");
    revalidatePath("/dashboard");
    return result;
  });
}
