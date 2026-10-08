"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser, isLeaderRole } from "@/lib/auth/guard";
import { runAction, type ActionResult } from "@/lib/actions/action-result";
import { trackEvent } from "@/lib/usability/track";

async function findOwnedSet(setId: string, teamId: string) {
  const set = await prisma.worshipSet.findUnique({ where: { id: setId } });
  if (!set || set.teamId !== teamId) return { ok: false as const, error: "Worship set not found." };
  return { ok: true as const, set };
}

// Starting the Live Set claims the set's shared live-position fields for
// LIVE (same fields Practice Sessions use, just flagged differently — see
// WorshipSet.liveMode) and resets position to the top, same "no initial
// position" default Director Mode already uses. Any practice session that
// was still marked active loses its claim; it stays COMPLETED/whatever it
// was, it just stops owning the live position.
export async function startLiveSet(setId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { team, membershipRole } = await requireUser();
    if (!isLeaderRole(membershipRole)) {
      return { ok: false, error: "Only the worship leader can start the live set." };
    }
    const lookup = await findOwnedSet(setId, team.id);
    if (!lookup.ok) return lookup;

    await prisma.worshipSet.update({
      where: { id: setId },
      data: {
        liveMode: "LIVE",
        activePracticeSessionId: null,
        liveSetSongId: null,
        liveSectionId: null,
        liveUpdatedAt: new Date(),
        liveStartedAt: new Date(),
        liveEndedAt: null,
      },
    });
    trackEvent(team.id, "live_set_started", { entityId: setId });
    revalidatePath(`/sets/${setId}/live`);
    return { ok: true };
  });
}

export async function finishLiveSet(setId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { team, membershipRole } = await requireUser();
    if (!isLeaderRole(membershipRole)) {
      return { ok: false, error: "Only the worship leader can finish the live set." };
    }
    const lookup = await findOwnedSet(setId, team.id);
    if (!lookup.ok) return lookup;

    await prisma.worshipSet.update({
      where: { id: setId },
      data: { liveMode: "NONE", liveEndedAt: new Date() },
    });
    trackEvent(team.id, "live_set_finished", { entityId: setId });
    revalidatePath(`/sets/${setId}/live`);
    return { ok: true };
  });
}
