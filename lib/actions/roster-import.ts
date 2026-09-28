"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guard";
import {
  parseRosterWorkbookBuffer,
  parseRosterCsvBuffer,
  type RosterRow,
} from "@/lib/songs/roster-import";

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

async function applyRosterRows(teamId: string, rows: RosterRow[]): Promise<RosterImportSummary> {
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
        const existingAssignment = await prisma.songAssignment.findFirst({
          where: { setSongId: setSong.id, teamMemberId: entry.memberId },
        });
        if (existingAssignment) {
          if (existingAssignment.role !== entry.role) {
            await prisma.songAssignment.update({
              where: { id: existingAssignment.id },
              data: { role: entry.role },
            });
          }
        } else {
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

export async function importRosterFromSpreadsheet(formData: FormData): Promise<RosterImportSummary> {
  const { team } = await requireUser();

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No file was provided.");
  if (file.size > MAX_FILE_BYTES) throw new Error("File is too large (max 10MB).");

  const buffer = Buffer.from(await file.arrayBuffer());
  const isCsv = file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";

  const rows = isCsv
    ? await parseRosterCsvBuffer(buffer)
    : await parseRosterWorkbookBuffer(buffer);

  if (rows.length === 0) {
    throw new Error(
      "Couldn't find any rows with a name in that file. Expect columns like Name, Role, and optionally Date.",
    );
  }

  const summary = await applyRosterRows(team.id, rows);
  revalidatePath("/team");
  revalidatePath("/sets");
  revalidatePath("/my-part");
  return summary;
}

export async function importRosterFromImage(formData: FormData): Promise<RosterImportSummary> {
  const { team } = await requireUser();

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "Image roster import needs an ANTHROPIC_API_KEY set in your environment variables. Spreadsheet import (.xlsx/.csv) works without one.",
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No image was provided.");
  if (file.size > MAX_FILE_BYTES) throw new Error("Image is too large (max 10MB).");

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");

  const SUPPORTED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
  type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number];
  const normalizedType = file.type === "image/jpg" ? "image/jpeg" : file.type;
  if (!SUPPORTED_MEDIA_TYPES.includes(normalizedType as SupportedMediaType)) {
    throw new Error("Please upload a PNG, JPEG, GIF, or WEBP image.");
  }
  const mediaType = normalizedType as SupportedMediaType;

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
            text: `This is a photo or screenshot of a worship team roster/schedule. Extract every person listed along with their role or instrument, and the service date if one is shown (as YYYY-MM-DD; if you can only tell it's e.g. "this Sunday" with no explicit date, leave date null — do not guess a date).

Respond with ONLY a JSON array, no other text, in this exact shape:
[{"name": "Full Name", "role": "Role or Instrument", "date": "YYYY-MM-DD" | null}]

If you cannot read the image clearly enough to extract real names, respond with an empty array: []`,
          },
        ],
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Couldn't read a response from the image — please try again.");
  }

  let parsed: { name: string; role: string; date: string | null }[];
  try {
    const jsonMatch = textBlock.text.match(/\[[\s\S]*\]/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : textBlock.text);
  } catch {
    throw new Error("Couldn't understand that image as a roster — try a clearer typed image or a spreadsheet.");
  }

  const rows: RosterRow[] = parsed
    .filter((p) => p && typeof p.name === "string" && p.name.trim())
    .map((p) => ({ name: p.name.trim(), role: (p.role || "Other").trim(), dateText: p.date }));

  if (rows.length === 0) {
    throw new Error("Couldn't find any names in that image — try a clearer typed image or a spreadsheet.");
  }

  const summary = await applyRosterRows(team.id, rows);
  revalidatePath("/team");
  revalidatePath("/sets");
  revalidatePath("/my-part");
  return summary;
}
