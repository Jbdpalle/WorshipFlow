"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guard";

export async function startRehearsal(songId: string, setSongId: string | null, bpmUsed?: number) {
  const { team } = await requireUser();
  const song = await prisma.song.findUnique({ where: { id: songId } });
  if (!song || song.teamId !== team.id) throw new Error("Song not found.");

  const rehearsal = await prisma.rehearsal.create({
    data: { songId, setSongId, bpmUsed: bpmUsed ?? song.bpm },
  });
  revalidatePath(`/songs/${songId}`);
  return rehearsal;
}

export async function saveRehearsalNotes(rehearsalId: string, notes: string[]) {
  const { team } = await requireUser();
  const rehearsal = await prisma.rehearsal.findUnique({
    where: { id: rehearsalId },
    include: { song: true },
  });
  if (!rehearsal || rehearsal.song.teamId !== team.id) throw new Error("Not found.");

  await prisma.rehearsalNote.createMany({
    data: notes.filter((n) => n.trim()).map((content) => ({ rehearsalId, content })),
  });
  revalidatePath(`/songs/${rehearsal.songId}`);
  revalidatePath(`/rehearsal`);
}

export async function setRehearsalCheck(rehearsalId: string, status: string) {
  const { user, team } = await requireUser();
  const rehearsal = await prisma.rehearsal.findUnique({
    where: { id: rehearsalId },
    include: { song: true },
  });
  if (!rehearsal || rehearsal.song.teamId !== team.id) throw new Error("Not found.");

  await prisma.rehearsalCheck.create({
    data: { rehearsalId, userId: user.id, status },
  });
  revalidatePath(`/rehearsal`);
}

export async function recordChange(input: {
  songId: string;
  field: string;
  fromValue?: string;
  toValue?: string;
  reason?: string;
}) {
  const { user, team } = await requireUser();
  const song = await prisma.song.findUnique({ where: { id: input.songId } });
  if (!song || song.teamId !== team.id) throw new Error("Song not found.");

  await prisma.changeLog.create({
    data: {
      songId: input.songId,
      userId: user.id,
      field: input.field,
      fromValue: input.fromValue || null,
      toValue: input.toValue || null,
      reason: input.reason || null,
    },
  });
  revalidatePath(`/songs/${input.songId}`);
}
