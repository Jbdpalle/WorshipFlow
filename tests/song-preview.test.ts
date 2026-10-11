import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { getSongPreview } from "@/lib/actions/songs";
import { createTestTeam, loginAs, cleanupTeam } from "./helpers";

// Backs the Theme Matches "Preview" sheet — a quick, tenant-scoped look at
// a song's key/bpm/lyricsSummary and each section's own lyricsChords,
// without opening the full song editor.
describe("getSongPreview", () => {
  const cleanup: { teamId: string; churchId: string }[] = [];
  afterEach(async () => {
    while (cleanup.length) {
      const c = cleanup.pop()!;
      await cleanupTeam(c.teamId, c.churchId);
    }
  });

  it("returns the song's preview fields and ordered sections with chords/lyrics", async () => {
    const owner = await createTestTeam("song-preview");
    cleanup.push({ teamId: owner.team.id, churchId: owner.church.id });
    const song = await prisma.song.create({
      data: {
        teamId: owner.team.id,
        title: "At the Cross",
        artist: "Hillsong Worship",
        key: "E",
        bpm: 68,
        lyricsSummary: "A reflective song on the cross, building into bold declaration.",
      },
    });
    await prisma.songSection.create({
      data: { songId: song.id, label: "Verse 1", order: 0, lyricsChords: "E  A\nAt the cross..." },
    });
    await prisma.songSection.create({
      data: { songId: song.id, label: "Chorus", order: 1, lyricsChords: null },
    });
    await loginAs(owner.user.id);

    const result = await getSongPreview(song.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.title).toBe("At the Cross");
    expect(result.data.artist).toBe("Hillsong Worship");
    expect(result.data.key).toBe("E");
    expect(result.data.bpm).toBe(68);
    expect(result.data.lyricsSummary).toContain("reflective song");
    expect(result.data.sections.map((s) => s.label)).toEqual(["Verse 1", "Chorus"]);
    expect(result.data.sections[0].lyricsChords).toContain("At the cross");
    expect(result.data.sections[1].lyricsChords).toBeNull();
  });

  it("does not let a leader on one team preview a song that belongs to another team", async () => {
    const owner = await createTestTeam("song-preview-tenant-a");
    cleanup.push({ teamId: owner.team.id, churchId: owner.church.id });
    const song = await prisma.song.create({ data: { teamId: owner.team.id, title: "Team A Song" } });

    const other = await createTestTeam("song-preview-tenant-b");
    cleanup.push({ teamId: other.team.id, churchId: other.church.id });
    await loginAs(other.user.id);

    const result = await getSongPreview(song.id);
    expect(result.ok).toBe(false);
  });
});
