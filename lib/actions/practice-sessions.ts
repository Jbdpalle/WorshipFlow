"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser, isLeaderRole } from "@/lib/auth/guard";
import { runAction, type ActionResult, type ActionResultData } from "@/lib/actions/action-result";
import { trackEvent } from "@/lib/usability/track";

async function findOwnedSet(setId: string, teamId: string) {
  const set = await prisma.worshipSet.findUnique({ where: { id: setId } });
  if (!set || set.teamId !== teamId) return { ok: false as const, error: "Worship set not found." };
  return { ok: true as const, set };
}

async function findOwnedSession(sessionId: string, teamId: string) {
  const session = await prisma.practiceSession.findUnique({ where: { id: sessionId }, include: { set: true } });
  if (!session || session.set.teamId !== teamId) return { ok: false as const, error: "Practice session not found." };
  return { ok: true as const, session };
}

export async function createPracticeSession(
  setId: string,
  input: { name: string; scheduledAt?: string; notes?: string },
): Promise<ActionResultData<{ id: string }>> {
  return runAction(async () => {
    const { team, membershipRole } = await requireUser();
    if (!isLeaderRole(membershipRole)) {
      return { ok: false, error: "Only the worship leader can add a practice session." };
    }
    const lookup = await findOwnedSet(setId, team.id);
    if (!lookup.ok) return lookup;

    const name = input.name.trim();
    if (!name) return { ok: false, error: "Give this practice session a name." };

    const session = await prisma.practiceSession.create({
      data: {
        setId,
        name,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        notes: input.notes?.trim() || null,
      },
    });
    trackEvent(team.id, "practice_session_created", { entityId: session.id, meta: { setId } });
    revalidatePath(`/sets/${setId}/practice`);
    return { ok: true, data: { id: session.id } };
  });
}

export async function updatePracticeSessionNotes(sessionId: string, notes: string): Promise<ActionResult> {
  return runAction(async () => {
    const { team, membershipRole } = await requireUser();
    if (!isLeaderRole(membershipRole)) {
      return { ok: false, error: "Only the worship leader can edit practice notes." };
    }
    const lookup = await findOwnedSession(sessionId, team.id);
    if (!lookup.ok) return lookup;

    await prisma.practiceSession.update({ where: { id: sessionId }, data: { notes: notes.trim() || null } });
    revalidatePath(`/sets/${lookup.session.setId}/practice/${sessionId}`);
    return { ok: true };
  });
}

// Starting a session claims the set's shared live-position fields for
// PRACTICE. Resuming the same already-active session (e.g. a page reload
// mid-practice) leaves the current song/section alone; starting a
// different session resets position to the top, same as the existing
// Director Mode's own "no initial position" default.
export async function startPracticeSession(sessionId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { team, membershipRole } = await requireUser();
    if (!isLeaderRole(membershipRole)) {
      return { ok: false, error: "Only the worship leader can start a practice session." };
    }
    const lookup = await findOwnedSession(sessionId, team.id);
    if (!lookup.ok) return lookup;
    const { session } = lookup;
    if (session.status === "COMPLETED") {
      return { ok: false, error: "This practice session is already finished." };
    }

    const resuming = session.set.activePracticeSessionId === sessionId && session.set.liveMode === "PRACTICE";

    await prisma.$transaction([
      prisma.practiceSession.update({
        where: { id: sessionId },
        data: { status: "IN_PROGRESS", startedAt: session.startedAt ?? new Date() },
      }),
      prisma.worshipSet.update({
        where: { id: session.setId },
        data: resuming
          ? { liveMode: "PRACTICE", activePracticeSessionId: sessionId }
          : {
              liveMode: "PRACTICE",
              activePracticeSessionId: sessionId,
              liveSetSongId: null,
              liveSectionId: null,
              liveUpdatedAt: new Date(),
            },
      }),
    ]);

    trackEvent(team.id, "practice_session_started", { entityId: sessionId });
    revalidatePath(`/sets/${session.setId}/practice`);
    revalidatePath(`/sets/${session.setId}/practice/${sessionId}`);
    return { ok: true };
  });
}

export type PracticeSessionSummary = {
  durationMinutes: number | null;
  songsPracticed: number;
  sectionsCovered: number;
};

export async function finishPracticeSession(
  sessionId: string,
): Promise<ActionResultData<PracticeSessionSummary>> {
  return runAction(async () => {
    const { team, membershipRole } = await requireUser();
    if (!isLeaderRole(membershipRole)) {
      return { ok: false, error: "Only the worship leader can finish a practice session." };
    }
    const lookup = await findOwnedSession(sessionId, team.id);
    if (!lookup.ok) return lookup;
    const { session } = lookup;

    const finishedAt = new Date();
    const rehearsals = await prisma.rehearsal.findMany({
      where: { practiceSessionId: sessionId },
      select: { songId: true, sectionsVisited: true },
    });
    const songsPracticed = new Set(rehearsals.map((r) => r.songId)).size;
    const sectionsCovered = new Set(rehearsals.flatMap((r) => r.sectionsVisited)).size;
    const durationMinutes = session.startedAt
      ? Math.max(1, Math.round((finishedAt.getTime() - session.startedAt.getTime()) / 60000))
      : null;

    await prisma.$transaction([
      prisma.practiceSession.update({
        where: { id: sessionId },
        data: { status: "COMPLETED", finishedAt },
      }),
      // Only clear the set's live claim if this session is still the one
      // holding it — never clobber a different session or a Live Set run
      // that started in the meantime.
      prisma.worshipSet.updateMany({
        where: { id: session.setId, activePracticeSessionId: sessionId },
        data: { liveMode: "NONE", activePracticeSessionId: null },
      }),
    ]);

    trackEvent(team.id, "practice_session_finished", { entityId: sessionId });
    revalidatePath(`/sets/${session.setId}/practice`);
    revalidatePath(`/sets/${session.setId}/practice/${sessionId}`);
    return { ok: true, data: { durationMinutes, songsPracticed, sectionsCovered } };
  });
}
