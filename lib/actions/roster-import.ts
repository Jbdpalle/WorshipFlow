"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser, isLeaderRole } from "@/lib/auth/guard";
import {
  parseRosterWorkbookBuffer,
  parseRosterCsvBuffer,
  type RosterRow,
} from "@/lib/songs/roster-import";
import { ensurePrimaryTeamMemberRole } from "@/lib/songs/team-member-roles";
import { runAction, type ActionResultData } from "@/lib/actions/action-result";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export type RosterImportSummary = {
  membersCreated: number;
  membersUpdated: number;
  assignmentsCreated: number;
  matchedSets: { id: string; title: string }[];
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

// Wraps the actual per-row work below: any single row can throw (a DB
// constraint, a transient connection issue), and left uncaught that would
// fail the whole import with an opaque, redacted production error instead
// of a message that at least says something went wrong and to retry.
async function applyRosterRows(teamId: string, rows: RosterRow[]): Promise<ActionResultData<RosterImportSummary>> {
  try {
    return { ok: true, data: await applyRosterRowsUnsafe(teamId, rows) };
  } catch (err) {
    console.error("Roster import failed partway through:", err);
    return { ok: false, error: "Something went wrong partway through importing — please try again." };
  }
}

async function applyRosterRowsUnsafe(teamId: string, rows: RosterRow[]): Promise<RosterImportSummary> {
  const summary: RosterImportSummary = {
    membersCreated: 0,
    membersUpdated: 0,
    assignmentsCreated: 0,
    matchedSets: [],
    rowsSkipped: 0,
  };

  const existingMembers = await prisma.teamMember.findMany({ where: { teamId } });
  const byName = new Map(existingMembers.map((m) => [m.name.toLowerCase(), m]));

  const teamSets = await prisma.worshipSet.findMany({
    where: { teamId, serviceDate: { not: null } },
    include: { songs: true },
  });

  const rowsByDate = new Map<string, { date: Date; entries: { memberId: string; role: string }[] }>();

  for (const row of rows) {
    const name = row.name.trim();
    if (!name) {
      summary.rowsSkipped++;
      continue;
    }

    let member = byName.get(name.toLowerCase());
    if (!member) {
      member = await prisma.teamMember.create({
        data: { teamId, name, role: row.role, instrument: row.role },
      });
      byName.set(name.toLowerCase(), member);
      summary.membersCreated++;
    } else if (member.role !== row.role) {
      member = await prisma.teamMember.update({
        where: { id: member.id },
        data: { role: row.role, instrument: row.role },
      });
      byName.set(name.toLowerCase(), member);
      summary.membersUpdated++;
    }
    // A person can play different roles across weeks (e.g. Acoustic one
    // Sunday, Bass the next); accumulate all of them, not just the latest.
    await ensurePrimaryTeamMemberRole(prisma, member.id, row.role);

    const date = parseRosterDate(row.dateText);
    if (date) {
      const key = date.toDateString();
      const bucket = rowsByDate.get(key) ?? { date, entries: [] };
      bucket.entries.push({ memberId: member.id, role: row.role });
      rowsByDate.set(key, bucket);
    }
  }

  for (const { date, entries } of rowsByDate.values()) {
    const matchedSet = teamSets.find((s) => s.serviceDate && sameDay(s.serviceDate, date));
    if (!matchedSet || matchedSet.songs.length === 0) continue;

    summary.matchedSets.push({ id: matchedSet.id, title: matchedSet.title });

    for (const setSong of matchedSet.songs) {
      for (const entry of entries) {
        // Matched by (song, member, role) — not just (song, member) — so a
        // person listed twice for the same date under different roles (e.g.
        // leading AND playing acoustic that Sunday) gets both, instead of
        // the second row silently overwriting the first. The tradeoff: if a
        // re-imported file corrects someone's role for a date they were
        // already imported under, this adds the new role alongside the old
        // one rather than replacing it — a stale role has to be removed by
        // hand from that song's per-song assignments afterward.
        const existingAssignment = await prisma.songAssignment.findFirst({
          where: { setSongId: setSong.id, teamMemberId: entry.memberId, role: entry.role },
        });
        if (!existingAssignment) {
          await prisma.songAssignment.create({
            data: { setSongId: setSong.id, teamMemberId: entry.memberId, role: entry.role },
          });
          summary.assignmentsCreated++;
        }
      }
    }
  }

  return summary;
}

export async function importRosterFromSpreadsheet(
  formData: FormData,
): Promise<ActionResultData<RosterImportSummary>> {
  return runAction(async () => {
    const { team, membershipRole } = await requireUser();
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

    const result = await applyRosterRows(team.id, rows);
    if (!result.ok) return result;
    revalidatePath("/team");
    revalidatePath("/sets");
    revalidatePath("/my-part");
    return result;
  });
}

export async function importRosterFromImage(
  formData: FormData,
): Promise<ActionResultData<RosterImportSummary>> {
  return runAction(async () => {
    const { team, membershipRole } = await requireUser();
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

    const result = await applyRosterRows(team.id, rows);
    if (!result.ok) return result;
    revalidatePath("/team");
    revalidatePath("/sets");
    revalidatePath("/my-part");
    return result;
  });
}
