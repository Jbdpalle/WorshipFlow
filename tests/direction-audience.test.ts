import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  resolveRosterForSetSong,
  summarizeDirectionAudience,
  getUpcomingRosterForSong,
} from "@/lib/songs/direction-audience";
import { createTestTeam, loginAs, cleanupTeam } from "./helpers";

describe("resolveRosterForSetSong", () => {
  it("a member with a per-song override plays that role, not their whole-set default", () => {
    const roster = resolveRosterForSetSong(
      [{ teamMemberId: "m1", role: "Lead Vocal" }],
      [{ teamMemberId: "m1", role: "Acoustic Guitar" }],
    );
    expect(roster).toEqual([{ teamMemberId: "m1", role: "Lead Vocal" }]);
  });

  it("a member with no override falls back to their whole-set default role(s)", () => {
    const roster = resolveRosterForSetSong(
      [],
      [
        { teamMemberId: "m1", role: "Bass" },
        { teamMemberId: "m2", role: "Drums" },
      ],
    );
    expect(roster.sort((a, b) => a.teamMemberId.localeCompare(b.teamMemberId))).toEqual([
      { teamMemberId: "m1", role: "Bass" },
      { teamMemberId: "m2", role: "Drums" },
    ]);
  });

  it("mixes overridden and non-overridden members correctly", () => {
    const roster = resolveRosterForSetSong(
      [{ teamMemberId: "m1", role: "Worship Leader" }],
      [
        { teamMemberId: "m1", role: "Backing Vocal" }, // overridden — ignored
        { teamMemberId: "m2", role: "Keys" }, // not overridden — kept
      ],
    );
    expect(roster.sort((a, b) => a.teamMemberId.localeCompare(b.teamMemberId))).toEqual([
      { teamMemberId: "m1", role: "Worship Leader" },
      { teamMemberId: "m2", role: "Keys" },
    ]);
  });
});

describe("summarizeDirectionAudience", () => {
  const roster = [
    { teamMemberId: "m1", memberName: "Karthik", role: "Bass", setId: "s1", setTitle: "Sunday" },
    { teamMemberId: "m2", memberName: "Sam", role: "Worship Leader", setId: "s1", setTitle: "Sunday" },
  ];

  it("matches a direction's role to whoever is rostered under that exact role", () => {
    expect(summarizeDirectionAudience("Bass", roster)).toEqual([roster[0]]);
  });

  it("is an exact string match — a near-miss role matches nobody", () => {
    // This is the real root cause of "directions disappear": a direction
    // written for "Vocals" won't match a roster role of "Worship Leader",
    // even though a human would read them as the same thing.
    expect(summarizeDirectionAudience("Vocals", roster)).toEqual([]);
  });

  it("returns an empty list (not an error) when nobody is rostered under that role at all", () => {
    expect(summarizeDirectionAudience("Percussion", roster)).toEqual([]);
  });
});

describe("getUpcomingRosterForSong (integration — reproduces the reported bug)", () => {
  const cleanup: { teamId: string; churchId: string }[] = [];
  afterEach(async () => {
    while (cleanup.length) {
      const c = cleanup.pop()!;
      await cleanupTeam(c.teamId, c.churchId);
    }
  });

  it("a direction's role must exactly match the roster's role string, or it resolves to nobody", async () => {
    const leader = await createTestTeam("audience-mismatch", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    await loginAs(leader.user.id);

    const song = await prisma.song.create({ data: { teamId: leader.team.id, title: "Great Are You Lord" } });
    const member = await prisma.teamMember.create({
      data: { teamId: leader.team.id, name: "Sam", role: "Worship Leader" },
    });
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    const set = await prisma.worshipSet.create({
      data: { teamId: leader.team.id, title: "Sunday Service", serviceDate: tomorrow },
    });
    const setSong = await prisma.setSong.create({ data: { setId: set.id, songId: song.id, order: 0 } });
    // Sam is rostered as "Worship Leader" for the whole service — the
    // normal way someone is added to a set (Worship Team card).
    await prisma.setTeamMember.create({ data: { setId: set.id, teamMemberId: member.id, role: "Worship Leader" } });

    // The leader writes a direction, but picks/types a slightly different
    // role string — e.g. "Lead Vocal" instead of "Worship Leader".
    const roster = await getUpcomingRosterForSong(song.id, leader.team.id);
    expect(summarizeDirectionAudience("Lead Vocal", roster)).toEqual([]); // mismatched — nobody
    expect(summarizeDirectionAudience("Worship Leader", roster)).toEqual([
      { teamMemberId: member.id, memberName: "Sam", role: "Worship Leader", setId: set.id, setTitle: "Sunday Service" },
    ]);

    void setSong; // only needed to create the song-in-set relationship
  });

  it("a song not yet staffed into any upcoming set resolves to an empty roster, not an error", async () => {
    const leader = await createTestTeam("audience-unstaffed", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    await loginAs(leader.user.id);

    const song = await prisma.song.create({ data: { teamId: leader.team.id, title: "Draft Song" } });
    const roster = await getUpcomingRosterForSong(song.id, leader.team.id);
    expect(roster).toEqual([]);
  });

  it("ignores past services and archived sets — only upcoming, active ones count", async () => {
    const leader = await createTestTeam("audience-past", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    await loginAs(leader.user.id);

    const song = await prisma.song.create({ data: { teamId: leader.team.id, title: "Old Song" } });
    const member = await prisma.teamMember.create({ data: { teamId: leader.team.id, name: "Karthik", role: "Bass" } });
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const pastSet = await prisma.worshipSet.create({
      data: { teamId: leader.team.id, title: "Last Sunday", serviceDate: lastWeek },
    });
    await prisma.setSong.create({ data: { setId: pastSet.id, songId: song.id, order: 0 } });
    await prisma.setTeamMember.create({ data: { setId: pastSet.id, teamMemberId: member.id, role: "Bass" } });

    const roster = await getUpcomingRosterForSong(song.id, leader.team.id);
    expect(roster).toEqual([]);
  });

  it("never leaks another team's roster (tenant isolation)", async () => {
    const leaderA = await createTestTeam("audience-tenant-a", "LEADER");
    const leaderB = await createTestTeam("audience-tenant-b", "LEADER");
    cleanup.push({ teamId: leaderA.team.id, churchId: leaderA.church.id });
    cleanup.push({ teamId: leaderB.team.id, churchId: leaderB.church.id });

    const song = await prisma.song.create({ data: { teamId: leaderA.team.id, title: "Shared-named Song" } });
    const member = await prisma.teamMember.create({ data: { teamId: leaderA.team.id, name: "Karthik", role: "Bass" } });
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const set = await prisma.worshipSet.create({
      data: { teamId: leaderA.team.id, title: "Sunday", serviceDate: nextWeek },
    });
    await prisma.setSong.create({ data: { setId: set.id, songId: song.id, order: 0 } });
    await prisma.setTeamMember.create({ data: { setId: set.id, teamMemberId: member.id, role: "Bass" } });

    // Query scoped to team B should see nothing from team A's song/roster.
    const roster = await getUpcomingRosterForSong(song.id, leaderB.team.id);
    expect(roster).toEqual([]);
  });
});
