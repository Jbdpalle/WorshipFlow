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

// ── Per-role transition directions ──────────────────────────────────
// Reuses SongRoleNote (see its schema comment) so a transition's per-role
// breakdown shares the exact same shape, visibility rules, and readers
// (selectRoleNoteForViewer) as every other direction — not a second,
// parallel direction system for transitions.

async function findOwnedTransition(transitionId: string, teamId: string) {
  const transition = await prisma.transition.findUnique({
    where: { id: transitionId },
    include: { set: true },
  });
  if (!transition || transition.set.teamId !== teamId) {
    return { ok: false as const, error: "Transition not found." };
  }
  return { ok: true as const, transition };
}

export async function upsertTransitionRoleNote(
  transitionId: string,
  role: string,
  content: string,
  setIdForRevalidate: string,
  options?: { teamMemberId?: string | null; visibility?: "TEAM" | "ROLE" | "PERSON" },
): Promise<ActionResult> {
  return runAction(async () => {
    const { team } = await requireUser();
    const lookup = await findOwnedTransition(transitionId, team.id);
    if (!lookup.ok) return lookup;

    const teamMemberId = options?.teamMemberId !== undefined ? options.teamMemberId : null;
    if (!content.trim()) {
      await prisma.songRoleNote.deleteMany({ where: { transitionId, role, teamMemberId } });
    } else if (teamMemberId) {
      await prisma.songRoleNote.upsert({
        where: { transitionId_role_teamMemberId: { transitionId, role, teamMemberId } },
        update: { content, ...(options?.visibility !== undefined ? { visibility: options.visibility } : {}) },
        create: { transitionId, role, content, teamMemberId, visibility: options?.visibility ?? "TEAM" },
      });
    } else {
      const existing = await prisma.songRoleNote.findFirst({ where: { transitionId, role, teamMemberId: null } });
      if (existing) {
        await prisma.songRoleNote.update({
          where: { id: existing.id },
          data: { content, ...(options?.visibility !== undefined ? { visibility: options.visibility } : {}) },
        });
      } else {
        await prisma.songRoleNote.create({
          data: { transitionId, role, content, teamMemberId: null, visibility: options?.visibility ?? "TEAM" },
        });
      }
    }

    revalidatePath(`/sets/${setIdForRevalidate}`);
    revalidatePath("/my-part");
    revalidatePath("/rehearsal");
    return { ok: true };
  });
}
