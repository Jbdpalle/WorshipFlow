"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser, isLeaderRole } from "@/lib/auth/guard";
import { THEME_CATEGORIES, WORSHIP_TYPES } from "@/lib/songs/constants";
import {
  parseSongMetadataWorkbookBuffer,
  parseSongMetadataCsvBuffer,
  type SongMetadataRow,
} from "@/lib/songs/song-metadata-import";
import { runAction, type ActionResultData } from "@/lib/actions/action-result";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const VALID_THEME_LABELS = new Set(THEME_CATEGORIES.map((c) => c.label));
const VALID_WORSHIP_TYPES = new Set<string>(WORSHIP_TYPES);

export type SongMetadataImportSummary = {
  songsMatched: number;
  titlesNotFound: string[];
  themeCategoriesApplied: number;
  tagsApplied: number;
  bibleVersesApplied: number;
  fieldsSkippedAlreadySet: number;
};

// Matches by exact title (case/whitespace-insensitive) rather than fuzzy
// matching — a wrong fuzzy match silently corrupting a song's metadata is
// worse than a row that's reported as "not found" and has to be fixed by
// hand. Existing Key/BPM/Time Signature/Biblical Connection text are never
// overwritten if the song already has a value — this only fills gaps,
// never clobbers what a leader already entered. Tags and Bible verses are
// additive. Theme categories replace the song's full set, since that's the
// one field this import is specifically meant to establish.
async function applyRowsUnsafe(teamId: string, rows: SongMetadataRow[]): Promise<SongMetadataImportSummary> {
  const summary: SongMetadataImportSummary = {
    songsMatched: 0,
    titlesNotFound: [],
    themeCategoriesApplied: 0,
    tagsApplied: 0,
    bibleVersesApplied: 0,
    fieldsSkippedAlreadySet: 0,
  };

  const librarySongs = await prisma.song.findMany({ where: { teamId } });
  const byTitle = new Map(librarySongs.map((s) => [s.title.trim().toLowerCase(), s]));

  for (const row of rows) {
    const song = byTitle.get(row.title.trim().toLowerCase());
    if (!song) {
      summary.titlesNotFound.push(row.title);
      continue;
    }
    summary.songsMatched++;

    if (row.themeCategories.length > 0) {
      const valid = row.themeCategories.filter((label) => VALID_THEME_LABELS.has(label)).slice(0, 5);
      if (valid.length > 0) {
        await prisma.$transaction([
          prisma.songThemeCategory.deleteMany({ where: { songId: song.id } }),
          prisma.songThemeCategory.createMany({ data: valid.map((label) => ({ songId: song.id, label })) }),
          prisma.song.update({ where: { id: song.id }, data: { themeCategory: valid[0] } }),
        ]);
        summary.themeCategoriesApplied += valid.length;
      }
    }

    for (const tag of row.tags) {
      await prisma.songTag.upsert({
        where: { songId_label: { songId: song.id, label: tag } },
        update: {},
        create: { songId: song.id, label: tag },
      });
      summary.tagsApplied++;
    }

    for (const reference of row.bibleVerses) {
      const existing = await prisma.bibleReference.findFirst({ where: { songId: song.id, reference } });
      if (!existing) {
        await prisma.bibleReference.create({ data: { songId: song.id, reference } });
        summary.bibleVersesApplied++;
      }
    }

    const fieldUpdates: Record<string, string> = {};
    if (row.biblicalConnection && !song.biblicalConnection) {
      fieldUpdates.biblicalConnection = row.biblicalConnection;
    } else if (row.biblicalConnection && song.biblicalConnection) {
      summary.fieldsSkippedAlreadySet++;
    }
    if (row.key && !song.key) {
      fieldUpdates.key = row.key;
    } else if (row.key && song.key) {
      summary.fieldsSkippedAlreadySet++;
    }
    if (row.timeSignature && !song.timeSignature) {
      fieldUpdates.timeSignature = row.timeSignature;
    }
    if (row.worshipType && VALID_WORSHIP_TYPES.has(row.worshipType) && !song.worshipType) {
      fieldUpdates.worshipType = row.worshipType;
    } else if (row.worshipType && song.worshipType) {
      summary.fieldsSkippedAlreadySet++;
    }
    if (Object.keys(fieldUpdates).length > 0 || (row.bpm && !song.bpm)) {
      await prisma.song.update({
        where: { id: song.id },
        data: { ...fieldUpdates, ...(row.bpm && !song.bpm ? { bpm: row.bpm } : {}) },
      });
    } else if (row.bpm && song.bpm) {
      summary.fieldsSkippedAlreadySet++;
    }
  }

  return summary;
}

export async function importSongMetadata(formData: FormData): Promise<ActionResultData<SongMetadataImportSummary>> {
  return runAction(async () => {
    const { team, membershipRole } = await requireUser();
    if (!isLeaderRole(membershipRole)) {
      return { ok: false, error: "Only a worship leader can bulk-import song metadata." };
    }

    const file = formData.get("file");
    if (!(file instanceof File)) return { ok: false, error: "No file was provided." };
    if (file.size > MAX_FILE_BYTES) return { ok: false, error: "File is too large (max 10MB)." };

    const buffer = Buffer.from(await file.arrayBuffer());
    const isCsv = file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";
    const rows = isCsv
      ? await parseSongMetadataCsvBuffer(buffer)
      : await parseSongMetadataWorkbookBuffer(buffer);

    if (rows.length === 0) {
      return {
        ok: false,
        error: "Couldn't find any rows with a Title column in that file.",
      };
    }

    let summary: SongMetadataImportSummary;
    try {
      summary = await applyRowsUnsafe(team.id, rows);
    } catch (err) {
      console.error("Song metadata import failed partway through:", err);
      return { ok: false, error: "Something went wrong partway through importing — please try again." };
    }

    revalidatePath("/songs");
    return { ok: true, data: summary };
  });
}
