import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { importRosterFromSpreadsheet } from "@/lib/actions/roster-import";
import { createTestTeam, loginAs, cleanupTeam } from "./helpers";
import type { RosterRow } from "@/lib/songs/roster-import";

// importRosterFromSpreadsheet parses a real file upload; these tests drive
// the underlying row-processing behavior directly through a synthetic CSV
// buffer built from RosterRow-shaped data, so each test stays focused on
// one matching/creation rule rather than file-format parsing (already
// covered by lib/songs/roster-import.ts's own concerns).
function csvFromRows(rows: RosterRow[]): Buffer {
  const lines = ["Name,Role,Date", ...rows.map((r) => `${r.name},${r.role},${r.dateText ?? ""}`)];
  return Buffer.from(lines.join("\n"), "utf-8");
}

function formDataFor(buffer: Buffer, filename = "roster.csv"): FormData {
  const fd = new FormData();
  fd.set("file", new File([Uint8Array.from(buffer)], filename, { type: "text/csv" }));
  return fd;
}

describe("importRosterFromSpreadsheet", () => {
  const cleanup: { teamId: string; churchId: string }[] = [];
  afterEach(async () => {
    while (cleanup.length) {
      const c = cleanup.pop()!;
      await cleanupTeam(c.teamId, c.churchId);
    }
  });

  it("creates a service for a date with no existing set, and writes the roster to SetTeamMember", async () => {
    const leader = await createTestTeam("roster-autocreate", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    await loginAs(leader.user.id);

    const fd = formDataFor(
      csvFromRows([
        { name: "Selin", role: "Worship Leader", dateText: "2026-10-11" },
        { name: "Sunil", role: "Acoustic Guitar", dateText: "2026-10-11" },
      ]),
    );
    const result = await importRosterFromSpreadsheet(fd);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.servicesCreated).toBe(1);
    expect(result.data.membersCreated).toBe(2);
    expect(result.data.assignmentsCreated).toBe(2);

    const set = await prisma.worshipSet.findFirst({ where: { teamId: leader.team.id } });
    expect(set).not.toBeNull();
    expect(set!.serviceDate?.toISOString().slice(0, 10)).toBe("2026-10-11");

    const roster = await prisma.setTeamMember.findMany({
      where: { setId: set!.id },
      include: { teamMember: true },
    });
    expect(roster).toHaveLength(2);
    expect(roster.some((r) => r.teamMember.name === "Selin" && r.role === "Worship Leader")).toBe(true);
    expect(roster.some((r) => r.teamMember.name === "Sunil" && r.role === "Acoustic Guitar")).toBe(true);

    // Assignments went to SetTeamMember, never SongAssignment (no songs exist yet).
    const songAssignments = await prisma.songAssignment.findMany({
      where: { teamMember: { teamId: leader.team.id } },
    });
    expect(songAssignments).toHaveLength(0);
  });

  it("does not drop a role when the same person serves two roles on the same date", async () => {
    const leader = await createTestTeam("roster-dual-role", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    await loginAs(leader.user.id);

    const fd = formDataFor(
      csvFromRows([
        { name: "Joe", role: "Worship Leader", dateText: "2026-10-04" },
        { name: "Joe", role: "Acoustic Guitar", dateText: "2026-10-04" },
      ]),
    );
    const result = await importRosterFromSpreadsheet(fd);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const set = await prisma.worshipSet.findFirst({ where: { teamId: leader.team.id } });
    const roster = await prisma.setTeamMember.findMany({ where: { setId: set!.id } });
    expect(roster).toHaveLength(2);
    expect(roster.map((r) => r.role).sort()).toEqual(["Acoustic Guitar", "Worship Leader"]);
  });

  it("matches an existing team member by first-name prefix instead of creating a duplicate", async () => {
    const leader = await createTestTeam("roster-prefix-match", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    const joel = await prisma.teamMember.create({
      data: { teamId: leader.team.id, name: "Joel Palle", role: "Bass" },
    });
    await loginAs(leader.user.id);

    const fd = formDataFor(csvFromRows([{ name: "Joel", role: "Bass", dateText: "2026-10-11" }]));
    const result = await importRosterFromSpreadsheet(fd);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.membersCreated).toBe(0);

    const members = await prisma.teamMember.findMany({ where: { teamId: leader.team.id } });
    expect(members).toHaveLength(1);
    expect(members[0].id).toBe(joel.id);

    const roster = await prisma.setTeamMember.findMany({ where: { teamMemberId: joel.id } });
    expect(roster).toHaveLength(1);
  });

  it("flags an ambiguous name match for review instead of guessing or duplicating", async () => {
    const leader = await createTestTeam("roster-ambiguous", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    await prisma.teamMember.create({ data: { teamId: leader.team.id, name: "Joel Palle", role: "Bass" } });
    await prisma.teamMember.create({ data: { teamId: leader.team.id, name: "Joel Martinez", role: "Keys" } });
    await loginAs(leader.user.id);

    const fd = formDataFor(csvFromRows([{ name: "Joel", role: "Bass", dateText: "2026-10-11" }]));
    const result = await importRosterFromSpreadsheet(fd);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.membersCreated).toBe(0);
    expect(result.data.assignmentsCreated).toBe(0);
    expect(result.data.needsReview).toHaveLength(1);
    expect(result.data.needsReview[0].reason).toBe("ambiguous");

    const members = await prisma.teamMember.findMany({ where: { teamId: leader.team.id } });
    expect(members).toHaveLength(2); // no duplicate "Joel" created
  });

  it("reuses an existing service for the date instead of creating a second one", async () => {
    const leader = await createTestTeam("roster-reuse-set", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    const existingSet = await prisma.worshipSet.create({
      data: { teamId: leader.team.id, title: "Sunday Service", serviceDate: new Date(2026, 9, 11) },
    });
    await loginAs(leader.user.id);

    const fd = formDataFor(csvFromRows([{ name: "Selin", role: "Worship Leader", dateText: "2026-10-11" }]));
    const result = await importRosterFromSpreadsheet(fd);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.servicesCreated).toBe(0);

    const sets = await prisma.worshipSet.findMany({ where: { teamId: leader.team.id } });
    expect(sets).toHaveLength(1);
    expect(sets[0].id).toBe(existingSet.id);
  });

  it("is rejected for a MEMBER session (Leader-only action, enforced server-side)", async () => {
    const member = await createTestTeam("roster-member-blocked", "MEMBER");
    cleanup.push({ teamId: member.team.id, churchId: member.church.id });
    await loginAs(member.user.id);

    const fd = formDataFor(csvFromRows([{ name: "Someone", role: "Bass", dateText: "2026-10-11" }]));
    const result = await importRosterFromSpreadsheet(fd);

    expect(result.ok).toBe(false);
    const members = await prisma.teamMember.findMany({ where: { teamId: member.team.id } });
    expect(members).toHaveLength(0);
  });
});
