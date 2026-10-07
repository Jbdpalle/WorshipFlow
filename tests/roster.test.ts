import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { generateWeeklyServices, copyRosterToSet } from "@/lib/actions/roster";
import { getRosterPageData } from "@/lib/dashboard/data";
import { createTestTeam, loginAs, cleanupTeam } from "./helpers";

describe("generateWeeklyServices", () => {
  const cleanup: { teamId: string; churchId: string }[] = [];
  afterEach(async () => {
    while (cleanup.length) {
      const c = cleanup.pop()!;
      await cleanupTeam(c.teamId, c.churchId);
    }
  });

  it("creates one service per matching weekday in the range, nearest first", async () => {
    const leader = await createTestTeam("roster-gen-basic", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    await loginAs(leader.user.id);

    // A fixed 4-week range starting on a known Sunday (2026-10-04).
    const result = await generateWeeklyServices({
      startDate: "2026-10-04",
      endDate: "2026-10-25",
      weekday: 0, // Sunday
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.created).toHaveLength(4);
    expect(result.data.skippedExisting).toBe(0);

    const entries = await getRosterPageData(leader.team.id);
    // getRosterPageData only returns today-forward, so just check ordering
    // directly via the raw created list instead of assuming "today".
    const dates = result.data.created.map((c) => c.serviceDate);
    const sorted = [...dates].sort();
    expect(dates).toEqual(sorted);
    void entries;
  });

  it("skips dates that already have a service instead of creating a duplicate", async () => {
    const leader = await createTestTeam("roster-gen-dedupe", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    await loginAs(leader.user.id);

    await prisma.worshipSet.create({
      data: { teamId: leader.team.id, title: "Already Scheduled", serviceDate: new Date(2026, 9, 11) },
    });

    const result = await generateWeeklyServices({
      startDate: "2026-10-04",
      endDate: "2026-10-18",
      weekday: 0,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.created).toHaveLength(2); // Oct 4 and Oct 18
    expect(result.data.skippedExisting).toBe(1); // Oct 11

    const total = await prisma.worshipSet.count({ where: { teamId: leader.team.id } });
    expect(total).toBe(3); // 1 pre-existing + 2 newly created, never 4
  });

  it("rejects a MEMBER", async () => {
    const member = await createTestTeam("roster-gen-member-blocked", "MEMBER");
    cleanup.push({ teamId: member.team.id, churchId: member.church.id });
    await loginAs(member.user.id);

    const result = await generateWeeklyServices({ startDate: "2026-10-04", endDate: "2026-10-18", weekday: 0 });
    expect(result.ok).toBe(false);
    expect(await prisma.worshipSet.count({ where: { teamId: member.team.id } })).toBe(0);
  });

  it("rejects an invalid range (end before start)", async () => {
    const leader = await createTestTeam("roster-gen-bad-range", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    await loginAs(leader.user.id);

    const result = await generateWeeklyServices({ startDate: "2026-10-18", endDate: "2026-10-04", weekday: 0 });
    expect(result.ok).toBe(false);
  });
});

describe("copyRosterToSet", () => {
  const cleanup: { teamId: string; churchId: string }[] = [];
  afterEach(async () => {
    while (cleanup.length) {
      const c = cleanup.pop()!;
      await cleanupTeam(c.teamId, c.churchId);
    }
  });

  it("copies the roster onto the target and leaves the source unchanged", async () => {
    const leader = await createTestTeam("roster-copy-basic", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    await loginAs(leader.user.id);

    const selin = await prisma.teamMember.create({ data: { teamId: leader.team.id, name: "Selin", role: "Worship Leader" } });
    const joel = await prisma.teamMember.create({ data: { teamId: leader.team.id, name: "Joel", role: "Bass" } });
    const from = await prisma.worshipSet.create({ data: { teamId: leader.team.id, title: "Oct 11", serviceDate: new Date(2026, 9, 11) } });
    const to = await prisma.worshipSet.create({ data: { teamId: leader.team.id, title: "Oct 18", serviceDate: new Date(2026, 9, 18) } });
    await prisma.setTeamMember.create({ data: { setId: from.id, teamMemberId: selin.id, role: "Worship Leader" } });
    await prisma.setTeamMember.create({ data: { setId: from.id, teamMemberId: joel.id, role: "Bass" } });

    const result = await copyRosterToSet(from.id, to.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.copied).toBe(2);

    const toRows = await prisma.setTeamMember.findMany({ where: { setId: to.id } });
    expect(toRows).toHaveLength(2);
    const fromRows = await prisma.setTeamMember.findMany({ where: { setId: from.id } });
    expect(fromRows).toHaveLength(2); // source untouched
  });

  it("merges without overwriting an assignment the target already has", async () => {
    const leader = await createTestTeam("roster-copy-merge", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    await loginAs(leader.user.id);

    const joel = await prisma.teamMember.create({ data: { teamId: leader.team.id, name: "Joel", role: "Bass" } });
    const sunil = await prisma.teamMember.create({ data: { teamId: leader.team.id, name: "Sunil", role: "Acoustic Guitar" } });
    const from = await prisma.worshipSet.create({ data: { teamId: leader.team.id, title: "Oct 11", serviceDate: new Date(2026, 9, 11) } });
    const to = await prisma.worshipSet.create({ data: { teamId: leader.team.id, title: "Oct 18", serviceDate: new Date(2026, 9, 18) } });
    await prisma.setTeamMember.create({ data: { setId: from.id, teamMemberId: joel.id, role: "Bass" } });
    await prisma.setTeamMember.create({ data: { setId: from.id, teamMemberId: sunil.id, role: "Acoustic Guitar" } });
    // Target already has Joel on Electric Guitar for a different role on the same date.
    await prisma.setTeamMember.create({ data: { setId: to.id, teamMemberId: joel.id, role: "Electric Guitar" } });

    const result = await copyRosterToSet(from.id, to.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.copied).toBe(2); // Joel-Bass and Sunil-Acoustic both new keys

    const toRows = await prisma.setTeamMember.findMany({ where: { setId: to.id } });
    expect(toRows).toHaveLength(3); // Joel/Electric (untouched) + Joel/Bass + Sunil/Acoustic
    expect(toRows.some((r) => r.teamMemberId === joel.id && r.role === "Electric Guitar")).toBe(true);
  });

  it("rejects a MEMBER and enforces tenant isolation", async () => {
    const leaderA = await createTestTeam("roster-copy-tenant-a", "LEADER");
    const leaderB = await createTestTeam("roster-copy-tenant-b", "LEADER");
    cleanup.push({ teamId: leaderA.team.id, churchId: leaderA.church.id });
    cleanup.push({ teamId: leaderB.team.id, churchId: leaderB.church.id });

    const setA = await prisma.worshipSet.create({ data: { teamId: leaderA.team.id, title: "Team A Set", serviceDate: new Date(2026, 9, 11) } });
    const setB = await prisma.worshipSet.create({ data: { teamId: leaderB.team.id, title: "Team B Set", serviceDate: new Date(2026, 9, 11) } });

    await loginAs(leaderA.user.id);
    const crossTeam = await copyRosterToSet(setA.id, setB.id);
    expect(crossTeam.ok).toBe(false);

    const member = await createTestTeam("roster-copy-member-blocked", "MEMBER");
    cleanup.push({ teamId: member.team.id, churchId: member.church.id });
    const setC = await prisma.worshipSet.create({ data: { teamId: member.team.id, title: "Set C", serviceDate: new Date(2026, 9, 11) } });
    const setD = await prisma.worshipSet.create({ data: { teamId: member.team.id, title: "Set D", serviceDate: new Date(2026, 9, 18) } });
    await loginAs(member.user.id);
    const memberBlocked = await copyRosterToSet(setC.id, setD.id);
    expect(memberBlocked.ok).toBe(false);
  });
});
