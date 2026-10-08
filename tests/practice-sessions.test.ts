import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  createPracticeSession,
  startPracticeSession,
  finishPracticeSession,
  updatePracticeSessionNotes,
} from "@/lib/actions/practice-sessions";
import { startLiveSet, finishLiveSet } from "@/lib/actions/live-set";
import { startRehearsal, recordSectionVisit, keepArrangementChange, proposeArrangementChange } from "@/lib/actions/rehearsal";
import { createTestTeam, loginAs, cleanupTeam } from "./helpers";

describe("Practice Sessions + Live Set", () => {
  const cleanup: { teamId: string; churchId: string }[] = [];
  afterEach(async () => {
    while (cleanup.length) {
      const c = cleanup.pop()!;
      await cleanupTeam(c.teamId, c.churchId);
    }
  });

  async function setupSetWithSongs(label: string) {
    const owner = await createTestTeam(label, "OWNER");
    cleanup.push({ teamId: owner.team.id, churchId: owner.church.id });
    const set = await prisma.worshipSet.create({ data: { teamId: owner.team.id, title: "Sunday Gathering" } });
    const song1 = await prisma.song.create({ data: { teamId: owner.team.id, title: "God My Rock" } });
    const song2 = await prisma.song.create({ data: { teamId: owner.team.id, title: "Tu Hai" } });
    const section1 = await prisma.songSection.create({
      data: { songId: song1.id, label: "Verse 1", order: 0 },
    });
    const section2 = await prisma.songSection.create({
      data: { songId: song1.id, label: "Chorus", order: 1 },
    });
    const setSong1 = await prisma.setSong.create({ data: { setId: set.id, songId: song1.id, order: 0 } });
    const setSong2 = await prisma.setSong.create({ data: { setId: set.id, songId: song2.id, order: 1 } });
    return { owner, set, song1, song2, section1, section2, setSong1, setSong2 };
  }

  it("creates a practice session as a leader, rejects a MEMBER", async () => {
    const { owner, set } = await setupSetWithSongs("practice-create");
    await loginAs(owner.user.id);
    const result = await createPracticeSession(set.id, { name: "Practice Session 1" });
    expect(result.ok).toBe(true);

    const member = await createTestTeam("practice-create-member", "MEMBER");
    cleanup.push({ teamId: member.team.id, churchId: member.church.id });
    await loginAs(member.user.id);
    const rejected = await createPracticeSession(set.id, { name: "Hijack session" });
    expect(rejected.ok).toBe(false);
  });

  it("supports an arbitrary number of practice sessions with different names/dates", async () => {
    const { owner, set } = await setupSetWithSongs("practice-multi");
    await loginAs(owner.user.id);
    const names = ["Practice #1", "Practice #2", "Practice #3", "Practice #4", "Final Practice"];
    for (const name of names) {
      const result = await createPracticeSession(set.id, { name, scheduledAt: "2026-11-01T10:00" });
      expect(result.ok).toBe(true);
    }
    const sessions = await prisma.practiceSession.findMany({ where: { setId: set.id } });
    expect(sessions).toHaveLength(5);
    expect(sessions.map((s) => s.name).sort()).toEqual([...names].sort());
  });

  it("starting a practice session claims the set's live position for PRACTICE; finishing releases it", async () => {
    const { owner, set } = await setupSetWithSongs("practice-start-finish");
    await loginAs(owner.user.id);
    const created = await createPracticeSession(set.id, { name: "Practice Session 1" });
    if (!created.ok) throw new Error("setup failed");
    const sessionId = created.data.id;

    const started = await startPracticeSession(sessionId);
    expect(started.ok).toBe(true);

    const setAfterStart = await prisma.worshipSet.findUnique({ where: { id: set.id } });
    expect(setAfterStart?.liveMode).toBe("PRACTICE");
    expect(setAfterStart?.activePracticeSessionId).toBe(sessionId);

    const sessionAfterStart = await prisma.practiceSession.findUnique({ where: { id: sessionId } });
    expect(sessionAfterStart?.status).toBe("IN_PROGRESS");
    expect(sessionAfterStart?.startedAt).not.toBeNull();

    const finished = await finishPracticeSession(sessionId);
    expect(finished.ok).toBe(true);

    const setAfterFinish = await prisma.worshipSet.findUnique({ where: { id: set.id } });
    expect(setAfterFinish?.liveMode).toBe("NONE");
    expect(setAfterFinish?.activePracticeSessionId).toBeNull();

    const sessionAfterFinish = await prisma.practiceSession.findUnique({ where: { id: sessionId } });
    expect(sessionAfterFinish?.status).toBe("COMPLETED");
    expect(sessionAfterFinish?.finishedAt).not.toBeNull();
  });

  it("computes songs practiced and sections covered from tagged Rehearsal rows, not an estimate", async () => {
    const { owner, set, song1, song2, section1, section2 } = await setupSetWithSongs("practice-summary");
    await loginAs(owner.user.id);
    const created = await createPracticeSession(set.id, { name: "Practice Session 1" });
    if (!created.ok) throw new Error("setup failed");
    const sessionId = created.data.id;
    await startPracticeSession(sessionId);

    // Simulate Director Mode opening song1 (creates a Rehearsal row tagged
    // to this session) and visiting both of its sections, then opening
    // song2 and visiting one section.
    const r1 = await startRehearsal(song1.id, null, undefined, sessionId);
    if (!r1.ok) throw new Error("setup failed");
    await recordSectionVisit(r1.data.id, section1.id);
    await recordSectionVisit(r1.data.id, section2.id);
    await recordSectionVisit(r1.data.id, section2.id); // duplicate visit must not double-count

    const r2 = await startRehearsal(song2.id, null, undefined, sessionId);
    if (!r2.ok) throw new Error("setup failed");

    const finished = await finishPracticeSession(sessionId);
    expect(finished.ok).toBe(true);
    if (!finished.ok) return;
    expect(finished.data.songsPracticed).toBe(2);
    expect(finished.data.sectionsCovered).toBe(2);
  });

  it("an experiment kept during a practice-tagged rehearsal updates the canonical SongRoleNote directly — no separate Practice/Live arrangement", async () => {
    const { owner, set, song1, section1 } = await setupSetWithSongs("practice-experiment");
    await loginAs(owner.user.id);
    const created = await createPracticeSession(set.id, { name: "Practice Session 1" });
    if (!created.ok) throw new Error("setup failed");
    await startPracticeSession(created.data.id);

    const rehearsal = await startRehearsal(song1.id, null, undefined, created.data.id);
    if (!rehearsal.ok) throw new Error("setup failed");

    const proposed = await proposeArrangementChange({
      sectionId: section1.id,
      role: "Bass",
      proposedContent: "Rest until final chorus",
      rehearsalId: rehearsal.data.id,
    });
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) return;

    const kept = await keepArrangementChange(proposed.data.id);
    expect(kept.ok).toBe(true);

    const note = await prisma.songRoleNote.findFirst({ where: { sectionId: section1.id, role: "Bass" } });
    expect(note?.content).toBe("Rest until final chorus");

    // This is the canonical arrangement — the exact thing both Practice
    // Sessions and the Live Set read, with nothing to copy between them.
    const rehearsalRow = await prisma.rehearsal.findUnique({ where: { id: rehearsal.data.id } });
    expect(rehearsalRow?.practiceSessionId).toBe(created.data.id);
  });

  it("rejects startPracticeSession/finishPracticeSession for a MEMBER", async () => {
    const { owner, set } = await setupSetWithSongs("practice-member-reject");
    await loginAs(owner.user.id);
    const created = await createPracticeSession(set.id, { name: "Practice Session 1" });
    if (!created.ok) throw new Error("setup failed");

    const member = await createTestTeam("practice-member-reject-m", "MEMBER");
    cleanup.push({ teamId: member.team.id, churchId: member.church.id });
    await loginAs(member.user.id);
    expect((await startPracticeSession(created.data.id)).ok).toBe(false);

    await loginAs(owner.user.id);
    await startPracticeSession(created.data.id);
    await loginAs(member.user.id);
    expect((await finishPracticeSession(created.data.id)).ok).toBe(false);

    const session = await prisma.practiceSession.findUnique({ where: { id: created.data.id } });
    expect(session?.status).toBe("IN_PROGRESS");
  });

  it("rejects a leader from a DIFFERENT team creating/starting a practice session on this set", async () => {
    const { set } = await setupSetWithSongs("practice-tenant-owner");
    const attacker = await createTestTeam("practice-tenant-attacker", "OWNER");
    cleanup.push({ teamId: attacker.team.id, churchId: attacker.church.id });

    await loginAs(attacker.user.id);
    const created = await createPracticeSession(set.id, { name: "Hijack" });
    expect(created.ok).toBe(false);
    expect(await prisma.practiceSession.findMany({ where: { setId: set.id } })).toHaveLength(0);
  });

  it("rejects a leader from a DIFFERENT team starting/finishing an existing practice session by id", async () => {
    const { owner, set } = await setupSetWithSongs("practice-tenant-session");
    await loginAs(owner.user.id);
    const created = await createPracticeSession(set.id, { name: "Practice Session 1" });
    if (!created.ok) throw new Error("setup failed");

    const attacker = await createTestTeam("practice-tenant-session-attacker", "OWNER");
    cleanup.push({ teamId: attacker.team.id, churchId: attacker.church.id });
    await loginAs(attacker.user.id);
    expect((await startPracticeSession(created.data.id)).ok).toBe(false);
    expect((await updatePracticeSessionNotes(created.data.id, "hijacked")).ok).toBe(false);

    const session = await prisma.practiceSession.findUnique({ where: { id: created.data.id } });
    expect(session?.status).toBe("PLANNED");
    expect(session?.notes).toBeNull();
  });

  it("Live Set: start/finish set liveMode and liveStartedAt/liveEndedAt; MEMBER rejected; tenant isolated", async () => {
    const { owner, set } = await setupSetWithSongs("live-set-basic");
    const member = await createTestTeam("live-set-basic-member", "MEMBER");
    cleanup.push({ teamId: member.team.id, churchId: member.church.id });
    const attacker = await createTestTeam("live-set-basic-attacker", "OWNER");
    cleanup.push({ teamId: attacker.team.id, churchId: attacker.church.id });

    await loginAs(member.user.id);
    expect((await startLiveSet(set.id)).ok).toBe(false);

    await loginAs(attacker.user.id);
    expect((await startLiveSet(set.id)).ok).toBe(false);

    await loginAs(owner.user.id);
    const started = await startLiveSet(set.id);
    expect(started.ok).toBe(true);

    const setAfterStart = await prisma.worshipSet.findUnique({ where: { id: set.id } });
    expect(setAfterStart?.liveMode).toBe("LIVE");
    expect(setAfterStart?.liveStartedAt).not.toBeNull();
    expect(setAfterStart?.liveEndedAt).toBeNull();

    await loginAs(member.user.id);
    expect((await finishLiveSet(set.id)).ok).toBe(false);

    await loginAs(owner.user.id);
    const finished = await finishLiveSet(set.id);
    expect(finished.ok).toBe(true);
    const setAfterFinish = await prisma.worshipSet.findUnique({ where: { id: set.id } });
    expect(setAfterFinish?.liveMode).toBe("NONE");
    expect(setAfterFinish?.liveEndedAt).not.toBeNull();
  });

  it("starting the Live Set releases any practice session that was still claiming the live position", async () => {
    const { owner, set } = await setupSetWithSongs("live-releases-practice");
    await loginAs(owner.user.id);
    const created = await createPracticeSession(set.id, { name: "Practice Session 1" });
    if (!created.ok) throw new Error("setup failed");
    await startPracticeSession(created.data.id);

    let current = await prisma.worshipSet.findUnique({ where: { id: set.id } });
    expect(current?.liveMode).toBe("PRACTICE");

    await startLiveSet(set.id);
    current = await prisma.worshipSet.findUnique({ where: { id: set.id } });
    expect(current?.liveMode).toBe("LIVE");
    expect(current?.activePracticeSessionId).toBeNull();

    // The practice session itself is untouched (still IN_PROGRESS, not
    // silently marked COMPLETED) — only the live-position claim moved.
    const session = await prisma.practiceSession.findUnique({ where: { id: created.data.id } });
    expect(session?.status).toBe("IN_PROGRESS");
  });
});
