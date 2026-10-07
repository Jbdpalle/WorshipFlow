import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { createSet, assignMemberToSet, removeSetMember } from "@/lib/actions/sets";
import { getCalendarMonth } from "@/lib/actions/calendar";
import { getDashboardData } from "@/lib/dashboard/data";
import { createTestTeam, loginAs, cleanupTeam } from "./helpers";

describe("Dashboard + Calendar: permissions, tenant isolation, roster resolution", () => {
  const cleanup: { teamId: string; churchId: string }[] = [];
  afterEach(async () => {
    while (cleanup.length) {
      const c = cleanup.pop()!;
      await cleanupTeam(c.teamId, c.churchId);
    }
  });

  it("a MEMBER cannot create a service, assign the team, or remove a team member", async () => {
    const member = await createTestTeam("cal-member-blocked", "MEMBER");
    cleanup.push({ teamId: member.team.id, churchId: member.church.id });
    const teamMember = await prisma.teamMember.create({
      data: { teamId: member.team.id, name: "Someone", role: "Bass" },
    });
    await loginAs(member.user.id);

    const created = await createSet({ title: "Sunday Service", serviceDate: "2026-10-18" });
    expect(created.ok).toBe(false);

    // Set up a set directly (bypassing the gated action) to test the other two.
    const set = await prisma.worshipSet.create({
      data: { teamId: member.team.id, title: "Sunday Service", serviceDate: new Date(2026, 9, 18) },
    });
    const assigned = await assignMemberToSet(set.id, teamMember.id, "Bass");
    expect(assigned.ok).toBe(false);

    const setTeamMember = await prisma.setTeamMember.create({
      data: { setId: set.id, teamMemberId: teamMember.id, role: "Bass" },
    });
    const removed = await removeSetMember(setTeamMember.id);
    expect(removed.ok).toBe(false);
    expect(await prisma.setTeamMember.findUnique({ where: { id: setTeamMember.id } })).not.toBeNull();
  });

  it("getCalendarMonth never returns another team's services", async () => {
    const teamA = await createTestTeam("cal-tenant-a", "LEADER");
    const teamB = await createTestTeam("cal-tenant-b", "LEADER");
    cleanup.push({ teamId: teamA.team.id, churchId: teamA.church.id });
    cleanup.push({ teamId: teamB.team.id, churchId: teamB.church.id });

    await prisma.worshipSet.create({
      data: { teamId: teamA.team.id, title: "Team A Service", serviceDate: new Date(2026, 9, 11) },
    });
    await prisma.worshipSet.create({
      data: { teamId: teamB.team.id, title: "Team B Service", serviceDate: new Date(2026, 9, 11) },
    });

    await loginAs(teamA.user.id);
    const result = await getCalendarMonth(2026, 9);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(1);
    expect(result.data[0].title).toBe("Team A Service");
  });

  it("Dashboard's service roster reflects SetTeamMember, and prefers the real Worship Leader over a stale leaderName field", async () => {
    const leader = await createTestTeam("cal-roster-resolve", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });

    const selin = await prisma.teamMember.create({
      data: { teamId: leader.team.id, name: "Selin", role: "Worship Leader" },
    });
    const set = await prisma.worshipSet.create({
      data: {
        teamId: leader.team.id,
        title: "Sunday Service",
        serviceDate: new Date(),
        leaderName: "Someone Stale", // deliberately contradicts the real roster below
      },
    });
    await prisma.setTeamMember.create({ data: { setId: set.id, teamMemberId: selin.id, role: "Worship Leader" } });

    const data = await getDashboardData(leader.team.id, leader.user.id, "LEADER");
    expect(data.nextSunday).not.toBeNull();
    expect(data.nextSunday!.serviceRoster).toEqual([{ role: "Worship Leader", name: "Selin" }]);
    expect(data.nextSunday!.effectiveLeaderName).toBe("Selin");
    expect(data.nextSunday!.leaderName).toBe("Someone Stale"); // raw field preserved, not mutated
  });
});
