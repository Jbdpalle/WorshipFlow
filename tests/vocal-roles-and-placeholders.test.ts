import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import {
  ROLES,
  ROLE_CATEGORIES,
  DEFAULT_SONG_STRUCTURE,
  isUntouchedDefaultStructure,
  catchAllDirectionFor,
} from "@/lib/songs/constants";
import { pickEffectiveRole, pickEffectiveRoles } from "@/lib/songs/assignment-resolver";
import { selectRoleNoteForViewer } from "@/lib/songs/role-notes";
import { createSong, replaceSongSections, updateSectionLyrics, upsertRoleNote } from "@/lib/actions/songs";
import { addTeamMember } from "@/lib/actions/team";
import { createTestTeam, loginAs, cleanupTeam } from "./helpers";

async function freshSectionsFor(songId: string) {
  return prisma.songSection.findMany({
    where: { songId },
    orderBy: { order: "asc" },
    include: { roleNotes: true },
  });
}

describe("P2 — native Soprano / Alto / Tenor roles", () => {
  it("are real entries in ROLES and in the vocals category", () => {
    expect(ROLES).toContain("Soprano");
    expect(ROLES).toContain("Alto");
    expect(ROLES).toContain("Tenor");
    const vocals = ROLE_CATEGORIES.find((c) => c.key === "vocals")!;
    expect(vocals.roles).toEqual(expect.arrayContaining(["Soprano", "Alto", "Tenor"]));
  });

  it("fall back to the 'Rest of the Vocals' catch-all like every other singer role", () => {
    expect(catchAllDirectionFor("Soprano")).toBe("Rest of the Vocals");
    expect(catchAllDirectionFor("Alto")).toBe("Rest of the Vocals");
    expect(catchAllDirectionFor("Tenor")).toBe("Rest of the Vocals");
    expect(catchAllDirectionFor("Drums")).toBe("Rest of the Band");
  });

  it("flow through pickEffectiveRole / pickEffectiveRoles exactly like any other role string", () => {
    expect(pickEffectiveRole(null, ["Alto"])).toBe("Alto");
    expect(pickEffectiveRole("Tenor", ["Alto"])).toBe("Tenor");
    expect(pickEffectiveRoles(null, ["Soprano", "Alto"])).toEqual(["Soprano", "Alto"]);
    expect(pickEffectiveRoles("Tenor", ["Soprano", "Alto"])).toEqual(["Tenor"]);
  });

  it("a team member can be added with role Soprano/Alto/Tenor and a direction written for that role resolves to the right viewer", async () => {
    const { user, church, team } = await createTestTeam("vocal-roles", "OWNER");
    try {
      await loginAs(user.id);

      const added = await addTeamMember({ name: "Singer", role: "Alto" });
      expect(added.ok).toBe(true);
      const member = await prisma.teamMember.findFirstOrThrow({ where: { teamId: team.id, name: "Singer" } });
      expect(member.role).toBe("Alto");
      expect(
        await prisma.teamMemberRole.findUnique({ where: { teamMemberId_role: { teamMemberId: member.id, role: "Alto" } } }),
      ).not.toBeNull();

      const song = await createSong({ title: "SATB Test Song" });
      expect(song.ok).toBe(true);
      if (!song.ok) return;
      const sections = await freshSectionsFor(song.data.id);
      const firstSection = sections[0];

      const note = await upsertRoleNote(firstSection.id, "Alto", "Harmony line under the melody", song.data.id);
      expect(note.ok).toBe(true);

      const roleNotes = await prisma.songRoleNote.findMany({ where: { sectionId: firstSection.id } });
      const resolved = selectRoleNoteForViewer(roleNotes, "Alto", null);
      expect(resolved?.content).toBe("Harmony line under the melody");

      // A Tenor with no note of their own falls back to "Rest of the Vocals", not the Alto note.
      const tenorResolved = selectRoleNoteForViewer(roleNotes, "Tenor", null);
      expect(tenorResolved).toBeUndefined();
    } finally {
      await cleanupTeam(team.id, church.id);
    }
  });
});

describe("P2 — placeholder clarity: default section structure", () => {
  it("isUntouchedDefaultStructure is true for a freshly created song", async () => {
    const { user, church, team } = await createTestTeam("default-structure", "OWNER");
    try {
      await loginAs(user.id);
      const song = await createSong({ title: "Fresh Song" });
      expect(song.ok).toBe(true);
      if (!song.ok) return;
      const sections = await freshSectionsFor(song.data.id);
      expect(sections.map((s) => s.label)).toEqual(DEFAULT_SONG_STRUCTURE);
      expect(isUntouchedDefaultStructure(sections)).toBe(true);
    } finally {
      await cleanupTeam(team.id, church.id);
    }
  });

  it("becomes false once any section is given lyrics/chords content", async () => {
    const { user, church, team } = await createTestTeam("default-structure-edited", "OWNER");
    try {
      await loginAs(user.id);
      const song = await createSong({ title: "Edited Song" });
      expect(song.ok).toBe(true);
      if (!song.ok) return;
      const sections = await freshSectionsFor(song.data.id);
      await updateSectionLyrics(sections[0].id, "Some lyrics");
      const after = await freshSectionsFor(song.data.id);
      expect(isUntouchedDefaultStructure(after)).toBe(false);
    } finally {
      await cleanupTeam(team.id, church.id);
    }
  });

  it("becomes false once a section has a role note on it", async () => {
    const { user, church, team } = await createTestTeam("default-structure-role-note", "OWNER");
    try {
      await loginAs(user.id);
      const song = await createSong({ title: "Noted Song" });
      expect(song.ok).toBe(true);
      if (!song.ok) return;
      const sections = await freshSectionsFor(song.data.id);
      await upsertRoleNote(sections[0].id, "Drums", "Build here", song.data.id);
      const after = await freshSectionsFor(song.data.id);
      expect(isUntouchedDefaultStructure(after)).toBe(false);
    } finally {
      await cleanupTeam(team.id, church.id);
    }
  });

  it("replaceSongSections succeeds while the structure is still untouched, discarding the default skeleton entirely", async () => {
    const { user, church, team } = await createTestTeam("replace-untouched", "OWNER");
    try {
      await loginAs(user.id);
      const song = await createSong({ title: "Replaceable Song" });
      expect(song.ok).toBe(true);
      if (!song.ok) return;

      const result = await replaceSongSections(song.data.id, ["Intro", "V1", "C", "V2", "C", "Bridge", "C", "Outro"]);
      expect(result.ok).toBe(true);

      const sections = await freshSectionsFor(song.data.id);
      expect(sections.map((s) => s.label)).toEqual(["Intro", "V1", "C", "V2", "C", "Bridge", "C", "Outro"]);
      expect(sections.map((s) => s.order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    } finally {
      await cleanupTeam(team.id, church.id);
    }
  });

  it("replaceSongSections is refused once the song has real content, instead of silently discarding it", async () => {
    const { user, church, team } = await createTestTeam("replace-refused", "OWNER");
    try {
      await loginAs(user.id);
      const song = await createSong({ title: "Already Arranged Song" });
      expect(song.ok).toBe(true);
      if (!song.ok) return;
      const sections = await freshSectionsFor(song.data.id);
      await updateSectionLyrics(sections[0].id, "Verse lyrics here");

      const result = await replaceSongSections(song.data.id, ["Custom A", "Custom B"]);
      expect(result.ok).toBe(false);

      const after = await freshSectionsFor(song.data.id);
      expect(after.map((s) => s.label)).toEqual(DEFAULT_SONG_STRUCTURE); // untouched — nothing was discarded
    } finally {
      await cleanupTeam(team.id, church.id);
    }
  });

  it("replaceSongSections is refused for a non-leader account on the same team", async () => {
    const { user, church, team } = await createTestTeam("replace-non-leader", "OWNER");
    const memberUser = await prisma.user.create({
      data: {
        name: "Member",
        email: `replace-non-leader-member-${Date.now()}@test.invalid`,
        passwordHash: await hashPassword("irrelevant-not-logged-in-via-password"),
      },
    });
    await prisma.membership.create({ data: { userId: memberUser.id, churchId: church.id, role: "MEMBER" } });
    try {
      await loginAs(user.id);
      const song = await createSong({ title: "Leader Owned Song" });
      expect(song.ok).toBe(true);
      if (!song.ok) return;

      await loginAs(memberUser.id);
      const result = await replaceSongSections(song.data.id, ["Custom A"]);
      expect(result.ok).toBe(false);

      const after = await freshSectionsFor(song.data.id);
      expect(after.map((s) => s.label)).toEqual(DEFAULT_SONG_STRUCTURE);
    } finally {
      await prisma.user.delete({ where: { id: memberUser.id } }).catch(() => {});
      await cleanupTeam(team.id, church.id);
    }
  });
});
