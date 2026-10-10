"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guard";
import { runAction, type ActionResult } from "@/lib/actions/action-result";

export async function savePersonalNote(
  songId: string,
  content: string,
  sectionId?: string | null,
): Promise<ActionResult> {
  return runAction(async () => {
    const { user, team } = await requireUser();
    const song = await prisma.song.findUnique({ where: { id: songId } });
    if (!song || song.teamId !== team.id) return { ok: false, error: "Song not found." };
    if (sectionId) {
      const section = await prisma.songSection.findUnique({ where: { id: sectionId } });
      if (!section || section.songId !== songId) return { ok: false, error: "Section not found." };
    }

    // sectionId is part of this note's identity, same reasoning as
    // teamMemberId on SongRoleNote: a whole-song note (sectionId null) and
    // a note pinned to one section are different rows, not the same row
    // with changing content — a musician can have both at once.
    const existing = await prisma.personalNote.findFirst({
      where: { userId: user.id, songId, sectionId: sectionId ?? null },
    });

    if (!content.trim()) {
      if (existing) await prisma.personalNote.delete({ where: { id: existing.id } });
    } else if (existing) {
      await prisma.personalNote.update({ where: { id: existing.id }, data: { content } });
    } else {
      await prisma.personalNote.create({ data: { userId: user.id, songId, sectionId: sectionId ?? null, content } });
    }

    revalidatePath(`/songs/${songId}`);
    revalidatePath("/my-part");
    return { ok: true };
  });
}
