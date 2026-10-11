import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  addSection,
  addSections,
  renameSection,
  deleteSection,
  reorderSections,
  updateSectionDynamics,
  upsertRoleNote,
  updateSong,
  deleteSong,
} from "@/lib/actions/songs";
import { proposeArrangementChange, keepArrangementChange } from "@/lib/actions/rehearsal";
import { createTestTeam, loginAs, cleanupTeam } from "./helpers";

describe("Arrangement edits are leader-only on the server", () => {
  const cleanup: { teamId: string; churchId: string }[] = [];
  afterEach(async () => {
    while (cleanup.length) {
      const c = cleanup.pop()!;
      await cleanupTeam(c.teamId, c.churchId);
    }
  });

  async function setup(label: string) {
    const owner = await createTestTeam(label, "OWNER");
    cleanup.push({ teamId: owner.team.id, churchId: owner.church.id });
    const song = await prisma.song.create({ data: { teamId: owner.team.id, title: "Song", key: "G" } });
    const section = await prisma.songSection.create({ data: { songId: song.id, label: "Verse", order: 0 } });
    await prisma.songRoleNote.create({ data: { sectionId: section.id, role: "Keys", content: "Pad" } });
    return { owner, song, section };
  }

  async function loginMember(churchId: string) {
    const member = await prisma.user.create({ data: { name: "M", email: `m-${Date.now()}-${Math.random()}@test.invalid`, passwordHash: "x" } });
    await prisma.membership.create({ data: { userId: member.id, churchId, role: "MEMBER" } });
    await loginAs(member.id);
  }

  it("a plain member's direct calls cannot change structure, directions, or song details", async () => {
    const { owner, song, section } = await setup("perm-member");
    await loginMember(owner.church.id);

    expect((await addSection(song.id, "Chorus")).ok).toBe(false);
    expect((await addSections(song.id, ["Chorus", "Bridge"])).ok).toBe(false);
    expect((await renameSection(section.id, "Hijack")).ok).toBe(false);
    expect((await updateSectionDynamics(section.id, "Full")).ok).toBe(false);
    expect((await reorderSections(song.id, [section.id])).ok).toBe(false);
    expect((await upsertRoleNote(section.id, "Keys", "Overwritten", song.id)).ok).toBe(false);
    expect((await updateSong(song.id, { key: "C" })).ok).toBe(false);
    expect((await deleteSection(section.id)).ok).toBe(false);
    expect((await deleteSong(song.id)).ok).toBe(false);

    expect(await prisma.songSection.count({ where: { songId: song.id } })).toBe(1);
    expect((await prisma.songSection.findUniqueOrThrow({ where: { id: section.id } })).label).toBe("Verse");
    expect((await prisma.songRoleNote.findFirstOrThrow({ where: { sectionId: section.id } })).content).toBe("Pad");
    expect((await prisma.song.findUniqueOrThrow({ where: { id: song.id } })).key).toBe("G");
  });

  it("a leader can build a whole structure in one call, appended in order", async () => {
    const { owner, song } = await setup("perm-build");
    await loginAs(owner.user.id);
    expect((await addSections(song.id, ["Intro", "Chorus", "Outro"])).ok).toBe(true);
    const labels = (await prisma.songSection.findMany({ where: { songId: song.id }, orderBy: { order: "asc" } })).map((s) => s.label);
    expect(labels).toEqual(["Verse", "Intro", "Chorus", "Outro"]);
    expect((await addSections(song.id, ["   "])).ok).toBe(false);
  });

  it("a song with only a bare structure (no directions) is a valid simple arrangement", async () => {
    const { owner, song } = await setup("perm-simple");
    await loginAs(owner.user.id);
    await prisma.songRoleNote.deleteMany({ where: { section: { songId: song.id } } });
    expect((await addSections(song.id, ["Intro", "Verse", "Chorus"])).ok).toBe(true);
    expect(await prisma.songRoleNote.count({ where: { section: { songId: song.id } } })).toBe(0);
  });

  it("another team cannot touch the arrangement at all", async () => {
    const { song, section } = await setup("perm-tenant");
    const other = await createTestTeam("perm-tenant-b", "OWNER");
    cleanup.push({ teamId: other.team.id, churchId: other.church.id });
    await loginAs(other.user.id);
    expect((await addSections(song.id, ["X"])).ok).toBe(false);
    expect((await upsertRoleNote(section.id, "Keys", "x", song.id)).ok).toBe(false);
  });

  it("detailed vocal + instrument directions still save per role", async () => {
    const { owner, song, section } = await setup("perm-detail");
    await loginAs(owner.user.id);
    for (const [role, content] of [["Lead Vocal", "Sing softly"], ["Backing Vocal", "Harmony on 3rds"], ["Drums", "Rest"]] as const) {
      expect((await upsertRoleNote(section.id, role, content, song.id)).ok).toBe(true);
    }
    const roles = (await prisma.songRoleNote.findMany({ where: { sectionId: section.id } })).map((n) => n.role).sort();
    expect(roles).toEqual(["Backing Vocal", "Drums", "Keys", "Lead Vocal"]);
  });

  it("Keep Change refuses to silently overwrite a direction edited after the experiment was proposed", async () => {
    const { owner, section } = await setup("perm-stale");
    await loginAs(owner.user.id);
    const proposed = await proposeArrangementChange({ sectionId: section.id, role: "Keys", proposedContent: "Piano only" });
    if (!proposed.ok) throw new Error("setup");

    // Someone edits the real direction in the meantime.
    await prisma.songRoleNote.updateMany({ where: { sectionId: section.id, role: "Keys" }, data: { content: "Strings + pad (newer)" } });

    const refused = await keepArrangementChange(proposed.data.id);
    expect(refused.ok).toBe(false);
    expect((await prisma.songRoleNote.findFirstOrThrow({ where: { sectionId: section.id, role: "Keys" } })).content).toBe("Strings + pad (newer)");
    expect((await prisma.arrangementChange.findUniqueOrThrow({ where: { id: proposed.data.id } })).status).toBe("PROPOSED");

    // An explicit confirmation overwrites.
    expect((await keepArrangementChange(proposed.data.id, { force: true })).ok).toBe(true);
    expect((await prisma.songRoleNote.findFirstOrThrow({ where: { sectionId: section.id, role: "Keys" } })).content).toBe("Piano only");
  });

  it("an experiment stays an experiment: proposing does not change the arrangement", async () => {
    const { owner, section } = await setup("perm-experiment");
    await loginAs(owner.user.id);
    await proposeArrangementChange({ sectionId: section.id, role: "Keys", proposedContent: "Piano only" });
    expect((await prisma.songRoleNote.findFirstOrThrow({ where: { sectionId: section.id, role: "Keys" } })).content).toBe("Pad");
  });
});
