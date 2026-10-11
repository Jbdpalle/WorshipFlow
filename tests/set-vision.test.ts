import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { createSet, updateSetNotes, addSongToSet, updateSetSongDetails } from "@/lib/actions/sets";
import { updateSong } from "@/lib/actions/songs";
import { getSongFlowStatus, getServiceStages, getSetReadiness } from "@/lib/songs/readiness";
import { createTestTeam, loginAs, cleanupTeam } from "./helpers";

describe("Set vision is primary; songs don't need their own", () => {
  const cleanup: { teamId: string; churchId: string }[] = [];
  afterEach(async () => {
    while (cleanup.length) {
      const c = cleanup.pop()!;
      await cleanupTeam(c.teamId, c.churchId);
    }
  });

  it("a leader can create a set, add songs and be ready without writing any song vision", async () => {
    const owner = await createTestTeam("vision-create", "OWNER");
    cleanup.push({ teamId: owner.team.id, churchId: owner.church.id });
    await loginAs(owner.user.id);

    const created = await createSet({ title: "Sunday", leaderName: "Pat" });
    if (!created.ok) throw new Error(created.error);
    const song = await prisma.song.create({ data: { teamId: owner.team.id, title: "Familiar Song" } });
    const section = await prisma.songSection.create({ data: { songId: song.id, label: "Chorus", order: 0, lyricsChords: "[G]Amazing grace" } });
    expect((await addSongToSet(created.data.id, song.id)).ok).toBe(true);

    const set = await prisma.worshipSet.findUniqueOrThrow({
      where: { id: created.data.id },
      include: { teamMembers: true, songs: { include: { assignments: true, song: { include: { sections: { include: { roleNotes: true } }, rehearsals: true } } } } },
    });
    expect(set.songs[0].song.visionNote).toBeNull();
    expect(getSongFlowStatus(set.songs[0].song)).toBe("ready");
    expect(getSetReadiness(set).some((i) => i.id.startsWith("flow-"))).toBe(false);
    expect(getServiceStages(set).find((s) => s.key === "songFlow")?.complete).toBe(true);
    expect(section.id).toBeTruthy();
  });

  it("song readiness: nothing to read is 'needs work'; no sections is 'not started'; a vision note alone is irrelevant", () => {
    expect(getSongFlowStatus({ sections: [] })).toBe("not_started");
    expect(getSongFlowStatus({ visionNote: "Awe", sections: [{ roleNotes: [] }] })).toBe("needs_work");
    expect(getSongFlowStatus({ sections: [{ roleNotes: [{ content: "Pad swell" }] }] })).toBe("ready");
    expect(getSongFlowStatus({ sections: [{ lyricsChords: "[C]Hello", roleNotes: [] }] })).toBe("ready");
    expect(getSongFlowStatus({ sections: [{ lyricsChords: "  ", roleNotes: [{ content: "  " }] }] })).toBe("needs_work");
  });

  it("the set's vision and a song's own note are stored separately and never overwrite each other", async () => {
    const owner = await createTestTeam("vision-separate", "OWNER");
    cleanup.push({ teamId: owner.team.id, churchId: owner.church.id });
    await loginAs(owner.user.id);
    const set = await prisma.worshipSet.create({ data: { teamId: owner.team.id, title: "Sunday" } });
    const song = await prisma.song.create({ data: { teamId: owner.team.id, title: "Song", visionNote: "Song-level note" } });

    expect((await updateSetNotes(set.id, "Awe → surrender → declaration")).ok).toBe(true);
    expect((await prisma.worshipSet.findUnique({ where: { id: set.id } }))?.notes).toBe("Awe → surrender → declaration");
    expect((await prisma.song.findUnique({ where: { id: song.id } }))?.visionNote).toBe("Song-level note");

    expect((await updateSong(song.id, { visionNote: "Changed song note" })).ok).toBe(true);
    expect((await prisma.worshipSet.findUnique({ where: { id: set.id } }))?.notes).toBe("Awe → surrender → declaration");
  });

  it("a song's role in the set is optional, set-specific, and does not touch the canonical song", async () => {
    const owner = await createTestTeam("vision-purpose", "OWNER");
    cleanup.push({ teamId: owner.team.id, churchId: owner.church.id });
    await loginAs(owner.user.id);
    const set = await prisma.worshipSet.create({ data: { teamId: owner.team.id, title: "Sunday" } });
    const song = await prisma.song.create({ data: { teamId: owner.team.id, title: "Song", key: "G" } });
    const setSong = await prisma.setSong.create({ data: { setId: set.id, songId: song.id, order: 0 } });
    expect(setSong.purpose).toBeNull();

    expect((await updateSetSongDetails(setSong.id, { purpose: "Opens the set with awe", overrideKey: "A" })).ok).toBe(true);
    const row = await prisma.setSong.findUniqueOrThrow({ where: { id: setSong.id } });
    expect(row).toMatchObject({ purpose: "Opens the set with awe", overrideKey: "A" });
    expect((await prisma.song.findUniqueOrThrow({ where: { id: song.id } })).key).toBe("G");
  });
});
