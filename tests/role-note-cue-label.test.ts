import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { upsertRoleNote } from "@/lib/actions/songs";
import { createTestTeam, loginAs, cleanupTeam } from "./helpers";

// cueLabel is the free-text line/phrase/count-in anchor a leader can
// optionally attach to a direction (e.g. "Line 3", "Count-in 4-3-2-1") —
// never required, never bar/beat-precise, preserved exactly as typed.
describe("upsertRoleNote cueLabel", () => {
  const cleanup: { teamId: string; churchId: string }[] = [];
  afterEach(async () => {
    while (cleanup.length) {
      const c = cleanup.pop()!;
      await cleanupTeam(c.teamId, c.churchId);
    }
  });

  it("saves and preserves a cue label exactly as typed", async () => {
    const leader = await createTestTeam("cue-label-save", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    await loginAs(leader.user.id);

    const song = await prisma.song.create({ data: { teamId: leader.team.id, title: "A Song" } });
    const verse1 = await prisma.songSection.create({ data: { songId: song.id, label: "Verse 1", order: 0 } });

    const result = await upsertRoleNote(verse1.id, "Worship Leader", "Sing alone.", song.id, {
      cueLabel: "Line 1-2",
    });
    expect(result.ok).toBe(true);

    const note = await prisma.songRoleNote.findFirstOrThrow({ where: { sectionId: verse1.id, role: "Worship Leader" } });
    expect(note.cueLabel).toBe("Line 1-2");
  });

  it("is optional — omitting it leaves cueLabel null", async () => {
    const leader = await createTestTeam("cue-label-omit", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    await loginAs(leader.user.id);

    const song = await prisma.song.create({ data: { teamId: leader.team.id, title: "A Song" } });
    const verse1 = await prisma.songSection.create({ data: { songId: song.id, label: "Verse 1", order: 0 } });

    await upsertRoleNote(verse1.id, "Bass", "Root notes.", song.id);
    const note = await prisma.songRoleNote.findFirstOrThrow({ where: { sectionId: verse1.id, role: "Bass" } });
    expect(note.cueLabel).toBeNull();
  });

  it("can be updated independently of the direction's content", async () => {
    const leader = await createTestTeam("cue-label-update", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    await loginAs(leader.user.id);

    const song = await prisma.song.create({ data: { teamId: leader.team.id, title: "A Song" } });
    const verse1 = await prisma.songSection.create({ data: { songId: song.id, label: "Verse 1", order: 0 } });

    await upsertRoleNote(verse1.id, "Drums", "Build gradually.", song.id, { cueLabel: "Count-in 4-3-2-1" });
    await upsertRoleNote(verse1.id, "Drums", "Build gradually.", song.id, { cueLabel: "On the downbeat" });

    const note = await prisma.songRoleNote.findFirstOrThrow({ where: { sectionId: verse1.id, role: "Drums" } });
    expect(note.cueLabel).toBe("On the downbeat");
    expect(note.content).toBe("Build gradually.");
  });

  it("blank cue label is stored as null, not an empty string", async () => {
    const leader = await createTestTeam("cue-label-blank", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    await loginAs(leader.user.id);

    const song = await prisma.song.create({ data: { teamId: leader.team.id, title: "A Song" } });
    const verse1 = await prisma.songSection.create({ data: { songId: song.id, label: "Verse 1", order: 0 } });

    await upsertRoleNote(verse1.id, "Keys", "Pad.", song.id, { cueLabel: "   " });
    const note = await prisma.songRoleNote.findFirstOrThrow({ where: { sectionId: verse1.id, role: "Keys" } });
    expect(note.cueLabel).toBeNull();
  });
});
