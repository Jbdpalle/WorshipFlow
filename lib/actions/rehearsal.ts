"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser, isLeaderRole } from "@/lib/auth/guard";
import { runAction, type ActionResult, type ActionResultData } from "@/lib/actions/action-result";
import { trackEvent } from "@/lib/usability/track";
import { advanceTourIfNeeded } from "@/lib/actions/demo-tour";
import {
  isRehearsalNoteCategory,
  REHEARSAL_NOTE_MAX_LENGTH,
  canConvertNote,
} from "@/lib/songs/rehearsal-notes";

export async function startRehearsal(
  songId: string,
  setSongId: string | null,
  bpmUsed?: number,
  practiceSessionId?: string | null,
): Promise<ActionResultData<{ id: string }>> {
  return runAction(async () => {
    const { user, team } = await requireUser();
    const song = await prisma.song.findUnique({ where: { id: songId } });
    if (!song || song.teamId !== team.id) return { ok: false, error: "Song not found." };

    if (setSongId) {
      const setSong = await prisma.setSong.findUnique({ where: { id: setSongId }, include: { set: { select: { teamId: true } } } });
      if (!setSong || setSong.set.teamId !== team.id || setSong.songId !== songId) {
        return { ok: false, error: "Song not found in this set." };
      }
    }

    if (practiceSessionId) {
      const session = await prisma.practiceSession.findUnique({
        where: { id: practiceSessionId },
        include: { set: { select: { teamId: true } } },
      });
      if (!session || session.set.teamId !== team.id) return { ok: false, error: "Practice session not found." };
    }

    // Reopening a song (switching back to it, or reloading the page) inside
    // one practice session continues that song's Rehearsal row instead of
    // stacking a new empty one per visit — notes and checks stay together.
    if (practiceSessionId && setSongId) {
      const existing = await prisma.rehearsal.findFirst({
        where: { practiceSessionId, setSongId },
        orderBy: { occurredAt: "asc" },
      });
      if (existing) return { ok: true, data: { id: existing.id } };
    }

    // Outside a practice session (Director Mode, Live Set) every musician's
    // phone opens the song too — share one recent row instead of creating
    // one per device per visit.
    if (!practiceSessionId && setSongId) {
      const recent = await prisma.rehearsal.findFirst({
        where: { setSongId, practiceSessionId: null, occurredAt: { gt: new Date(Date.now() - 6 * 60 * 60 * 1000) } },
        orderBy: { occurredAt: "desc" },
      });
      if (recent) return { ok: true, data: { id: recent.id } };
    }

    const rehearsal = await prisma.rehearsal.create({
      data: { songId, setSongId, bpmUsed: bpmUsed ?? song.bpm, practiceSessionId: practiceSessionId || null },
    });
    revalidatePath(`/songs/${songId}`);
    trackEvent(team.id, "rehearsal_started", { entityId: rehearsal.id, meta: { songId } });
    await advanceTourIfNeeded(user.id, team.id, 9);
    return { ok: true, data: { id: rehearsal.id } };
  });
}

// Tracks which sections actually got visited during a practice session's
// per-song Rehearsal row, for an accurate "sections covered" count on the
// Finish Practice summary — append-only, deduped, cheap enough to call on
// every section move the leader makes.
export async function recordSectionVisit(rehearsalId: string, sectionId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { team } = await requireUser();
    const rehearsal = await prisma.rehearsal.findUnique({
      where: { id: rehearsalId },
      include: { song: true },
    });
    if (!rehearsal || rehearsal.song.teamId !== team.id) return { ok: false, error: "Not found." };
    if (rehearsal.sectionsVisited.includes(sectionId)) return { ok: true };

    await prisma.rehearsal.update({
      where: { id: rehearsalId },
      data: { sectionsVisited: { push: sectionId } },
    });
    return { ok: true };
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

    if (input.rehearsalId) {
      const rehearsal = await prisma.rehearsal.findUnique({ where: { id: input.rehearsalId }, include: { song: true } });
      if (!rehearsal || rehearsal.song.teamId !== team.id) return { ok: false, error: "Not found." };
    }

    const existing = section.roleNotes.find((n) => n.role === input.role && n.teamMemberId === null);
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


type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

// The single way a rehearsal outcome becomes canonical arrangement: write
// the shared (teamMemberId: null) SongRoleNote for one role in one section
// and journal it in ChangeLog. Postgres can't treat NULL as a unique lookup
// key, which is why upsertRoleNote can't use a plain compound-unique upsert
// for that case — this finds-then-updates-or-creates inside the caller's
// transaction instead.
async function applySharedRoleNote(
  tx: Tx,
  input: { songId: string; sectionId: string; role: string; content: string; previousContent: string | null; reason: string },
) {
  const existing = await tx.songRoleNote.findFirst({
    where: { sectionId: input.sectionId, role: input.role, teamMemberId: null },
  });
  if (existing) {
    await tx.songRoleNote.update({ where: { id: existing.id }, data: { content: input.content } });
  } else {
    await tx.songRoleNote.create({ data: { sectionId: input.sectionId, role: input.role, content: input.content } });
  }
  await tx.changeLog.create({
    data: {
      songId: input.songId,
      field: `${input.role} — arrangement`,
      fromValue: input.previousContent,
      toValue: input.content,
      reason: input.reason,
    },
  });
}

export async function keepArrangementChange(changeId: string, opts?: { force?: boolean }): Promise<ActionResult> {
  return runAction(async () => {
    const { team, membershipRole } = await requireUser();
    if (!isLeaderRole(membershipRole)) return { ok: false, error: "Only the worship leader can keep a change." };
    const change = await prisma.arrangementChange.findUnique({
      where: { id: changeId },
      include: { song: true },
    });
    if (!change || change.song.teamId !== team.id) return { ok: false, error: "Not found." };
    if (change.status !== "PROPOSED") return { ok: false, error: "Already resolved." };

    // The experiment was proposed against whatever the direction said then.
    // If someone has edited that direction since, keeping it would silently
    // overwrite their newer wording — refuse unless the leader confirms.
    if (!opts?.force) {
      const current = await prisma.songRoleNote.findFirst({
        where: { sectionId: change.sectionId, role: change.role, teamMemberId: null },
        select: { content: true },
      });
      if ((current?.content ?? null) !== change.previousContent) {
        return {
          ok: false,
          error: "This direction was edited after the experiment was proposed. Review the current wording, then keep it anyway to overwrite.",
        };
      }
    }

    await prisma.$transaction(async (tx) => {
      await applySharedRoleNote(tx, {
        songId: change.songId,
        sectionId: change.sectionId,
        role: change.role,
        content: change.proposedContent,
        previousContent: change.previousContent,
        reason: "Kept from a rehearsal experiment",
      });
      await tx.arrangementChange.update({
        where: { id: changeId },
        data: { status: "KEPT", resolvedAt: new Date() },
      });
    });

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

// ── Quick rehearsal observations → triage → agreed change ───────────
// capture is open to any signed-in team member (same as the existing
// notes/experiments); deciding what an observation becomes is leader-only.

export type RehearsalNoteRow = {
  id: string;
  content: string;
  category: string | null;
  status: "OPEN" | "KEPT" | "DISCARDED" | "CONVERTED";
  songId: string;
  songTitle: string;
  sectionId: string | null;
  sectionLabel: string | null;
  createdAt: string;
};

export async function captureRehearsalNote(input: {
  rehearsalId: string;
  content: string;
  category?: string | null;
  sectionId?: string | null;
}): Promise<ActionResultData<{ id: string }>> {
  return runAction(async () => {
    const { team } = await requireUser();
    const content = input.content.trim();
    if (!content) return { ok: false, error: "Type a short note first." };
    if (content.length > REHEARSAL_NOTE_MAX_LENGTH) {
      return { ok: false, error: `Keep notes under ${REHEARSAL_NOTE_MAX_LENGTH} characters.` };
    }
    if (input.category && !isRehearsalNoteCategory(input.category)) return { ok: false, error: "Unknown note type." };

    const rehearsal = await prisma.rehearsal.findUnique({
      where: { id: input.rehearsalId },
      include: { song: true },
    });
    if (!rehearsal || rehearsal.song.teamId !== team.id) return { ok: false, error: "Not found." };

    if (input.sectionId) {
      const section = await prisma.songSection.findUnique({ where: { id: input.sectionId } });
      if (!section || section.songId !== rehearsal.songId) return { ok: false, error: "Section not found." };
    }

    const note = await prisma.rehearsalNote.create({
      data: {
        rehearsalId: rehearsal.id,
        content,
        category: input.category || null,
        sectionId: input.sectionId || null,
      },
    });
    return { ok: true, data: { id: note.id } };
  });
}

// Every note for the set that still needs a decision — across all of its
// practice sessions and the plain per-song rehearsals, so a note captured
// in an earlier session is not lost when the next one starts.
export async function getRehearsalNotesForSet(
  setId: string,
  opts?: { status?: "OPEN" | "ALL" },
): Promise<ActionResultData<RehearsalNoteRow[]>> {
  return runAction(async () => {
    const { team } = await requireUser();
    const set = await prisma.worshipSet.findUnique({ where: { id: setId }, select: { teamId: true } });
    if (!set || set.teamId !== team.id) return { ok: false, error: "Not found." };

    const rows = await prisma.rehearsalNote.findMany({
      where: {
        rehearsal: { setSong: { setId } },
        ...(opts?.status === "ALL" ? {} : { status: "OPEN" }),
      },
      orderBy: { createdAt: "asc" },
      include: { rehearsal: { include: { song: { select: { id: true, title: true } } } }, section: { select: { label: true } } },
    });
    return {
      ok: true,
      data: rows.map((n) => ({
        id: n.id,
        content: n.content,
        category: n.category,
        status: n.status,
        songId: n.rehearsal.song.id,
        songTitle: n.rehearsal.song.title,
        sectionId: n.sectionId,
        sectionLabel: n.section?.label ?? null,
        createdAt: n.createdAt.toISOString(),
      })),
    };
  });
}

async function findOwnedNote(noteId: string, teamId: string) {
  const note = await prisma.rehearsalNote.findUnique({
    where: { id: noteId },
    include: { rehearsal: { include: { song: true } } },
  });
  if (!note || note.rehearsal.song.teamId !== teamId) return null;
  return note;
}

// KEPT leaves the note as ordinary rehearsal history; DISCARDED hides it
// from the review list. Neither touches the arrangement. updateMany with
// status OPEN makes a double-tap (or two leaders) resolve it only once.
export async function resolveRehearsalNote(noteId: string, decision: "KEPT" | "DISCARDED"): Promise<ActionResult> {
  return runAction(async () => {
    const { team, membershipRole } = await requireUser();
    if (!isLeaderRole(membershipRole)) return { ok: false, error: "Only the worship leader can review rehearsal notes." };
    if (decision !== "KEPT" && decision !== "DISCARDED") return { ok: false, error: "Unknown decision." };
    const note = await findOwnedNote(noteId, team.id);
    if (!note) return { ok: false, error: "Not found." };

    const result = await prisma.rehearsalNote.updateMany({
      where: { id: noteId, status: "OPEN" },
      data: { status: decision, resolvedAt: new Date() },
    });
    if (result.count === 0) return { ok: false, error: "Already reviewed." };
    revalidatePath(`/songs/${note.rehearsal.songId}`);
    return { ok: true };
  });
}

// Turns an observation into an agreed arrangement change: writes the shared
// direction for `role` in the note's section (same path as Keep Change),
// journals it in ChangeLog, and marks the note CONVERTED — all or nothing.
export async function convertRehearsalNoteToChange(
  noteId: string,
  input: { role: string; content?: string },
): Promise<ActionResult> {
  return runAction(async () => {
    const { team, membershipRole } = await requireUser();
    if (!isLeaderRole(membershipRole)) return { ok: false, error: "Only the worship leader can change the arrangement." };
    const note = await findOwnedNote(noteId, team.id);
    if (!note) return { ok: false, error: "Not found." };
    if (!canConvertNote({ sectionId: note.sectionId, category: note.category, status: note.status })) {
      return { ok: false, error: note.status !== "OPEN" ? "Already reviewed." : "Attach this note to a section to apply it." };
    }
    const role = input.role.trim();
    const content = (input.content ?? note.content).trim();
    if (!role) return { ok: false, error: "Choose who this direction is for." };
    if (!content) return { ok: false, error: "Enter the direction to apply." };

    const section = await prisma.songSection.findUnique({ where: { id: note.sectionId! } });
    if (!section || section.songId !== note.rehearsal.songId) return { ok: false, error: "Section not found." };

    const applied = await prisma.$transaction(async (tx) => {
      const claimed = await tx.rehearsalNote.updateMany({
        where: { id: noteId, status: "OPEN" },
        data: { status: "CONVERTED", resolvedAt: new Date() },
      });
      if (claimed.count === 0) return false;
      const current = await tx.songRoleNote.findFirst({
        where: { sectionId: section.id, role, teamMemberId: null },
        select: { content: true },
      });
      await applySharedRoleNote(tx, {
        songId: section.songId,
        sectionId: section.id,
        role,
        content,
        previousContent: current?.content ?? null,
        reason: "Agreed in rehearsal",
      });
      return true;
    });
    if (!applied) return { ok: false, error: "Already reviewed." };

    revalidatePath(`/songs/${section.songId}`);
    revalidatePath(`/rehearsal`);
    revalidatePath(`/my-part`);
    return { ok: true };
  });
}

// ── Live rehearsal position (polling-based sync, see audit section 5) ──

export type LivePositionWrite = { updatedAt: string };
export type SetLivePositionResult =
  | { ok: true; data: LivePositionWrite }
  | { ok: false; error: string; current?: LivePosition };

// The shared position only ever changes through this call, made by a
// leader-role user — never by a timer. `baseUpdatedAt` (the version the
// caller last saw) makes the write compare-and-set: if another controller
// moved the position first, this returns the newer position instead of
// silently overwriting it.
export async function setLivePosition(
  setId: string,
  setSongId: string,
  sectionId: string | null,
  baseUpdatedAt?: string | null,
): Promise<SetLivePositionResult> {
  return runAction(async () => {
    const { user, team, membershipRole } = await requireUser();
    if (!isLeaderRole(membershipRole)) return { ok: false, error: "Only the worship leader can direct rehearsal." };
    const set = await prisma.worshipSet.findUnique({ where: { id: setId } });
    if (!set || set.teamId !== team.id) return { ok: false, error: "Not found." };

    // The position must point at this set's own song, and at a section of
    // that song — never an id from another set or another team.
    const setSong = await prisma.setSong.findUnique({ where: { id: setSongId }, include: { song: { select: { id: true } } } });
    if (!setSong || setSong.setId !== setId) return { ok: false, error: "Song not found in this set." };
    if (sectionId) {
      const section = await prisma.songSection.findUnique({ where: { id: sectionId }, select: { songId: true } });
      if (!section || section.songId !== setSong.song.id) return { ok: false, error: "Section not found in this song." };
    }

    const isFirstMove = !set.liveSetSongId;
    const now = new Date();
    const claimed = await prisma.worshipSet.updateMany({
      where: {
        id: setId,
        ...(baseUpdatedAt === undefined ? {} : { liveUpdatedAt: baseUpdatedAt === null ? null : new Date(baseUpdatedAt) }),
      },
      data: { liveSetSongId: setSongId, liveSectionId: sectionId, liveUpdatedAt: now, liveControllerName: user.name },
    });
    if (claimed.count === 0) {
      const latest = await prisma.worshipSet.findUnique({ where: { id: setId } });
      return {
        ok: false,
        error: "Someone else just moved the position — you're now following their latest.",
        current: latest ? toLivePosition(latest) : undefined,
      };
    }
    if (isFirstMove) {
      trackEvent(team.id, "director_mode_started", { entityId: setId });
      await advanceTourIfNeeded(user.id, team.id, 11);
    }
    return { ok: true, data: { updatedAt: now.toISOString() } };
  });
}

function toLivePosition(set: {
  liveSetSongId: string | null;
  liveSectionId: string | null;
  liveUpdatedAt: Date | null;
  liveControllerName: string | null;
  liveAnnouncement: string | null;
  liveAnnouncementAt: Date | null;
}): LivePosition {
  return {
    setSongId: set.liveSetSongId,
    sectionId: set.liveSectionId,
    updatedAt: set.liveUpdatedAt?.toISOString() ?? null,
    controllerName: set.liveControllerName,
    announcement: set.liveAnnouncement,
    announcementAt: set.liveAnnouncementAt?.toISOString() ?? null,
  };
}

export type LivePosition = {
  setSongId: string | null;
  sectionId: string | null;
  updatedAt: string | null;
  // Display name of whoever last moved this position — see the
  // liveControllerName schema comment. Shown to every viewer, not just
  // followers, so a second leader-tier device knows someone else is
  // already driving.
  controllerName: string | null;
  announcement: string | null;
  announcementAt: string | null;
};

export async function getLivePosition(setId: string): Promise<ActionResultData<LivePosition>> {
  return runAction(async () => {
    const { team } = await requireUser();
    const set = await prisma.worshipSet.findUnique({
      where: { id: setId },
      select: {
        teamId: true,
        liveSetSongId: true,
        liveSectionId: true,
        liveUpdatedAt: true,
        liveControllerName: true,
        liveAnnouncement: true,
        liveAnnouncementAt: true,
      },
    });
    if (!set || set.teamId !== team.id) return { ok: false, error: "Not found." };

    return { ok: true, data: toLivePosition(set) };
  });
}

const ANNOUNCE_DEDUPE_MS = 2000;

export async function announceToTeam(setId: string, message: string): Promise<ActionResult> {
  return runAction(async () => {
    const { user, team, membershipRole } = await requireUser();
    if (!isLeaderRole(membershipRole)) return { ok: false, error: "Only the worship leader can announce." };
    if (!message.trim()) return { ok: false, error: "Enter an announcement first." };
    const set = await prisma.worshipSet.findUnique({ where: { id: setId } });
    if (!set || set.teamId !== team.id) return { ok: false, error: "Not found." };

    // A double-tap (or a keyboard shortcut firing twice) must not re-send
    // the same cue: an identical message within a couple of seconds is
    // already on every musician's screen.
    const text = message.trim();
    if (
      set.liveAnnouncement === text &&
      set.liveAnnouncementAt &&
      Date.now() - set.liveAnnouncementAt.getTime() < ANNOUNCE_DEDUPE_MS
    ) {
      return { ok: true };
    }

    await prisma.worshipSet.update({
      where: { id: setId },
      data: { liveAnnouncement: text, liveAnnouncementAt: new Date() },
    });
    trackEvent(team.id, "announce_sent", { entityId: setId });
    await advanceTourIfNeeded(user.id, team.id, 12);
    return { ok: true };
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
