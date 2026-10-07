import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { getMyRosterData } from "@/lib/dashboard/data";
import { createTestTeam, cleanupTeam } from "./helpers";

describe("getMyRosterData", () => {
  const cleanup: { teamId: string; churchId: string }[] = [];
  afterEach(async () => {
    while (cleanup.length) {
      const c = cleanup.pop()!;
      await cleanupTeam(c.teamId, c.churchId);
    }
  });

  it("shows an upcoming assignment even when the service has no songs yet", async () => {
    const leader = await createTestTeam("my-roster-no-songs", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });

    const joel = await prisma.teamMember.create({ data: { teamId: leader.team.id, name: "Joel", role: "Bass" } });
    const future = new Date();
    future.setDate(future.getDate() + 7);
    const set = await prisma.worshipSet.create({
      data: { teamId: leader.team.id, title: "Next Sunday", serviceDate: future },
    });
    await prisma.setTeamMember.create({ data: { setId: set.id, teamMemberId: joel.id, role: "Bass" } });
    // Deliberately no SetSong rows — this is the whole point of the test.

    const result = await getMyRosterData(joel.id);
    expect(result.upcoming).toHaveLength(1);
    expect(result.upcoming[0].roles).toEqual(["Bass"]);
    expect(result.recent).toHaveLength(0);
  });

  it("caps recent/past assignments to the last two, without deleting older ones", async () => {
    const leader = await createTestTeam("my-roster-recent-cap", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });

    const joel = await prisma.teamMember.create({ data: { teamId: leader.team.id, name: "Joel", role: "Bass" } });
    const pastDates = [28, 21, 14, 7].map((daysAgo) => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      return d;
    });
    for (const [i, date] of pastDates.entries()) {
      const set = await prisma.worshipSet.create({
        data: { teamId: leader.team.id, title: `Past Service ${i}`, serviceDate: date },
      });
      await prisma.setTeamMember.create({ data: { setId: set.id, teamMemberId: joel.id, role: "Bass" } });
    }

    const result = await getMyRosterData(joel.id);
    expect(result.recent).toHaveLength(2);
    // Most recent past first.
    expect(result.recent[0].title).toBe("Past Service 3");
    expect(result.recent[1].title).toBe("Past Service 2");

    // The older two rows are still in the database — this is a view limit,
    // not a deletion.
    const allRows = await prisma.setTeamMember.count({ where: { teamMemberId: joel.id } });
    expect(allRows).toBe(4);
  });

  it("groups multiple roles on the same service into one row", async () => {
    const leader = await createTestTeam("my-roster-multi-role", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });

    const joel = await prisma.teamMember.create({ data: { teamId: leader.team.id, name: "Joel", role: "Bass" } });
    const future = new Date();
    future.setDate(future.getDate() + 7);
    const set = await prisma.worshipSet.create({
      data: { teamId: leader.team.id, title: "Service", serviceDate: future },
    });
    await prisma.setTeamMember.create({ data: { setId: set.id, teamMemberId: joel.id, role: "Bass" } });
    await prisma.setTeamMember.create({ data: { setId: set.id, teamMemberId: joel.id, role: "Backing Vocal" } });

    const result = await getMyRosterData(joel.id);
    expect(result.upcoming).toHaveLength(1);
    expect(result.upcoming[0].roles.sort()).toEqual(["Backing Vocal", "Bass"]);
  });

  it("never shows a musical role equal to the account/membership role", async () => {
    // Joel's TeamMember.role (display default) is "Bass"; this test asserts
    // getMyRosterData only ever reports the actual SetTeamMember role, with
    // no path that could leak an account-level role (OWNER/ADMIN/LEADER/
    // MEMBER) into this result.
    const leader = await createTestTeam("my-roster-account-vs-musical", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });

    const joel = await prisma.teamMember.create({
      data: { teamId: leader.team.id, userId: leader.user.id, name: "Joel", role: "Bass" },
    });
    const future = new Date();
    future.setDate(future.getDate() + 7);
    const set = await prisma.worshipSet.create({
      data: { teamId: leader.team.id, title: "Service", serviceDate: future },
    });
    await prisma.setTeamMember.create({ data: { setId: set.id, teamMemberId: joel.id, role: "Bass" } });

    const result = await getMyRosterData(joel.id);
    expect(result.upcoming[0].roles).toEqual(["Bass"]);
    expect(result.upcoming[0].roles).not.toContain("LEADER");
    expect(result.upcoming[0].roles).not.toContain("OWNER");
  });
});
