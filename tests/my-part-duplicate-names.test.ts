import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { getMyRosterData } from "@/lib/dashboard/data";
import { resolveMemberSongRoles } from "@/lib/songs/assignment-resolver";
import { groupMembersByName } from "@/lib/songs/member-name";
import { createTestTeam, cleanupTeam } from "./helpers";

// Two TeamMember rows sharing one real person's name (e.g. a roster import
// that created a second row instead of matching the existing one) must never
// cause an assignment on the "other" row to silently disappear from My Part
// when the picker is deduped down to a single name.
describe("My Part duplicate-name merge", () => {
  const cleanup: { teamId: string; churchId: string }[] = [];
  afterEach(async () => {
    while (cleanup.length) {
      const c = cleanup.pop()!;
      await cleanupTeam(c.teamId, c.churchId);
    }
  });

  it("merges roster assignments across duplicate TeamMember rows for the same name", async () => {
    const leader = await createTestTeam("dup-name-roster", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });

    const samA = await prisma.teamMember.create({ data: { teamId: leader.team.id, name: "Sam", role: "Vocals" } });
    const samB = await prisma.teamMember.create({ data: { teamId: leader.team.id, name: "sam", role: "Vocals" } });

    const future = new Date();
    future.setDate(future.getDate() + 7);
    const set = await prisma.worshipSet.create({
      data: { teamId: leader.team.id, title: "Next Sunday", serviceDate: future },
    });
    // Assigned via the "A" row only — simulating the real-world case where
    // half of someone's assignments ended up on each duplicate row.
    await prisma.setTeamMember.create({ data: { setId: set.id, teamMemberId: samA.id, role: "Vocals" } });

    const members = await prisma.teamMember.findMany({ where: { teamId: leader.team.id } });
    const memberIds = groupMembersByName(members).find((g) => g.ids.includes(samB.id))!.ids;
    expect(memberIds.sort()).toEqual([samA.id, samB.id].sort());

    // Looking up the "B" row alone (today's single-id behavior) would miss
    // the assignment entirely — this is exactly the bug being fixed.
    const soloResult = await getMyRosterData(samB.id);
    expect(soloResult.upcoming).toHaveLength(0);

    const mergedResult = await getMyRosterData(memberIds);
    expect(mergedResult.upcoming).toHaveLength(1);
    expect(mergedResult.upcoming[0].roles).toEqual(["Vocals"]);
  });

  it("merges song-level role resolution across duplicate rows, surfacing the shared role from both", async () => {
    const leader = await createTestTeam("dup-name-resolver", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });

    const kkA = await prisma.teamMember.create({ data: { teamId: leader.team.id, name: "Kundu", role: "Guitar" } });
    const kkB = await prisma.teamMember.create({ data: { teamId: leader.team.id, name: "kundu", role: "Guitar" } });

    const set = await prisma.worshipSet.create({ data: { teamId: leader.team.id, title: "Service" } });
    const song = await prisma.song.create({ data: { teamId: leader.team.id, title: "Oceans" } });
    const setSong = await prisma.setSong.create({ data: { setId: set.id, songId: song.id, order: 0 } });

    await prisma.setTeamMember.create({ data: { setId: set.id, teamMemberId: kkA.id, role: "Guitar" } });
    // Same person, same role, mistakenly assigned on both duplicate rows —
    // resolveMemberSongRoles itself returns one entry per id (by design, it
    // doesn't know its caller might merge duplicate-name ids); it's the
    // page's job to dedupe identical (setSongId, role) pairs after merging.
    await prisma.setTeamMember.create({ data: { setId: set.id, teamMemberId: kkB.id, role: "Guitar" } });

    // Looking up only "B" (today's single-id behavior) would still find the
    // song via its own SetTeamMember row...
    const soloB = await resolveMemberSongRoles(prisma, kkB.id);
    expect(soloB).toEqual([{ setSongId: setSong.id, role: "Guitar", isOverride: false }]);

    // ...but merging across both ids must not lose A's assignment, and must
    // surface the setSong/role pair for a real caller to dedupe down to one.
    const merged = await resolveMemberSongRoles(prisma, [kkA.id, kkB.id]);
    expect(merged).toHaveLength(2);
    expect(merged.every((r) => r.setSongId === setSong.id && r.role === "Guitar")).toBe(true);
  });
});
