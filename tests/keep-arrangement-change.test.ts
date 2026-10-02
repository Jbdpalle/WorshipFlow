import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { keepArrangementChange } from "@/lib/actions/rehearsal";
import { createTestTeam, loginAs, cleanupTeam } from "./helpers";

async function createSongWithSectionAndChange(teamId: string) {
  const song = await prisma.song.create({ data: { teamId, title: "Test Song" } });
  const section = await prisma.songSection.create({
    data: { songId: song.id, label: "Verse 1", order: 0 },
  });
  const change = await prisma.arrangementChange.create({
    data: {
      songId: song.id,
      sectionId: section.id,
      role: "Keys",
      proposedContent: "Play it softer going into the bridge",
    },
  });
  return { song, section, change };
}

describe("keepArrangementChange", () => {
  const cleanup: { teamId: string; churchId: string }[] = [];
  afterEach(async () => {
    while (cleanup.length) {
      const c = cleanup.pop()!;
      await cleanupTeam(c.teamId, c.churchId);
    }
  });

  it("rejects a non-leader role, leaving the change PROPOSED and no SongRoleNote created", async () => {
    const member = await createTestTeam("keep-member", "MEMBER");
    cleanup.push({ teamId: member.team.id, churchId: member.church.id });
    const { section, change } = await createSongWithSectionAndChange(member.team.id);

    await loginAs(member.user.id);
    const result = await keepArrangementChange(change.id);

    expect(result.ok).toBe(false);

    const unchanged = await prisma.arrangementChange.findUnique({ where: { id: change.id } });
    expect(unchanged?.status).toBe("PROPOSED");

    const note = await prisma.songRoleNote.findFirst({ where: { sectionId: section.id, role: "Keys" } });
    expect(note).toBeNull();
  });

  it("for a leader, mutates SongRoleNote.content and marks the change KEPT", async () => {
    const leader = await createTestTeam("keep-leader", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    const { section, change } = await createSongWithSectionAndChange(leader.team.id);

    await loginAs(leader.user.id);
    const result = await keepArrangementChange(change.id);

    expect(result.ok).toBe(true);

    const kept = await prisma.arrangementChange.findUnique({ where: { id: change.id } });
    expect(kept?.status).toBe("KEPT");

    const note = await prisma.songRoleNote.findFirst({ where: { sectionId: section.id, role: "Keys" } });
    expect(note?.content).toBe("Play it softer going into the bridge");
    expect(note?.teamMemberId).toBeNull();
  });
});
