"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guard";
import { DEFAULT_SONG_STRUCTURE } from "@/lib/songs/constants";

async function assertSongOwnership(songId: string, teamId: string) {
  const song = await prisma.song.findUnique({ where: { id: songId } });
  if (!song || song.teamId !== teamId) throw new Error("Song not found.");
  return song;
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
}) {
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
  return song;
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
  }>,
) {
  const { team } = await requireUser();
  await assertSongOwnership(songId, team.id);
  await prisma.song.update({ where: { id: songId }, data: input });
  revalidatePath(`/songs/${songId}`);
  revalidatePath("/songs");
}

export async function deleteSong(songId: string) {
  const { team } = await requireUser();
  await assertSongOwnership(songId, team.id);
  await prisma.song.delete({ where: { id: songId } });
  revalidatePath("/songs");
}

export async function addSongTag(songId: string, label: string) {
  const { team } = await requireUser();
  await assertSongOwnership(songId, team.id);
  if (!label.trim()) return;
  await prisma.songTag.upsert({
    where: { songId_label: { songId, label } },
    update: {},
    create: { songId, label },
  });
  revalidatePath(`/songs/${songId}`);
}

export async function removeSongTag(tagId: string) {
  const { team } = await requireUser();
  const tag = await prisma.songTag.findUnique({ where: { id: tagId }, include: { song: true } });
  if (!tag || tag.song.teamId !== team.id) throw new Error("Not found.");
  await prisma.songTag.delete({ where: { id: tagId } });
  revalidatePath(`/songs/${tag.songId}`);
}

export async function addBibleReference(songId: string, reference: string, text?: string) {
  const { team } = await requireUser();
  await assertSongOwnership(songId, team.id);
  if (!reference.trim()) return;
  await prisma.bibleReference.create({ data: { songId, reference, text: text || null } });
  revalidatePath(`/songs/${songId}`);
}

// ── Arrangement (sections) ──────────────────────────────────────────

export async function addSection(songId: string, label: string) {
  const { team } = await requireUser();
  await assertSongOwnership(songId, team.id);
  const count = await prisma.songSection.count({ where: { songId } });
  await prisma.songSection.create({ data: { songId, label, order: count } });
  revalidatePath(`/songs/${songId}`);
}

export async function renameSection(sectionId: string, label: string) {
  const { team } = await requireUser();
  const section = await prisma.songSection.findUnique({
    where: { id: sectionId },
    include: { song: true },
  });
  if (!section || section.song.teamId !== team.id) throw new Error("Not found.");
  await prisma.songSection.update({ where: { id: sectionId }, data: { label } });
  revalidatePath(`/songs/${section.songId}`);
}

export async function updateSectionLyrics(sectionId: string, lyricsChords: string) {
  const { team } = await requireUser();
  const section = await prisma.songSection.findUnique({
    where: { id: sectionId },
    include: { song: true },
  });
  if (!section || section.song.teamId !== team.id) throw new Error("Not found.");
  await prisma.songSection.update({
    where: { id: sectionId },
    data: { lyricsChords: lyricsChords || null },
  });
  revalidatePath(`/songs/${section.songId}`);
}

export async function deleteSection(sectionId: string) {
  const { team } = await requireUser();
  const section = await prisma.songSection.findUnique({
    where: { id: sectionId },
    include: { song: true },
  });
  if (!section || section.song.teamId !== team.id) throw new Error("Not found.");
  await prisma.songSection.delete({ where: { id: sectionId } });

  const remaining = await prisma.songSection.findMany({
    where: { songId: section.songId },
    orderBy: { order: "asc" },
  });
  await Promise.all(
    remaining.map((s, i) => prisma.songSection.update({ where: { id: s.id }, data: { order: i } })),
  );

  revalidatePath(`/songs/${section.songId}`);
}

export async function reorderSections(songId: string, orderedSectionIds: string[]) {
  const { team } = await requireUser();
  await assertSongOwnership(songId, team.id);
  await Promise.all(
    orderedSectionIds.map((id, index) =>
      prisma.songSection.update({ where: { id }, data: { order: index } }),
    ),
  );
  revalidatePath(`/songs/${songId}`);
}

// ── Role notes ───────────────────────────────────────────────────────

export async function upsertRoleNote(
  sectionId: string,
  role: string,
  content: string,
  songIdForRevalidate: string,
) {
  const { team } = await requireUser();
  const section = await prisma.songSection.findUnique({
    where: { id: sectionId },
    include: { song: true },
  });
  if (!section || section.song.teamId !== team.id) throw new Error("Not found.");

  if (!content.trim()) {
    await prisma.songRoleNote.deleteMany({ where: { sectionId, role } });
  } else {
    await prisma.songRoleNote.upsert({
      where: { sectionId_role: { sectionId, role } },
      update: { content },
      create: { sectionId, role, content },
    });
  }

  revalidatePath(`/songs/${songIdForRevalidate}`);
  revalidatePath("/my-part");
  revalidatePath("/rehearsal");
}
