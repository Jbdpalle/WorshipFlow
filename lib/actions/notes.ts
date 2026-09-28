"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guard";

export async function savePersonalNote(songId: string, content: string) {
  const { user, team } = await requireUser();
  const song = await prisma.song.findUnique({ where: { id: songId } });
  if (!song || song.teamId !== team.id) throw new Error("Song not found.");

  const existing = await prisma.personalNote.findFirst({
    where: { userId: user.id, songId },
  });

  if (!content.trim()) {
    if (existing) await prisma.personalNote.delete({ where: { id: existing.id } });
  } else if (existing) {
    await prisma.personalNote.update({ where: { id: existing.id }, data: { content } });
  } else {
    await prisma.personalNote.create({ data: { userId: user.id, songId, content } });
  }

  revalidatePath(`/songs/${songId}`);
  revalidatePath("/my-part");
}
