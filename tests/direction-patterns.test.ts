import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  copyRoleNotesAcrossSections,
  saveDirectionPattern,
  listDirectionPatterns,
  getDirectionPattern,
  deleteDirectionPattern,
  applyDirectionPatternItems,
  listTeamSongsForReuse,
  getSongSectionsForReuse,
} from "@/lib/actions/songs";
import { createTestTeam, loginAs, cleanupTeam } from "./helpers";

async function createSongWithSections(teamId: string, title: string, sectionLabels: string[]) {
  const song = await prisma.song.create({ data: { teamId, title } });
  const sections = [];
  for (let i = 0; i < sectionLabels.length; i++) {
    sections.push(await prisma.songSection.create({ data: { songId: song.id, label: sectionLabels[i], order: i } }));
  }
  return { song, sections };
}

describe("copyRoleNotesAcrossSections (cross-song, multi-destination)", () => {
  const cleanup: { teamId: string; churchId: string }[] = [];
  afterEach(async () => {
    while (cleanup.length) {
      const c = cleanup.pop()!;
      await cleanupTeam(c.teamId, c.churchId);
    }
  });

  it("copies directions from a section in one song onto sections of a different song", async () => {
    const leader = await createTestTeam("cross-copy", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    const { sections: sourceSections } = await createSongWithSections(leader.team.id, "Source Song", ["Chorus"]);
    const { song: destSong, sections: destSections } = await createSongWithSections(leader.team.id, "Dest Song", [
      "Verse",
      "Chorus",
    ]);

    await prisma.songRoleNote.create({
      data: { sectionId: sourceSections[0].id, role: "Acoustic Guitar", content: "Full strum, build" },
    });
    await prisma.songRoleNote.create({
      data: { sectionId: sourceSections[0].id, role: "Drums", content: "Full groove" },
    });

    await loginAs(leader.user.id);
    const result = await copyRoleNotesAcrossSections(
      sourceSections[0].id,
      [destSections[0].id, destSections[1].id],
      destSong.id,
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual({ copied: 4, skipped: 0 });

    for (const dest of destSections) {
      const notes = await prisma.songRoleNote.findMany({ where: { sectionId: dest.id } });
      expect(notes.map((n) => n.role).sort()).toEqual(["Acoustic Guitar", "Drums"]);
    }
  });

  it("never overwrites an existing direction at a destination, even across songs", async () => {
    const leader = await createTestTeam("cross-copy-no-clobber", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    const { sections: sourceSections } = await createSongWithSections(leader.team.id, "Source Song", ["Chorus"]);
    const { song: destSong, sections: destSections } = await createSongWithSections(leader.team.id, "Dest Song", [
      "Chorus",
    ]);

    await prisma.songRoleNote.create({
      data: { sectionId: sourceSections[0].id, role: "Keys", content: "Pad swell" },
    });
    await prisma.songRoleNote.create({
      data: { sectionId: destSections[0].id, role: "Keys", content: "Already written, keep this" },
    });

    await loginAs(leader.user.id);
    const result = await copyRoleNotesAcrossSections(sourceSections[0].id, [destSections[0].id], destSong.id);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual({ copied: 0, skipped: 1 });

    const kept = await prisma.songRoleNote.findFirst({ where: { sectionId: destSections[0].id, role: "Keys" } });
    expect(kept?.content).toBe("Already written, keep this");
  });

  it("is rejected across teams and a plain member cannot copy", async () => {
    const leaderA = await createTestTeam("cross-copy-tenant-a", "LEADER");
    const leaderB = await createTestTeam("cross-copy-tenant-b", "LEADER");
    cleanup.push({ teamId: leaderA.team.id, churchId: leaderA.church.id });
    cleanup.push({ teamId: leaderB.team.id, churchId: leaderB.church.id });

    const { sections: sectionsA } = await createSongWithSections(leaderA.team.id, "Song A", ["Verse"]);
    const { song: songB, sections: sectionsB } = await createSongWithSections(leaderB.team.id, "Song B", ["Verse"]);

    await loginAs(leaderA.user.id);
    const crossTeam = await copyRoleNotesAcrossSections(sectionsA[0].id, [sectionsB[0].id], songB.id);
    expect(crossTeam.ok).toBe(false);

    const member = await prisma.user.create({
      data: { name: "Member", email: `member-${Date.now()}@test.invalid`, passwordHash: "x" },
    });
    await prisma.membership.create({ data: { userId: member.id, churchId: leaderA.church.id, role: "MEMBER" } });
    await loginAs(member.id);
    const { song: songA2, sections: moreSectionsA } = await createSongWithSections(leaderA.team.id, "Song A2", [
      "Verse",
    ]);
    const asMember = await copyRoleNotesAcrossSections(sectionsA[0].id, [moreSectionsA[0].id], songA2.id);
    expect(asMember.ok).toBe(false);
  });
});

describe("Direction patterns (save, list, apply)", () => {
  const cleanup: { teamId: string; churchId: string }[] = [];
  afterEach(async () => {
    while (cleanup.length) {
      const c = cleanup.pop()!;
      await cleanupTeam(c.teamId, c.churchId);
    }
  });

  it("saves a section's directions as a named pattern, lists it, and previews its items", async () => {
    const leader = await createTestTeam("save-pattern", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    const { sections } = await createSongWithSections(leader.team.id, "Pattern Song", ["Chorus"]);
    await prisma.songRoleNote.create({
      data: { sectionId: sections[0].id, role: "Acoustic Guitar", content: "Full strum, build into the chorus" },
    });
    await prisma.songRoleNote.create({ data: { sectionId: sections[0].id, role: "Drums", content: "Full groove" } });

    await loginAs(leader.user.id);
    const saved = await saveDirectionPattern(sections[0].id, "Guitar + drums build");
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.data.itemCount).toBe(2);

    const list = await listDirectionPatterns();
    expect(list.ok && list.data).toHaveLength(1);
    expect(list.ok && list.data[0].name).toBe("Guitar + drums build");

    const preview = await getDirectionPattern(saved.data.id);
    expect(preview.ok && preview.data.items.map((i) => i.role).sort()).toEqual(["Acoustic Guitar", "Drums"]);
  });

  it("refuses to save a pattern from a section with no directions", async () => {
    const leader = await createTestTeam("save-pattern-empty", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    const { sections } = await createSongWithSections(leader.team.id, "Empty Song", ["Intro"]);

    await loginAs(leader.user.id);
    const saved = await saveDirectionPattern(sections[0].id, "Nothing here");
    expect(saved.ok).toBe(false);
  });

  it("applies a pattern's (possibly edited) items to several target sections, additively", async () => {
    const leader = await createTestTeam("apply-pattern", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    const { sections: sourceSections } = await createSongWithSections(leader.team.id, "Source", ["Chorus"]);
    await prisma.songRoleNote.create({
      data: { sectionId: sourceSections[0].id, role: "Keys", content: "Pad swell" },
    });

    await loginAs(leader.user.id);
    const saved = await saveDirectionPattern(sourceSections[0].id, "Keys pad");
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    const pattern = await getDirectionPattern(saved.data.id);
    expect(pattern.ok).toBe(true);
    if (!pattern.ok) return;

    // The leader edits the content in the preview step before applying —
    // the edited text, not the original saved pattern, must be what lands.
    const editedItems = pattern.data.items.map((i) => ({ ...i, content: `${i.content} (edited)` }));

    const { song: targetSong, sections: targets } = await createSongWithSections(leader.team.id, "Target", [
      "Verse",
      "Chorus",
    ]);
    const applied = await applyDirectionPatternItems(
      editedItems,
      [targets[0].id, targets[1].id],
      targetSong.id,
    );
    expect(applied.ok).toBe(true);
    if (applied.ok) expect(applied.data).toEqual({ applied: 2, skipped: 0 });

    for (const t of targets) {
      const note = await prisma.songRoleNote.findFirst({ where: { sectionId: t.id, role: "Keys" } });
      expect(note?.content).toBe("Pad swell (edited)");
    }

    // Applying the same pattern again is a no-op, never a duplicate/overwrite.
    const reapplied = await applyDirectionPatternItems(editedItems, [targets[0].id], targetSong.id);
    expect(reapplied.ok).toBe(true);
    if (reapplied.ok) expect(reapplied.data).toEqual({ applied: 0, skipped: 1 });
  });

  it("a plain member cannot save or apply a pattern; a pattern from another team is invisible", async () => {
    const leaderA = await createTestTeam("pattern-tenant-a", "LEADER");
    const leaderB = await createTestTeam("pattern-tenant-b", "LEADER");
    cleanup.push({ teamId: leaderA.team.id, churchId: leaderA.church.id });
    cleanup.push({ teamId: leaderB.team.id, churchId: leaderB.church.id });

    const { sections } = await createSongWithSections(leaderA.team.id, "Team A Song", ["Chorus"]);
    await prisma.songRoleNote.create({ data: { sectionId: sections[0].id, role: "Bass", content: "Root notes" } });

    await loginAs(leaderA.user.id);
    const saved = await saveDirectionPattern(sections[0].id, "Team A pattern");
    expect(saved.ok).toBe(true);

    await loginAs(leaderB.user.id);
    const listAsB = await listDirectionPatterns();
    expect(listAsB.ok && listAsB.data).toHaveLength(0);
    if (saved.ok) {
      const previewAsB = await getDirectionPattern(saved.data.id);
      expect(previewAsB.ok).toBe(false);
      const deleteAsB = await deleteDirectionPattern(saved.data.id);
      expect(deleteAsB.ok).toBe(false);
    }

    const member = await prisma.user.create({
      data: { name: "Member B", email: `member-b-${Date.now()}@test.invalid`, passwordHash: "x" },
    });
    await prisma.membership.create({ data: { userId: member.id, churchId: leaderA.church.id, role: "MEMBER" } });
    await loginAs(member.id);
    const { sections: moreSections } = await createSongWithSections(leaderA.team.id, "Team A Song 2", ["Chorus"]);
    await prisma.songRoleNote.create({ data: { sectionId: moreSections[0].id, role: "Bass", content: "Root notes" } });
    const memberSave = await saveDirectionPattern(moreSections[0].id, "Member's pattern");
    expect(memberSave.ok).toBe(false);
  });

  it("deletes a pattern", async () => {
    const leader = await createTestTeam("delete-pattern", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    const { sections } = await createSongWithSections(leader.team.id, "Delete Song", ["Chorus"]);
    await prisma.songRoleNote.create({ data: { sectionId: sections[0].id, role: "Bass", content: "Root notes" } });

    await loginAs(leader.user.id);
    const saved = await saveDirectionPattern(sections[0].id, "To delete");
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    const deleted = await deleteDirectionPattern(saved.data.id);
    expect(deleted.ok).toBe(true);
    const list = await listDirectionPatterns();
    expect(list.ok && list.data).toHaveLength(0);
  });
});

describe("Song/section listing for reuse pickers", () => {
  const cleanup: { teamId: string; churchId: string }[] = [];
  afterEach(async () => {
    while (cleanup.length) {
      const c = cleanup.pop()!;
      await cleanupTeam(c.teamId, c.churchId);
    }
  });

  it("lists every team song and a song's sections with only non-empty role notes previewed", async () => {
    const leader = await createTestTeam("list-for-reuse", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    const { song, sections } = await createSongWithSections(leader.team.id, "Listable Song", ["Verse", "Chorus"]);
    await prisma.songRoleNote.create({ data: { sectionId: sections[1].id, role: "Keys", content: "Pad" } });
    await prisma.songRoleNote.create({ data: { sectionId: sections[1].id, role: "Bass", content: "" } }); // empty, filtered out

    await loginAs(leader.user.id);
    const songs = await listTeamSongsForReuse();
    expect(songs.ok && songs.data.map((s) => s.title)).toContain("Listable Song");

    const sectionsResult = await getSongSectionsForReuse(song.id);
    expect(sectionsResult.ok).toBe(true);
    if (!sectionsResult.ok) return;
    expect(sectionsResult.data.map((s) => s.label)).toEqual(["Verse", "Chorus"]);
    expect(sectionsResult.data[0].roleNotes).toEqual([]);
    expect(sectionsResult.data[1].roleNotes).toEqual([{ role: "Keys", content: "Pad" }]);
  });
});
