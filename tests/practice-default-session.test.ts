import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  startDefaultPractice,
  createPracticeSession,
  finishPracticeSession,
} from "@/lib/actions/practice-sessions";
import { startLiveSet } from "@/lib/actions/live-set";
import { startRehearsal, captureRehearsalNote } from "@/lib/actions/rehearsal";
import { createTestTeam, loginAs, cleanupTeam } from "./helpers";

describe("One-tap Sunday practice", () => {
  const cleanup: { teamId: string; churchId: string }[] = [];
  afterEach(async () => {
    while (cleanup.length) {
      const c = cleanup.pop()!;
      await cleanupTeam(c.teamId, c.churchId);
    }
  });

  async function setup(label: string) {
    const owner = await createTestTeam(label, "OWNER");
    cleanup.push({ teamId: owner.team.id, churchId: owner.church.id });
    const set = await prisma.worshipSet.create({ data: { teamId: owner.team.id, title: "Sunday" } });
    const song = await prisma.song.create({ data: { teamId: owner.team.id, title: "Song" } });
    const section = await prisma.songSection.create({ data: { songId: song.id, label: "Chorus", order: 0 } });
    const setSong = await prisma.setSong.create({ data: { setId: set.id, songId: song.id, order: 0 } });
    await loginAs(owner.user.id);
    return { owner, set, song, section, setSong };
  }

  it("a set with no sessions needs no setup: one call creates AND starts the practice", async () => {
    const { set } = await setup("dp-first");
    const result = await startDefaultPractice(set.id);
    expect(result.ok).toBe(true);
    const sessions = await prisma.practiceSession.findMany({ where: { setId: set.id } });
    expect(sessions).toHaveLength(1);
    expect(sessions[0].status).toBe("IN_PROGRESS");
    const row = await prisma.worshipSet.findUnique({ where: { id: set.id } });
    expect(row).toMatchObject({ liveMode: "PRACTICE", activePracticeSessionId: sessions[0].id });
  });

  it("tapping again (reload, second leader) resumes the same session instead of creating another", async () => {
    const { set } = await setup("dp-resume");
    const a = await startDefaultPractice(set.id);
    const b = await startDefaultPractice(set.id);
    expect(a.ok && b.ok && a.data.id === b.data.id).toBe(true);
    expect(await prisma.practiceSession.count({ where: { setId: set.id } })).toBe(1);
  });

  it("starts an already-planned session rather than adding a new one", async () => {
    const { set } = await setup("dp-planned");
    const planned = await createPracticeSession(set.id, { name: "Thursday run-through" });
    if (!planned.ok) throw new Error("setup");
    const started = await startDefaultPractice(set.id);
    expect(started.ok && started.data.id).toBe(planned.data.id);
    expect(await prisma.practiceSession.count({ where: { setId: set.id } })).toBe(1);
  });

  it("after the first practice is finished, the next tap starts a fresh one (history kept)", async () => {
    const { set } = await setup("dp-second");
    const first = await startDefaultPractice(set.id);
    if (!first.ok) throw new Error("setup");
    await finishPracticeSession(first.data.id);
    const second = await startDefaultPractice(set.id);
    expect(second.ok && second.data.id !== first.data.id).toBe(true);
    const sessions = await prisma.practiceSession.findMany({ where: { setId: set.id }, orderBy: { createdAt: "asc" } });
    expect(sessions.map((s) => s.status)).toEqual(["COMPLETED", "IN_PROGRESS"]);
  });

  it("multiple named sessions (camps, conferences) are still possible", async () => {
    const { set } = await setup("dp-multi");
    for (const name of ["Day 1", "Day 2", "Day 3"]) expect((await createPracticeSession(set.id, { name })).ok).toBe(true);
    expect(await prisma.practiceSession.count({ where: { setId: set.id } })).toBe(3);
  });

  it("only a leader can start practice; a member's direct call changes nothing", async () => {
    const { owner, set } = await setup("dp-perm");
    const member = await prisma.user.create({ data: { name: "M", email: `m-${Date.now()}@test.invalid`, passwordHash: "x" } });
    await prisma.membership.create({ data: { userId: member.id, churchId: owner.church.id, role: "MEMBER" } });
    await loginAs(member.id);
    expect((await startDefaultPractice(set.id)).ok).toBe(false);
    expect(await prisma.practiceSession.count({ where: { setId: set.id } })).toBe(0);
  });

  it("another team cannot start practice on this set", async () => {
    const { set } = await setup("dp-tenant");
    const other = await createTestTeam("dp-tenant-b", "OWNER");
    cleanup.push({ teamId: other.team.id, churchId: other.church.id });
    await loginAs(other.user.id);
    expect((await startDefaultPractice(set.id)).ok).toBe(false);
  });

  it("reopening a song inside one session reuses its rehearsal row (notes stay together)", async () => {
    const { set, song, setSong } = await setup("dp-reuse");
    const session = await startDefaultPractice(set.id);
    if (!session.ok) throw new Error("setup");
    const a = await startRehearsal(song.id, setSong.id, undefined, session.data.id);
    const b = await startRehearsal(song.id, setSong.id, undefined, session.data.id);
    expect(a.ok && b.ok && a.data.id === b.data.id).toBe(true);
    expect(await prisma.rehearsal.count({ where: { practiceSessionId: session.data.id } })).toBe(1);
  });

  it("rejects a practice session that belongs to another team", async () => {
    const { set, song, setSong } = await setup("dp-foreign-session");
    const session = await startDefaultPractice(set.id);
    if (!session.ok) throw new Error("setup");
    const other = await createTestTeam("dp-foreign-b", "OWNER");
    cleanup.push({ teamId: other.team.id, churchId: other.church.id });
    const otherSong = await prisma.song.create({ data: { teamId: other.team.id, title: "Mine" } });
    await loginAs(other.user.id);
    expect((await startRehearsal(otherSong.id, null, undefined, session.data.id)).ok).toBe(false);
    expect((await startRehearsal(song.id, setSong.id)).ok).toBe(false);
  });

  it("Finish reports unreviewed notes but never blocks the Live Set", async () => {
    const { set, song, setSong, section } = await setup("dp-finish");
    const session = await startDefaultPractice(set.id);
    if (!session.ok) throw new Error("setup");
    const rehearsal = await startRehearsal(song.id, setSong.id, undefined, session.data.id);
    if (!rehearsal.ok) throw new Error("setup");
    await captureRehearsalNote({ rehearsalId: rehearsal.data.id, content: "Tighten the ending", category: "FIX", sectionId: section.id });

    const finished = await finishPracticeSession(session.data.id);
    expect(finished.ok && finished.data.openNotes).toBe(1);

    const live = await startLiveSet(set.id);
    expect(live.ok).toBe(true);
    expect((await prisma.worshipSet.findUnique({ where: { id: set.id } }))?.liveMode).toBe("LIVE");
    // The note is still there to review later.
    expect(await prisma.rehearsalNote.count({ where: { status: "OPEN" } })).toBeGreaterThanOrEqual(1);
  });

  it("Practice and Live Set run from the same arrangement: no copy is made by starting either", async () => {
    const { set, song } = await setup("dp-same-arrangement");
    const before = await prisma.songSection.count({ where: { songId: song.id } });
    await startDefaultPractice(set.id);
    await startLiveSet(set.id);
    expect(await prisma.songSection.count({ where: { songId: song.id } })).toBe(before);
    expect(await prisma.song.count({ where: { teamId: set.teamId } })).toBe(1);
  });
});
