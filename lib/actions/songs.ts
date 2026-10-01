"use server";

import { revalidatePath } from "next/cache";
import type { Song, SongSection } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guard";
import { DEFAULT_SONG_STRUCTURE } from "@/lib/songs/constants";
import { runAction, type ActionResult, type ActionResultData } from "@/lib/actions/action-result";

type SongLookup = { ok: true; song: Song } | { ok: false; error: string };
type SectionLookup = { ok: true; section: SongSection & { songId: string } } | { ok: false; error: string };

async function findOwnedSong(songId: string, teamId: string): Promise<SongLookup> {
  const song = await prisma.song.findUnique({ where: { id: songId } });
  if (!song || song.teamId !== teamId) return { ok: false, error: "Song not found." };
  return { ok: true, song };
}

async function findOwnedSection(sectionId: string, teamId: string): Promise<SectionLookup> {
  const section = await prisma.songSection.findUnique({
    where: { id: sectionId },
    include: { song: true },
  });
  if (!section || section.song.teamId !== teamId) return { ok: false, error: "Not found." };
  return { ok: true, section };
}

export async function createSong(input: {
  title: string;
  artist?: string;
  key?: string;
  bpm?: number;
  energy?: string;
  themeCategory?: string;
  biblicalConnection?: string;
  tags?: string[];
}): Promise<ActionResultData<{ id: string }>> {
  return runAction(async () => {
    const { team } = await requireUser();

    const song = await prisma.song.create({
      data: {
        teamId: team.id,
        title: input.title,
        artist: input.artist || null,
        key: input.key || null,
        bpm: input.bpm || null,
        energy: input.energy || null,
        themeCategory: input.themeCategory || null,
        biblicalConnection: input.biblicalConnection || null,
        tags: { create: (input.tags ?? []).map((label) => ({ label })) },
        sections: {
          create: DEFAULT_SONG_STRUCTURE.map((label, order) => ({ label, order })),
        },
      },
    });

    revalidatePath("/songs");
    return { ok: true, data: { id: song.id } };
  });
}

export async function updateSong(
  songId: string,
  input: Partial<{
    title: string;
    artist: string;
    key: string;
    bpm: number | null;
    timeSignature: string;
    durationSeconds: number | null;
    energy: string;
    themeCategory: string;
    biblicalConnection: string;
    lyricsSummary: string;
    notes: string;
    visionNote: string;
  }>,
): Promise<ActionResult> {
  return runAction(async () => {
    const { team } = await requireUser();
    const lookup = await findOwnedSong(songId, team.id);
    if (!lookup.ok) return lookup;
    await prisma.song.update({ where: { id: songId }, data: input });
    revalidatePath(`/songs/${songId}`);
    revalidatePath("/songs");
    return { ok: true };
  });
}

export async function deleteSong(songId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { team } = await requireUser();
    const lookup = await findOwnedSong(songId, team.id);
    if (!lookup.ok) return lookup;
    await prisma.song.delete({ where: { id: songId } });
    revalidatePath("/songs");
    return { ok: true };
  });
}

export async function addSongTag(songId: string, label: string): Promise<ActionResult> {
  return runAction(async () => {
    const { team } = await requireUser();
    const lookup = await findOwnedSong(songId, team.id);
    if (!lookup.ok) return lookup;
    if (!label.trim()) return { ok: true };
    await prisma.songTag.upsert({
      where: { songId_label: { songId, label } },
      update: {},
      create: { songId, label },
    });
    revalidatePath(`/songs/${songId}`);
    return { ok: true };
  });
}

export async function removeSongTag(tagId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { team } = await requireUser();
    const tag = await prisma.songTag.findUnique({ where: { id: tagId }, include: { song: true } });
    if (!tag || tag.song.teamId !== team.id) return { ok: false, error: "Not found." };
    await prisma.songTag.delete({ where: { id: tagId } });
    revalidatePath(`/songs/${tag.songId}`);
    return { ok: true };
  });
}

export async function addBibleReference(songId: string, reference: string, text?: string): Promise<ActionResult> {
  return runAction(async () => {
    const { team } = await requireUser();
    const lookup = await findOwnedSong(songId, team.id);
    if (!lookup.ok) return lookup;
    if (!reference.trim()) return { ok: true };
    await prisma.bibleReference.create({ data: { songId, reference, text: text || null } });
    revalidatePath(`/songs/${songId}`);
    return { ok: true };
  });
}

// ── Arrangement (sections) ──────────────────────────────────────────

export async function addSection(songId: string, label: string): Promise<ActionResult> {
  return runAction(async () => {
    const { team } = await requireUser();
    const lookup = await findOwnedSong(songId, team.id);
    if (!lookup.ok) return lookup;
    const count = await prisma.songSection.count({ where: { songId } });
    await prisma.songSection.create({ data: { songId, label, order: count } });
    revalidatePath(`/songs/${songId}`);
    return { ok: true };
  });
}

export async function renameSection(sectionId: string, label: string): Promise<ActionResult> {
  return runAction(async () => {
    const { team } = await requireUser();
    const lookup = await findOwnedSection(sectionId, team.id);
    if (!lookup.ok) return lookup;
    await prisma.songSection.update({ where: { id: sectionId }, data: { label } });
    revalidatePath(`/songs/${lookup.section.songId}`);
    return { ok: true };
  });
}

export async function updateSectionLyrics(sectionId: string, lyricsChords: string): Promise<ActionResult> {
  return runAction(async () => {
    const { team } = await requireUser();
    const lookup = await findOwnedSection(sectionId, team.id);
    if (!lookup.ok) return lookup;
    await prisma.songSection.update({
      where: { id: sectionId },
      data: { lyricsChords: lyricsChords || null },
    });
    revalidatePath(`/songs/${lookup.section.songId}`);
    return { ok: true };
  });
}

export async function updateSectionRepeatCount(
  sectionId: string,
  repeatCount: number | null,
): Promise<ActionResult> {
  return runAction(async () => {
    const { team } = await requireUser();
    const lookup = await findOwnedSection(sectionId, team.id);
    if (!lookup.ok) return lookup;
    await prisma.songSection.update({
      where: { id: sectionId },
      data: { repeatCount: repeatCount && repeatCount > 1 ? repeatCount : null },
    });
    revalidatePath(`/songs/${lookup.section.songId}`);
    return { ok: true };
  });
}

export async function duplicateSection(sectionId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { team } = await requireUser();
    const lookup = await findOwnedSection(sectionId, team.id);
    if (!lookup.ok) return lookup;

    const [original, roleNotes, siblingCount] = await Promise.all([
      prisma.songSection.findUniqueOrThrow({ where: { id: sectionId } }),
      prisma.songRoleNote.findMany({ where: { sectionId } }),
      prisma.songSection.count({ where: { songId: lookup.section.songId } }),
    ]);

    const copy = await prisma.songSection.create({
      data: {
        songId: lookup.section.songId,
        label: original.label,
        order: siblingCount,
        barCount: original.barCount,
        repeatCount: original.repeatCount,
        lyricsChords: original.lyricsChords,
      },
    });
    if (roleNotes.length > 0) {
      await prisma.songRoleNote.createMany({
        data: roleNotes.map((n) => ({
          sectionId: copy.id,
          role: n.role,
          content: n.content,
          teamMemberId: n.teamMemberId,
          visibility: n.visibility,
        })),
      });
    }

    revalidatePath(`/songs/${lookup.section.songId}`);
    return { ok: true };
  });
}

export async function deleteSection(sectionId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { team } = await requireUser();
    const lookup = await findOwnedSection(sectionId, team.id);
    if (!lookup.ok) return lookup;
    await prisma.songSection.delete({ where: { id: sectionId } });

    const remaining = await prisma.songSection.findMany({
      where: { songId: lookup.section.songId },
      orderBy: { order: "asc" },
    });
    await Promise.all(
      remaining.map((s, i) => prisma.songSection.update({ where: { id: s.id }, data: { order: i } })),
    );

    revalidatePath(`/songs/${lookup.section.songId}`);
    return { ok: true };
  });
}

export async function reorderSections(songId: string, orderedSectionIds: string[]): Promise<ActionResult> {
  return runAction(async () => {
    const { team } = await requireUser();
    const lookup = await findOwnedSong(songId, team.id);
    if (!lookup.ok) return lookup;
    await Promise.all(
      orderedSectionIds.map((id, index) =>
        prisma.songSection.update({ where: { id }, data: { order: index } }),
      ),
    );
    revalidatePath(`/songs/${songId}`);
    return { ok: true };
  });
}

// ── Role notes ───────────────────────────────────────────────────────

export async function upsertRoleNote(
  sectionId: string,
  role: string,
  content: string,
  songIdForRevalidate: string,
  options?: { teamMemberId?: string | null; visibility?: "TEAM" | "ROLE" | "PERSON" },
): Promise<ActionResult> {
  return runAction(async () => {
    const { team } = await requireUser();
    const lookup = await findOwnedSection(sectionId, team.id);
    if (!lookup.ok) return lookup;

    if (!content.trim()) {
      await prisma.songRoleNote.deleteMany({ where: { sectionId, role } });
    } else {
      const extra = {
        ...(options?.teamMemberId !== undefined ? { teamMemberId: options.teamMemberId } : {}),
        ...(options?.visibility !== undefined ? { visibility: options.visibility } : {}),
      };
      await prisma.songRoleNote.upsert({
        where: { sectionId_role: { sectionId, role } },
        update: { content, ...extra },
        create: { sectionId, role, content, ...extra },
      });
    }

    revalidatePath(`/songs/${songIdForRevalidate}`);
    revalidatePath("/my-part");
    revalidatePath("/rehearsal");
    return { ok: true };
  });
}
