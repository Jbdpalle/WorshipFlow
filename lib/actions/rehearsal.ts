"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser, isLeaderRole } from "@/lib/auth/guard";
import { runAction, type ActionResult, type ActionResultData } from "@/lib/actions/action-result";

export async function startRehearsal(
  songId: string,
  setSongId: string | null,
  bpmUsed?: number,
): Promise<ActionResultData<{ id: string }>> {
  return runAction(async () => {
    const { team } = await requireUser();
    const song = await prisma.song.findUnique({ where: { id: songId } });
    if (!song || song.teamId !== team.id) return { ok: false, error: "Song not found." };

    const rehearsal = await prisma.rehearsal.create({
      data: { songId, setSongId, bpmUsed: bpmUsed ?? song.bpm },
    });
    revalidatePath(`/songs/${songId}`);
    return { ok: true, data: { id: rehearsal.id } };
  });
}

export async function saveRehearsalNotes(rehearsalId: string, notes: string[]): Promise<ActionResult> {
  return runAction(async () => {
    const { team } = await requireUser();
    const rehearsal = await prisma.rehearsal.findUnique({
      where: { id: rehearsalId },
      include: { song: true },
    });
    if (!rehearsal || rehearsal.song.teamId !== team.id) return { ok: false, error: "Not found." };

    await prisma.rehearsalNote.createMany({
      data: notes.filter((n) => n.trim()).map((content) => ({ rehearsalId, content })),
    });
    revalidatePath(`/songs/${rehearsal.songId}`);
    revalidatePath(`/rehearsal`);
    return { ok: true };
  });
}

export async function setRehearsalCheck(rehearsalId: string, status: string): Promise<ActionResult> {
  return runAction(async () => {
    const { user, team } = await requireUser();
    const rehearsal = await prisma.rehearsal.findUnique({
      where: { id: rehearsalId },
      include: { song: true },
    });
    if (!rehearsal || rehearsal.song.teamId !== team.id) return { ok: false, error: "Not found." };

    await prisma.rehearsalCheck.create({
      data: { rehearsalId, userId: user.id, status },
    });
    revalidatePath(`/rehearsal`);
    return { ok: true };
  });
}

// ── Rehearsal experiments (propose → keep/discard) ──────────────────
// A PROPOSED change never touches the live SongRoleNote — only "Keep"
// does. This lets a rehearsal try things without corrupting the
// finalized arrangement, per WORSHIPFLOW_SONG_FLOW_AUDIT.md section 3.

export async function proposeArrangementChange(input: {
  sectionId: string;
  role: string;
  proposedContent: string;
  rehearsalId?: string;
}): Promise<ActionResultData<{ id: string }>> {
  return runAction(async () => {
    const { user, team } = await requireUser();
    const section = await prisma.songSection.findUnique({
      where: { id: input.sectionId },
      include: { song: true, roleNotes: true },
    });
    if (!section || section.song.teamId !== team.id) return { ok: false, error: "Section not found." };
    if (!input.proposedContent.trim()) return { ok: false, error: "Enter what you want to try." };

    const existing = section.roleNotes.find((n) => n.role === input.role);
    const change = await prisma.arrangementChange.create({
      data: {
        songId: section.songId,
        sectionId: input.sectionId,
        role: input.role,
        proposedContent: input.proposedContent.trim(),
        previousContent: existing?.content ?? null,
        rehearsalId: input.rehearsalId || null,
        createdByUserId: user.id,
      },
    });
    revalidatePath(`/rehearsal`);
    return { ok: true, data: { id: change.id } };
  });
}

export async function keepArrangementChange(changeId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { team, membershipRole } = await requireUser();
    if (!isLeaderRole(membershipRole)) return { ok: false, error: "Only the worship leader can keep a change." };
    const change = await prisma.arrangementChange.findUnique({
      where: { id: changeId },
      include: { song: true },
    });
    if (!change || change.song.teamId !== team.id) return { ok: false, error: "Not found." };
    if (change.status !== "PROPOSED") return { ok: false, error: "Already resolved." };

    await prisma.$transaction([
      prisma.songRoleNote.upsert({
        where: { sectionId_role: { sectionId: change.sectionId, role: change.role } },
        update: { content: change.proposedContent },
        create: { sectionId: change.sectionId, role: change.role, content: change.proposedContent },
      }),
      prisma.arrangementChange.update({
        where: { id: changeId },
        data: { status: "KEPT", resolvedAt: new Date() },
      }),
      prisma.changeLog.create({
        data: {
          songId: change.songId,
          field: `${change.role} — arrangement`,
          fromValue: change.previousContent,
          toValue: change.proposedContent,
          reason: "Kept from a rehearsal experiment",
        },
      }),
    ]);

    revalidatePath(`/songs/${change.songId}`);
    revalidatePath(`/rehearsal`);
    revalidatePath(`/my-part`);
    return { ok: true };
  });
}

export async function discardArrangementChange(changeId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { team, membershipRole } = await requireUser();
    if (!isLeaderRole(membershipRole)) return { ok: false, error: "Only the worship leader can discard a change." };
    const change = await prisma.arrangementChange.findUnique({
      where: { id: changeId },
      include: { song: true },
    });
    if (!change || change.song.teamId !== team.id) return { ok: false, error: "Not found." };
    if (change.status !== "PROPOSED") return { ok: false, error: "Already resolved." };

    await prisma.arrangementChange.update({
      where: { id: changeId },
      data: { status: "DISCARDED", resolvedAt: new Date() },
    });
    revalidatePath(`/rehearsal`);
    return { ok: true };
  });
}

// ── Live rehearsal position (polling-based sync, see audit section 5) ──

export async function setLivePosition(
  setId: string,
  setSongId: string,
  sectionId: string | null,
): Promise<ActionResult> {
  return runAction(async () => {
    const { team, membershipRole } = await requireUser();
    if (!isLeaderRole(membershipRole)) return { ok: false, error: "Only the worship leader can direct rehearsal." };
    const set = await prisma.worshipSet.findUnique({ where: { id: setId } });
    if (!set || set.teamId !== team.id) return { ok: false, error: "Not found." };

    await prisma.worshipSet.update({
      where: { id: setId },
      data: { liveSetSongId: setSongId, liveSectionId: sectionId, liveUpdatedAt: new Date() },
    });
    return { ok: true };
  });
}

export type LivePosition = {
  setSongId: string | null;
  sectionId: string | null;
  updatedAt: string | null;
};

export async function getLivePosition(setId: string): Promise<ActionResultData<LivePosition>> {
  return runAction(async () => {
    const { team } = await requireUser();
    const set = await prisma.worshipSet.findUnique({
      where: { id: setId },
      select: { teamId: true, liveSetSongId: true, liveSectionId: true, liveUpdatedAt: true },
    });
    if (!set || set.teamId !== team.id) return { ok: false, error: "Not found." };

    return {
      ok: true,
      data: {
        setSongId: set.liveSetSongId,
        sectionId: set.liveSectionId,
        updatedAt: set.liveUpdatedAt?.toISOString() ?? null,
      },
    };
  });
}

export async function recordChange(input: {
  songId: string;
  field: string;
  fromValue?: string;
  toValue?: string;
  reason?: string;
}): Promise<ActionResult> {
  return runAction(async () => {
    const { user, team } = await requireUser();
    const song = await prisma.song.findUnique({ where: { id: input.songId } });
    if (!song || song.teamId !== team.id) return { ok: false, error: "Song not found." };

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
    return { ok: true };
  });
}
