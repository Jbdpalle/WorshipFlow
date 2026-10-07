import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { getSetsPageData } from "@/lib/dashboard/data";
import { createTestTeam, cleanupTeam } from "./helpers";

describe("getSetsPageData", () => {
  const cleanup: { teamId: string; churchId: string }[] = [];
  afterEach(async () => {
    while (cleanup.length) {
      const c = cleanup.pop()!;
      await cleanupTeam(c.teamId, c.churchId);
    }
  });

  it("returns sets ordered nearest-date-first, not farthest-first", async () => {
    const leader = await createTestTeam("sets-nearest-first", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });

    await prisma.worshipSet.create({
      data: { teamId: leader.team.id, title: "Far", serviceDate: new Date(2026, 11, 20) },
    });
    await prisma.worshipSet.create({
      data: { teamId: leader.team.id, title: "Near", serviceDate: new Date(2026, 9, 11) },
    });
    await prisma.worshipSet.create({
      data: { teamId: leader.team.id, title: "Mid", serviceDate: new Date(2026, 10, 15) },
    });

    const entries = await getSetsPageData(leader.team.id, false);
    expect(entries.map((e) => e.title)).toEqual(["Near", "Mid", "Far"]);
  });

  it("includes undated sets and tenant-isolates results", async () => {
    const teamA = await createTestTeam("sets-tenant-a", "LEADER");
    const teamB = await createTestTeam("sets-tenant-b", "LEADER");
    cleanup.push({ teamId: teamA.team.id, churchId: teamA.church.id });
    cleanup.push({ teamId: teamB.team.id, churchId: teamB.church.id });

    await prisma.worshipSet.create({ data: { teamId: teamA.team.id, title: "A Undated" } });
    await prisma.worshipSet.create({ data: { teamId: teamB.team.id, title: "B Set", serviceDate: new Date(2026, 9, 11) } });

    const entries = await getSetsPageData(teamA.team.id, false);
    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe("A Undated");
    expect(entries[0].serviceDate).toBeNull();
  });

  it("excludes archived sets by default, includes them when requested", async () => {
    const leader = await createTestTeam("sets-archived-split", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });

    await prisma.worshipSet.create({ data: { teamId: leader.team.id, title: "Active" } });
    await prisma.worshipSet.create({
      data: { teamId: leader.team.id, title: "Archived", archivedAt: new Date() },
    });

    const active = await getSetsPageData(leader.team.id, false);
    expect(active.map((e) => e.title)).toEqual(["Active"]);

    const archived = await getSetsPageData(leader.team.id, true);
    expect(archived.map((e) => e.title)).toEqual(["Archived"]);
  });

  it("includes the worship leader name in roster for grouping", async () => {
    const leader = await createTestTeam("sets-roster-leader", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });

    const selin = await prisma.teamMember.create({
      data: { teamId: leader.team.id, name: "Selin", role: "Worship Leader" },
    });
    const set = await prisma.worshipSet.create({
      data: { teamId: leader.team.id, title: "Service", serviceDate: new Date(2026, 9, 11) },
    });
    await prisma.setTeamMember.create({ data: { setId: set.id, teamMemberId: selin.id, role: "Worship Leader" } });

    const entries = await getSetsPageData(leader.team.id, false);
    expect(entries[0].roster).toEqual([{ role: "Worship Leader", name: "Selin" }]);
  });
});
