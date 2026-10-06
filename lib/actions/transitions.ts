"use server";

import { revalidatePath } from "next/cache";
import type { TransitionType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guard";
import { runAction, type ActionResult } from "@/lib/actions/action-result";
import { trackEvent } from "@/lib/usability/track";
import { advanceTourIfNeeded } from "@/lib/actions/demo-tour";

export async function upsertTransition(input: {
  setId: string;
  fromSetSongId: string;
  toSetSongId: string | null;
  type: TransitionType;
  direction: string;
}): Promise<ActionResult> {
  return runAction(async () => {
    const { user, team } = await requireUser();
    const fromSetSong = await prisma.setSong.findUnique({
      where: { id: input.fromSetSongId },
      include: { set: true },
    });
    if (!fromSetSong || fromSetSong.set.teamId !== team.id || fromSetSong.setId !== input.setId) {
      return { ok: false, error: "Song not found in this set." };
    }
    if (input.toSetSongId) {
      const toSetSong = await prisma.setSong.findUnique({ where: { id: input.toSetSongId } });
      if (!toSetSong || toSetSong.setId !== input.setId) {
        return { ok: false, error: "Target song not found in this set." };
      }
    }

    await prisma.transition.upsert({
      where: { fromSetSongId: input.fromSetSongId },
      update: { type: input.type, direction: input.direction || null, toSetSongId: input.toSetSongId },
      create: {
        setId: input.setId,
        fromSetSongId: input.fromSetSongId,
        toSetSongId: input.toSetSongId,
        type: input.type,
        direction: input.direction || null,
      },
    });

    revalidatePath(`/sets/${input.setId}`);
    trackEvent(team.id, "transition_created", { entityId: input.fromSetSongId, meta: { setId: input.setId } });
    await advanceTourIfNeeded(user.id, team.id, 8);
    return { ok: true };
  });
}

export async function deleteTransition(transitionId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { team } = await requireUser();
    const transition = await prisma.transition.findUnique({
      where: { id: transitionId },
      include: { set: true },
    });
    if (!transition || transition.set.teamId !== team.id) return { ok: false, error: "Not found." };

    await prisma.transition.delete({ where: { id: transitionId } });
    revalidatePath(`/sets/${transition.setId}`);
    return { ok: true };
  });
}
