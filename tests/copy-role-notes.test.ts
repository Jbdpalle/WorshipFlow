import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { copyRoleNotes } from "@/lib/actions/songs";
import { createTestTeam, loginAs, cleanupTeam } from "./helpers";

async function createSongWithTwoSections(teamId: string) {
  const song = await prisma.song.create({ data: { teamId, title: "Test Song" } });
  const verse1 = await prisma.songSection.create({ data: { songId: song.id, label: "Verse 1", order: 0 } });
  const verse2 = await prisma.songSection.create({ data: { songId: song.id, label: "Verse 2", order: 1 } });
  return { song, verse1, verse2 };
}

describe("copyRoleNotes", () => {
  const cleanup: { teamId: string; churchId: string }[] = [];
  afterEach(async () => {
    while (cleanup.length) {
      const c = cleanup.pop()!;
      await cleanupTeam(c.teamId, c.churchId);
    }
  });

  it("copies every direction from the source section onto the destination", async () => {
    const leader = await createTestTeam("copy-leader", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    const { song, verse1, verse2 } = await createSongWithTwoSections(leader.team.id);

    await prisma.songRoleNote.create({
      data: { sectionId: verse1.id, role: "Electric Guitar", content: "8ths · Swells", visibility: "TEAM" },
    });
    await prisma.songRoleNote.create({
      data: { sectionId: verse1.id, role: "Drums", content: "Kick only", visibility: "TEAM" },
    });

    await loginAs(leader.user.id);
    const result = await copyRoleNotes(verse1.id, verse2.id, song.id);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual({ copied: 2, skipped: 0 });

    const copied = await prisma.songRoleNote.findMany({ where: { sectionId: verse2.id }, orderBy: { role: "asc" } });
    expect(copied).toHaveLength(2);
    expect(copied.find((n) => n.role === "Electric Guitar")?.content).toBe("8ths · Swells");
    expect(copied.find((n) => n.role === "Drums")?.content).toBe("Kick only");

    // The source section is untouched.
    const source = await prisma.songRoleNote.findMany({ where: { sectionId: verse1.id } });
    expect(source).toHaveLength(2);
  });

  it("never overwrites a direction that already exists at the destination", async () => {
    const leader = await createTestTeam("copy-no-clobber", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    const { song, verse1, verse2 } = await createSongWithTwoSections(leader.team.id);

    await prisma.songRoleNote.create({
      data: { sectionId: verse1.id, role: "Keys", content: "Pad, soft", visibility: "TEAM" },
    });
    // The leader already wrote something different for Keys on Verse 2.
    await prisma.songRoleNote.create({
      data: { sectionId: verse2.id, role: "Keys", content: "Full strings, build", visibility: "TEAM" },
    });

    await loginAs(leader.user.id);
    const result = await copyRoleNotes(verse1.id, verse2.id, song.id);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual({ copied: 0, skipped: 1 });

    const destinationNote = await prisma.songRoleNote.findFirst({ where: { sectionId: verse2.id, role: "Keys" } });
    expect(destinationNote?.content).toBe("Full strings, build");
  });

  it("is rejected for sections belonging to a different team", async () => {
    const leaderA = await createTestTeam("copy-tenant-a", "LEADER");
    const leaderB = await createTestTeam("copy-tenant-b", "LEADER");
    cleanup.push({ teamId: leaderA.team.id, churchId: leaderA.church.id });
    cleanup.push({ teamId: leaderB.team.id, churchId: leaderB.church.id });

    const { verse1 } = await createSongWithTwoSections(leaderA.team.id);
    const { song: songB, verse1: verse1B } = await createSongWithTwoSections(leaderB.team.id);

    await loginAs(leaderA.user.id);
    const result = await copyRoleNotes(verse1.id, verse1B.id, songB.id);

    expect(result.ok).toBe(false);
  });
});
