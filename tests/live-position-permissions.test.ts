import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { setLivePosition, announceToTeam, getLivePosition } from "@/lib/actions/rehearsal";
import { createTestTeam, loginAs, cleanupTeam } from "./helpers";

// Live-position/announce actions had zero test coverage before this —
// confirmed by grepping tests/*.test.ts for setLivePosition/announceToTeam.
// Covers: server-side leader-only enforcement (not just a hidden button),
// tenant isolation, controller-name visibility, and the stale-write guard
// that resolves out-of-order/concurrent commands (build spec Phase 5.2,
// Scenario 9 "concurrent commands" and Scenario 12 "stale updates").
describe("Live rehearsal position — permissions, tenant isolation, concurrency", () => {
  const cleanup: { teamId: string; churchId: string }[] = [];
  afterEach(async () => {
    while (cleanup.length) {
      const c = cleanup.pop()!;
      await cleanupTeam(c.teamId, c.churchId);
    }
  });

  async function setupSet(role: "OWNER" | "ADMIN" | "LEADER" | "MEMBER") {
    const actor = await createTestTeam(`live-pos-${role}`, role);
    cleanup.push({ teamId: actor.team.id, churchId: actor.church.id });
    const song = await prisma.song.create({ data: { teamId: actor.team.id, title: "A Song" } });
    const section = await prisma.songSection.create({ data: { songId: song.id, label: "Verse 1", order: 0 } });
    const set = await prisma.worshipSet.create({ data: { teamId: actor.team.id, title: "Sunday Service" } });
    const setSong = await prisma.setSong.create({ data: { setId: set.id, songId: song.id, order: 0 } });
    await loginAs(actor.user.id);
    return { actor, song, section, set, setSong };
  }

  it("rejects setLivePosition for a MEMBER and leaves the live position unset", async () => {
    const { set, setSong, section } = await setupSet("MEMBER");
    const result = await setLivePosition(set.id, setSong.id, section.id);
    expect(result.ok).toBe(false);
    const unchanged = await prisma.worshipSet.findUnique({ where: { id: set.id } });
    expect(unchanged?.liveSetSongId).toBeNull();
  });

  it("rejects announceToTeam for a MEMBER", async () => {
    const { set } = await setupSet("MEMBER");
    const result = await announceToTeam(set.id, "Hold");
    expect(result.ok).toBe(false);
    const unchanged = await prisma.worshipSet.findUnique({ where: { id: set.id } });
    expect(unchanged?.liveAnnouncement).toBeNull();
  });

  for (const role of ["LEADER", "ADMIN", "OWNER"] as const) {
    it(`allows setLivePosition for a ${role} and records who's directing`, async () => {
      const { set, setSong, section, actor } = await setupSet(role);
      const result = await setLivePosition(set.id, setSong.id, section.id);
      expect(result.ok).toBe(true);
      const updated = await prisma.worshipSet.findUnique({ where: { id: set.id } });
      expect(updated?.liveSetSongId).toBe(setSong.id);
      expect(updated?.liveSectionId).toBe(section.id);
      expect(updated?.liveControllerName).toBe(actor.user.name);

      const read = await getLivePosition(set.id);
      expect(read.ok).toBe(true);
      if (read.ok) expect(read.data.controllerName).toBe(actor.user.name);
    });
  }

  it("does not let a leader on one team move the live position on another team's set", async () => {
    const owner = await createTestTeam("live-pos-tenant-a", "OWNER");
    cleanup.push({ teamId: owner.team.id, churchId: owner.church.id });
    const song = await prisma.song.create({ data: { teamId: owner.team.id, title: "Team A Song" } });
    const section = await prisma.songSection.create({ data: { songId: song.id, label: "Chorus", order: 0 } });
    const set = await prisma.worshipSet.create({ data: { teamId: owner.team.id, title: "Team A Service" } });
    const setSong = await prisma.setSong.create({ data: { setId: set.id, songId: song.id, order: 0 } });

    const otherLeader = await createTestTeam("live-pos-tenant-b", "LEADER");
    cleanup.push({ teamId: otherLeader.team.id, churchId: otherLeader.church.id });
    await loginAs(otherLeader.user.id);

    const result = await setLivePosition(set.id, setSong.id, section.id);
    expect(result.ok).toBe(false);
    const unchanged = await prisma.worshipSet.findUnique({ where: { id: set.id } });
    expect(unchanged?.liveSetSongId).toBeNull();
  });

  it("applies a newer command and rejects a later-arriving but earlier-issued (stale) one", async () => {
    const { set, setSong, section } = await setupSet("OWNER");
    const song2 = await prisma.song.create({ data: { teamId: (await prisma.worshipSet.findUniqueOrThrow({ where: { id: set.id } })).teamId, title: "Second Song" } });
    const section2 = await prisma.songSection.create({ data: { songId: song2.id, label: "Bridge", order: 0 } });

    const earlier = new Date(Date.now() - 5000).toISOString();
    const later = new Date().toISOString();

    // The "later" command is issued second and applied first — simulating
    // it winning a race against a delayed "earlier" command.
    const laterResult = await setLivePosition(set.id, setSong.id, section2.id, later);
    expect(laterResult.ok).toBe(true);

    // The delayed, actually-older command now finally arrives — it must
    // not overwrite the newer, already-applied position.
    const staleResult = await setLivePosition(set.id, setSong.id, section.id, earlier);
    expect(staleResult.ok).toBe(false);

    const final = await prisma.worshipSet.findUnique({ where: { id: set.id } });
    expect(final?.liveSectionId).toBe(section2.id);
  });

  it("a command with no explicit timestamp still applies (back-compat default of 'now')", async () => {
    const { set, setSong, section } = await setupSet("OWNER");
    const result = await setLivePosition(set.id, setSong.id, section.id);
    expect(result.ok).toBe(true);
    const updated = await prisma.worshipSet.findUnique({ where: { id: set.id } });
    expect(updated?.liveSectionId).toBe(section.id);
  });
});
