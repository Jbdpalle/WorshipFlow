import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { setLivePosition, getLivePosition, announceToTeam } from "@/lib/actions/rehearsal";
import { shouldAutoFollow, isStalePositionWrite, computeConnectionState } from "@/lib/songs/live-follow";
import { createTestTeam, loginAs, cleanupTeam } from "./helpers";

describe("Shared live position (server)", () => {
  const cleanup: { teamId: string; churchId: string }[] = [];
  afterEach(async () => {
    while (cleanup.length) {
      const c = cleanup.pop()!;
      await cleanupTeam(c.teamId, c.churchId);
    }
  });

  async function setup(label: string) {
    const leader = await createTestTeam(label, "OWNER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    const set = await prisma.worshipSet.create({ data: { teamId: leader.team.id, title: "Sunday", liveMode: "LIVE" } });
    const song1 = await prisma.song.create({ data: { teamId: leader.team.id, title: "One" } });
    const song2 = await prisma.song.create({ data: { teamId: leader.team.id, title: "Two" } });
    const s1a = await prisma.songSection.create({ data: { songId: song1.id, label: "Verse", order: 0 } });
    const s1b = await prisma.songSection.create({ data: { songId: song1.id, label: "Chorus", order: 1 } });
    const s2a = await prisma.songSection.create({ data: { songId: song2.id, label: "Verse", order: 0 } });
    const ss1 = await prisma.setSong.create({ data: { setId: set.id, songId: song1.id, order: 0 } });
    const ss2 = await prisma.setSong.create({ data: { setId: set.id, songId: song2.id, order: 1 } });
    await loginAs(leader.user.id);
    return { leader, set, ss1, ss2, s1a, s1b, s2a };
  }

  async function asMember(churchId: string) {
    const member = await prisma.user.create({ data: { name: "M", email: `m-${Date.now()}-${Math.random()}@test.invalid`, passwordHash: "x" } });
    await prisma.membership.create({ data: { userId: member.id, churchId, role: "MEMBER" } });
    await loginAs(member.id);
  }

  it("a leader can move the position; a different team cannot read it", async () => {
    const { set, ss1, s1b } = await setup("pos-leader");
    const moved = await setLivePosition(set.id, ss1.id, s1b.id);
    expect(moved.ok).toBe(true);

    const reader = await createTestTeam("pos-reader", "OWNER"); // separate team: must not see it
    cleanup.push({ teamId: reader.team.id, churchId: reader.church.id });
    await loginAs(reader.user.id);
    expect((await getLivePosition(set.id)).ok).toBe(false);
  });

  it("a team member reads the leader's position via getLivePosition", async () => {
    const { leader, set, ss1, s1b } = await setup("pos-member-read");
    await setLivePosition(set.id, ss1.id, s1b.id);
    await asMember(leader.church.id);
    const position = await getLivePosition(set.id);
    expect(position.ok && position.data).toMatchObject({ setSongId: ss1.id, sectionId: s1b.id });
  });

  it("a plain member cannot move the shared position through a direct call", async () => {
    const { leader, set, ss1, ss2, s1a, s2a } = await setup("pos-member-write");
    await setLivePosition(set.id, ss1.id, s1a.id);
    await asMember(leader.church.id);
    const attempt = await setLivePosition(set.id, ss2.id, s2a.id);
    expect(attempt.ok).toBe(false);
    const row = await prisma.worshipSet.findUnique({ where: { id: set.id } });
    expect(row?.liveSetSongId).toBe(ss1.id);
    expect(row?.liveSectionId).toBe(s1a.id);
  });

  it("never advances on its own: the position is identical after time passes with no controller write", async () => {
    const { set, ss1, s1a } = await setup("pos-no-timer");
    await setLivePosition(set.id, ss1.id, s1a.id);
    const before = await getLivePosition(set.id);
    await new Promise((r) => setTimeout(r, 400));
    const after = await getLivePosition(set.id);
    expect(before.ok && after.ok).toBe(true);
    if (before.ok && after.ok) expect(after.data).toEqual(before.data);
  });

  it("rejects a song from another set/team and a section from a different song", async () => {
    const { set, ss1, s2a } = await setup("pos-validate");
    const other = await createTestTeam("pos-validate-other", "OWNER");
    cleanup.push({ teamId: other.team.id, churchId: other.church.id });
    const otherSet = await prisma.worshipSet.create({ data: { teamId: other.team.id, title: "Other" } });
    const otherSong = await prisma.song.create({ data: { teamId: other.team.id, title: "X" } });
    const otherSetSong = await prisma.setSong.create({ data: { setId: otherSet.id, songId: otherSong.id, order: 0 } });

    await loginAs((await prisma.team.findFirstOrThrow({ where: { id: set.teamId }, include: { church: true } })).ownerId);
    expect((await setLivePosition(set.id, otherSetSong.id, null)).ok).toBe(false);
    expect((await setLivePosition(set.id, ss1.id, s2a.id)).ok).toBe(false);
    expect((await prisma.worshipSet.findUnique({ where: { id: set.id } }))?.liveSetSongId).toBeNull();
  });

  it("a stale write (another controller moved first) is refused and returns the newer position", async () => {
    const { set, ss1, ss2, s1a, s2a } = await setup("pos-cas");
    const first = await setLivePosition(set.id, ss1.id, s1a.id, null);
    if (!first.ok) throw new Error("setup");
    const base = first.data.updatedAt;

    // A second controller moves first.
    const theirs = await setLivePosition(set.id, ss2.id, s2a.id, base);
    expect(theirs.ok).toBe(true);

    // This controller still holds the old version.
    const stale = await setLivePosition(set.id, ss1.id, s1a.id, base);
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.current).toMatchObject({ setSongId: ss2.id, sectionId: s2a.id });
    expect((await prisma.worshipSet.findUnique({ where: { id: set.id } }))?.liveSetSongId).toBe(ss2.id);
  });

  it("two concurrent writes from the same base: exactly one wins", async () => {
    const { set, ss1, ss2, s1a, s2a } = await setup("pos-race");
    const seed = await setLivePosition(set.id, ss1.id, s1a.id, null);
    if (!seed.ok) throw new Error("setup");
    const [a, b] = await Promise.all([
      setLivePosition(set.id, ss1.id, null, seed.data.updatedAt),
      setLivePosition(set.id, ss2.id, s2a.id, seed.data.updatedAt),
    ]);
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
  });

  it("an identical cue sent twice in a row (double tap) is announced once", async () => {
    const { set } = await setup("pos-dedupe");
    expect((await announceToTeam(set.id, "Hold")).ok).toBe(true);
    const first = await prisma.worshipSet.findUnique({ where: { id: set.id } });
    expect((await announceToTeam(set.id, "Hold")).ok).toBe(true);
    const second = await prisma.worshipSet.findUnique({ where: { id: set.id } });
    expect(second?.liveAnnouncementAt?.getTime()).toBe(first?.liveAnnouncementAt?.getTime());
    // A different cue still goes through immediately.
    await announceToTeam(set.id, "Build");
    expect((await prisma.worshipSet.findUnique({ where: { id: set.id } }))?.liveAnnouncement).toBe("Build");
  });

  it("a plain member cannot announce", async () => {
    const { leader, set } = await setup("pos-announce-member");
    await asMember(leader.church.id);
    expect((await announceToTeam(set.id, "Hold")).ok).toBe(false);
  });

  it("records and surfaces who last moved the position, without locking out other controllers", async () => {
    const { leader, set, ss1, ss2, s1b, s2a } = await setup("pos-controller-name");
    await setLivePosition(set.id, ss1.id, s1b.id);
    const first = await getLivePosition(set.id);
    expect(first.ok && first.data.controllerName).toBe(leader.user.name);

    // A second leader-tier account on the same team can still move it —
    // controllerName is visibility, not a claimed lock.
    const secondLeader = await prisma.user.create({
      data: { name: "Second Leader", email: `2nd-${Date.now()}@test.invalid`, passwordHash: "x" },
    });
    await prisma.membership.create({ data: { userId: secondLeader.id, churchId: leader.church.id, role: "LEADER" } });
    await loginAs(secondLeader.id);
    const moved = await setLivePosition(set.id, ss2.id, s2a.id, first.ok ? first.data.updatedAt : undefined);
    expect(moved.ok).toBe(true);

    const after = await getLivePosition(set.id);
    expect(after.ok && after.data.controllerName).toBe("Second Leader");
  });
});

describe("shouldAutoFollow (client follow rule)", () => {
  const live = { setSongId: "song-1", sectionId: "verse" };

  it("a viewer on the live position follows the leader's next move (no Next tap)", () => {
    expect(shouldAutoFollow(false, { setSongId: "song-1", sectionId: "verse" }, live)).toBe(true);
  });

  it("a viewer reading another section is not yanked away", () => {
    expect(shouldAutoFollow(false, { setSongId: "song-1", sectionId: "bridge" }, live)).toBe(false);
  });

  it("a viewer browsing another song is not yanked away", () => {
    expect(shouldAutoFollow(false, { setSongId: "song-2", sectionId: "verse" }, live)).toBe(false);
  });

  it("follows when no live position was established yet, and always for leader screens", () => {
    expect(shouldAutoFollow(false, { setSongId: "song-2", sectionId: "x" }, null)).toBe(true);
    expect(shouldAutoFollow(true, { setSongId: "song-2", sectionId: "x" }, live)).toBe(true);
  });

  it("computes connection state from how long since the last successful poll", () => {
    const pollMs = 3500;
    expect(computeConnectionState(0, pollMs)).toBe("live");
    expect(computeConnectionState(pollMs, pollMs)).toBe("live");
    expect(computeConnectionState(pollMs * 2, pollMs)).toBe("catching-up");
    expect(computeConnectionState(pollMs * 4, pollMs)).toBe("catching-up");
    expect(computeConnectionState(pollMs * 5, pollMs)).toBe("disconnected");
  });

  it("detects a stale position version", () => {
    const now = new Date("2026-01-01T10:00:00.000Z");
    expect(isStalePositionWrite(undefined, now)).toBe(false);
    expect(isStalePositionWrite(now.toISOString(), now)).toBe(false);
    expect(isStalePositionWrite("2026-01-01T09:59:00.000Z", now)).toBe(true);
    expect(isStalePositionWrite(null, now)).toBe(true);
    expect(isStalePositionWrite(null, null)).toBe(false);
  });
});
