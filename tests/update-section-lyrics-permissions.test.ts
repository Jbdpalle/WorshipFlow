import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { updateSectionLyrics } from "@/lib/actions/songs";
import { createTestTeam, loginAs, cleanupTeam } from "./helpers";

// updateSectionLyrics is the one server action behind every chord/lyrics
// save — the mobile tap-to-edit chord sheet (ChordEditSheet) and the
// pre-existing raw textarea editor in Song Flow both call it. It had no
// leader-role check at all (same pre-existing-gap class documented in
// set-content-permissions.test.ts for Set content), so any MEMBER could
// rewrite a song's canonical chords. This covers the fix: rejected for a
// MEMBER, allowed for LEADER/ADMIN/OWNER, persisted correctly, and scoped
// to the acting user's own team.
describe("updateSectionLyrics is Leader-only (pre-existing gap, now fixed)", () => {
  const cleanup: { teamId: string; churchId: string }[] = [];
  afterEach(async () => {
    while (cleanup.length) {
      const c = cleanup.pop()!;
      await cleanupTeam(c.teamId, c.churchId);
    }
  });

  async function setupTeamWithSection(role: "OWNER" | "ADMIN" | "LEADER" | "MEMBER") {
    const actor = await createTestTeam(`section-lyrics-${role}`, role);
    cleanup.push({ teamId: actor.team.id, churchId: actor.church.id });
    const song = await prisma.song.create({ data: { teamId: actor.team.id, title: "A Song", key: "G" } });
    const section = await prisma.songSection.create({
      data: { songId: song.id, label: "Verse 1", order: 0, lyricsChords: "G    D\nOriginal lyric line" },
    });
    await loginAs(actor.user.id);
    return { actor, song, section };
  }

  it("rejects the save for a MEMBER and leaves the stored chords untouched", async () => {
    const { section } = await setupTeamWithSection("MEMBER");
    const result = await updateSectionLyrics(section.id, "Am    D\nOriginal lyric line");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/leader/i);
    const unchanged = await prisma.songSection.findUnique({ where: { id: section.id } });
    expect(unchanged?.lyricsChords).toBe("G    D\nOriginal lyric line");
  });

  for (const role of ["LEADER", "ADMIN", "OWNER"] as const) {
    it(`allows the save for a ${role} and persists the new content`, async () => {
      const { section } = await setupTeamWithSection(role);
      const result = await updateSectionLyrics(section.id, "Am    D\nOriginal lyric line");
      expect(result.ok).toBe(true);
      const updated = await prisma.songSection.findUnique({ where: { id: section.id } });
      expect(updated?.lyricsChords).toBe("Am    D\nOriginal lyric line");
    });
  }

  it("does not let a leader on one team edit a section belonging to another team's song", async () => {
    const owner = await createTestTeam("section-lyrics-tenant-a", "OWNER");
    cleanup.push({ teamId: owner.team.id, churchId: owner.church.id });
    const song = await prisma.song.create({ data: { teamId: owner.team.id, title: "Team A Song", key: "C" } });
    const section = await prisma.songSection.create({
      data: { songId: song.id, label: "Chorus", order: 0, lyricsChords: "C  G\nTeam A lyric" },
    });

    const otherLeader = await createTestTeam("section-lyrics-tenant-b", "LEADER");
    cleanup.push({ teamId: otherLeader.team.id, churchId: otherLeader.church.id });
    await loginAs(otherLeader.user.id);

    const result = await updateSectionLyrics(section.id, "Hacked  G\nTeam A lyric");
    expect(result.ok).toBe(false);
    const unchanged = await prisma.songSection.findUnique({ where: { id: section.id } });
    expect(unchanged?.lyricsChords).toBe("C  G\nTeam A lyric");
  });

  it("repeated saves of the same content do not create duplicate rows (idempotent, same section id)", async () => {
    const { section } = await setupTeamWithSection("LEADER");
    const first = await updateSectionLyrics(section.id, "D  G\nSame lyric");
    const second = await updateSectionLyrics(section.id, "D  G\nSame lyric");
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    const rows = await prisma.songSection.findMany({ where: { id: section.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].lyricsChords).toBe("D  G\nSame lyric");
  });
});
