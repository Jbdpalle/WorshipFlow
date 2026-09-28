"use server";

import { revalidatePath } from "next/cache";
import type { EventType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guard";

export async function createSet(input: {
  title: string;
  eventType?: EventType;
  theme?: string;
  keywords?: string;
  verses?: string[];
  serviceDate?: string;
  location?: string;
  church?: string;
  serviceType?: string;
  leaderName?: string;
}) {
  const { team } = await requireUser();

  const set = await prisma.worshipSet.create({
    data: {
      teamId: team.id,
      title: input.title,
      eventType: input.eventType || undefined,
      theme: input.theme || null,
      keywords: input.keywords || null,
      serviceDate: input.serviceDate ? new Date(input.serviceDate) : null,
      location: input.location || null,
      church: input.church || null,
      serviceType: input.serviceType || null,
      leaderName: input.leaderName || null,
      bibleRefs: {
        create: (input.verses ?? [])
          .filter((v) => v.trim().length > 0)
          .map((reference) => ({ reference })),
      },
    },
  });

  revalidatePath("/sets");
  revalidatePath("/dashboard");
  return set;
}

async function assertSetOwnership(setId: string, teamId: string) {
  const set = await prisma.worshipSet.findUnique({ where: { id: setId } });
  if (!set || set.teamId !== teamId) throw new Error("Worship set not found.");
  return set;
}

export async function updateSetNotes(setId: string, notes: string) {
  const { team } = await requireUser();
  await assertSetOwnership(setId, team.id);
  await prisma.worshipSet.update({ where: { id: setId }, data: { notes } });
  revalidatePath(`/sets/${setId}`);
}

export async function addSongToSet(setId: string, songId: string) {
  const { team } = await requireUser();
  await assertSetOwnership(setId, team.id);

  const song = await prisma.song.findUnique({ where: { id: songId } });
  if (!song || song.teamId !== team.id) throw new Error("Song not found.");

  const count = await prisma.setSong.count({ where: { setId } });
  await prisma.setSong.create({ data: { setId, songId, order: count } });
  revalidatePath(`/sets/${setId}`);
}

export async function removeSongFromSet(setSongId: string) {
  const { team } = await requireUser();
  const setSong = await prisma.setSong.findUnique({
    where: { id: setSongId },
    include: { set: true },
  });
  if (!setSong || setSong.set.teamId !== team.id) throw new Error("Not found.");

  await prisma.setSong.delete({ where: { id: setSongId } });

  const remaining = await prisma.setSong.findMany({
    where: { setId: setSong.setId },
    orderBy: { order: "asc" },
  });
  await Promise.all(
    remaining.map((s, i) =>
      prisma.setSong.update({ where: { id: s.id }, data: { order: i } }),
    ),
  );

  revalidatePath(`/sets/${setSong.setId}`);
}

export async function reorderSetSongs(setId: string, orderedSetSongIds: string[]) {
  const { team } = await requireUser();
  await assertSetOwnership(setId, team.id);

  await Promise.all(
    orderedSetSongIds.map((id, index) =>
      prisma.setSong.update({ where: { id }, data: { order: index } }),
    ),
  );

  revalidatePath(`/sets/${setId}`);
}

export async function updateSetSongDetails(
  setSongId: string,
  input: {
    purpose?: string;
    transitionNotes?: string;
    overrideKey?: string;
    overrideBpm?: number | null;
    capo?: number | null;
  },
) {
  const { team } = await requireUser();
  const setSong = await prisma.setSong.findUnique({
    where: { id: setSongId },
    include: { set: true },
  });
  if (!setSong || setSong.set.teamId !== team.id) throw new Error("Not found.");

  await prisma.setSong.update({ where: { id: setSongId }, data: input });
  revalidatePath(`/sets/${setSong.setId}`);
}

export async function assignMemberToSetSong(
  setSongId: string,
  teamMemberId: string,
  role: string,
) {
  const { team } = await requireUser();
  const setSong = await prisma.setSong.findUnique({
    where: { id: setSongId },
    include: { set: true },
  });
  if (!setSong || setSong.set.teamId !== team.id) throw new Error("Not found.");

  const existing = await prisma.songAssignment.findFirst({
    where: { setSongId, teamMemberId },
  });
  if (existing) {
    await prisma.songAssignment.update({ where: { id: existing.id }, data: { role } });
  } else {
    await prisma.songAssignment.create({ data: { setSongId, teamMemberId, role } });
  }

  revalidatePath(`/sets/${setSong.setId}`);
}

export async function removeAssignment(assignmentId: string) {
  const { team } = await requireUser();
  const assignment = await prisma.songAssignment.findUnique({
    where: { id: assignmentId },
    include: { setSong: { include: { set: true } } },
  });
  if (!assignment || assignment.setSong.set.teamId !== team.id) throw new Error("Not found.");

  await prisma.songAssignment.delete({ where: { id: assignmentId } });
  revalidatePath(`/sets/${assignment.setSong.set.id}`);
}
