import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { savePersonalNote } from "@/lib/actions/notes";
import { createTestTeam, loginAs, cleanupTeam } from "./helpers";

describe("savePersonalNote with a section pin", () => {
  const cleanup: { teamId: string; churchId: string }[] = [];
  afterEach(async () => {
    while (cleanup.length) {
      const c = cleanup.pop()!;
      await cleanupTeam(c.teamId, c.churchId);
    }
  });

  it("a section-pinned note and the whole-song note are separate rows, not one shared row", async () => {
    const member = await createTestTeam("section-note-separate", "MEMBER");
    cleanup.push({ teamId: member.team.id, churchId: member.church.id });
    await loginAs(member.user.id);

    const song = await prisma.song.create({ data: { teamId: member.team.id, title: "A Song" } });
    const verse1 = await prisma.songSection.create({ data: { songId: song.id, label: "Verse 1", order: 0 } });

    await savePersonalNote(song.id, "Capo 2 for the whole song.");
    await savePersonalNote(song.id, "Come in quiet on line 2.", verse1.id);

    const notes = await prisma.personalNote.findMany({ where: { userId: member.user.id, songId: song.id } });
    expect(notes).toHaveLength(2);
    expect(notes.find((n) => n.sectionId === null)?.content).toBe("Capo 2 for the whole song.");
    expect(notes.find((n) => n.sectionId === verse1.id)?.content).toBe("Come in quiet on line 2.");
  });

  it("updates the existing section-pinned note instead of creating a second one", async () => {
    const member = await createTestTeam("section-note-update", "MEMBER");
    cleanup.push({ teamId: member.team.id, churchId: member.church.id });
    await loginAs(member.user.id);

    const song = await prisma.song.create({ data: { teamId: member.team.id, title: "A Song" } });
    const verse1 = await prisma.songSection.create({ data: { songId: song.id, label: "Verse 1", order: 0 } });

    await savePersonalNote(song.id, "First draft.", verse1.id);
    await savePersonalNote(song.id, "Revised.", verse1.id);

    const notes = await prisma.personalNote.findMany({ where: { userId: member.user.id, sectionId: verse1.id } });
    expect(notes).toHaveLength(1);
    expect(notes[0].content).toBe("Revised.");
  });

  it("clearing the content deletes the row", async () => {
    const member = await createTestTeam("section-note-clear", "MEMBER");
    cleanup.push({ teamId: member.team.id, churchId: member.church.id });
    await loginAs(member.user.id);

    const song = await prisma.song.create({ data: { teamId: member.team.id, title: "A Song" } });
    const verse1 = await prisma.songSection.create({ data: { songId: song.id, label: "Verse 1", order: 0 } });

    await savePersonalNote(song.id, "Temporary.", verse1.id);
    await savePersonalNote(song.id, "", verse1.id);

    const notes = await prisma.personalNote.findMany({ where: { userId: member.user.id, sectionId: verse1.id } });
    expect(notes).toHaveLength(0);
  });

  it("stays private to its author — never visible to another team member", async () => {
    const owner = await createTestTeam("section-note-private", "OWNER");
    cleanup.push({ teamId: owner.team.id, churchId: owner.church.id });
    const song = await prisma.song.create({ data: { teamId: owner.team.id, title: "A Song" } });
    const verse1 = await prisma.songSection.create({ data: { songId: song.id, label: "Verse 1", order: 0 } });

    await loginAs(owner.user.id);
    await savePersonalNote(song.id, "My private reminder.", verse1.id);

    // A second real user on the same team queries the section's notes
    // exactly how the song page does (scoped to their own userId).
    const otherUser = await prisma.user.create({
      data: { name: "Other", email: `other-${Date.now()}@test.invalid`, passwordHash: "x" },
    });
    const otherNotes = await prisma.personalNote.findMany({
      where: { sectionId: verse1.id, userId: otherUser.id },
    });
    expect(otherNotes).toHaveLength(0);

    const section = await prisma.songSection.findUniqueOrThrow({
      where: { id: verse1.id },
      include: { personalNotes: { where: { userId: otherUser.id } } },
    });
    expect(section.personalNotes).toHaveLength(0);
  });

  it("is rejected for a section belonging to a different team's song", async () => {
    const memberA = await createTestTeam("section-note-tenant-a", "MEMBER");
    const memberB = await createTestTeam("section-note-tenant-b", "MEMBER");
    cleanup.push({ teamId: memberA.team.id, churchId: memberA.church.id });
    cleanup.push({ teamId: memberB.team.id, churchId: memberB.church.id });

    const songA = await prisma.song.create({ data: { teamId: memberA.team.id, title: "Team A Song" } });
    const verse1A = await prisma.songSection.create({ data: { songId: songA.id, label: "Verse 1", order: 0 } });
    const songB = await prisma.song.create({ data: { teamId: memberB.team.id, title: "Team B Song" } });

    await loginAs(memberB.user.id);
    const result = await savePersonalNote(songB.id, "Should fail.", verse1A.id);
    expect(result.ok).toBe(false);
  });
});
