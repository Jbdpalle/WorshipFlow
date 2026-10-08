import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  updateSetNotes,
  updateSetExaltation,
  updateSetMeta,
  addSongToSet,
  removeSongFromSet,
  reorderSetSongs,
  updateSetSongDetails,
  assignMemberToSetSong,
  removeAssignment,
  assignMemberToSet,
  removeSetMember,
  archiveSet,
  unarchiveSet,
} from "@/lib/actions/sets";
import { createTestTeam, loginAs, cleanupTeam } from "./helpers";

// A pre-existing gap: every set-content mutation below had no leader-role
// check at all, so any MEMBER could edit notes, the exaltation, service
// direction, the setlist, or per-song assignments. Each covers exactly one
// of those actions, rejected for a MEMBER session. archiveSet/unarchiveSet
// are intentionally NOT included — a comment in lib/actions/sets.ts
// documents that those stay open to any team member by design.
describe("Set content mutations are Leader-only (pre-existing gap, now fixed)", () => {
  const cleanup: { teamId: string; churchId: string }[] = [];
  afterEach(async () => {
    while (cleanup.length) {
      const c = cleanup.pop()!;
      await cleanupTeam(c.teamId, c.churchId);
    }
  });

  async function setupMemberWithSet() {
    const member = await createTestTeam("set-content-member", "MEMBER");
    cleanup.push({ teamId: member.team.id, churchId: member.church.id });
    const set = await prisma.worshipSet.create({
      data: { teamId: member.team.id, title: "Member-visible Service" },
    });
    const song = await prisma.song.create({ data: { teamId: member.team.id, title: "A Song" } });
    const setSong = await prisma.setSong.create({ data: { setId: set.id, songId: song.id, order: 0 } });
    const teamMember = await prisma.teamMember.create({
      data: { teamId: member.team.id, name: "Musician", role: "Bass" },
    });
    await loginAs(member.user.id);
    return { member, set, song, setSong, teamMember };
  }

  it("rejects updateSetNotes for a MEMBER", async () => {
    const { set } = await setupMemberWithSet();
    const result = await updateSetNotes(set.id, "Member-written notes");
    expect(result.ok).toBe(false);
    const unchanged = await prisma.worshipSet.findUnique({ where: { id: set.id } });
    expect(unchanged?.notes).toBeNull();
  });

  it("rejects updateSetExaltation for a MEMBER", async () => {
    const { set } = await setupMemberWithSet();
    const result = await updateSetExaltation(set.id, "Member-written exaltation");
    expect(result.ok).toBe(false);
  });

  it("rejects updateSetMeta for a MEMBER", async () => {
    const { set } = await setupMemberWithSet();
    const result = await updateSetMeta(set.id, { theme: "Member theme" });
    expect(result.ok).toBe(false);
    const unchanged = await prisma.worshipSet.findUnique({ where: { id: set.id } });
    expect(unchanged?.theme).toBeNull();
  });

  it("rejects addSongToSet for a MEMBER", async () => {
    const { set, member } = await setupMemberWithSet();
    const extraSong = await prisma.song.create({ data: { teamId: member.team.id, title: "Extra Song" } });
    const result = await addSongToSet(set.id, extraSong.id);
    expect(result.ok).toBe(false);
    const songs = await prisma.setSong.findMany({ where: { setId: set.id } });
    expect(songs).toHaveLength(1);
  });

  it("rejects removeSongFromSet for a MEMBER", async () => {
    const { setSong } = await setupMemberWithSet();
    const result = await removeSongFromSet(setSong.id);
    expect(result.ok).toBe(false);
    expect(await prisma.setSong.findUnique({ where: { id: setSong.id } })).not.toBeNull();
  });

  it("rejects reorderSetSongs for a MEMBER", async () => {
    const { set, setSong } = await setupMemberWithSet();
    const result = await reorderSetSongs(set.id, [setSong.id]);
    expect(result.ok).toBe(false);
  });

  it("rejects updateSetSongDetails for a MEMBER", async () => {
    const { setSong } = await setupMemberWithSet();
    const result = await updateSetSongDetails(setSong.id, { overrideKey: "G" });
    expect(result.ok).toBe(false);
    const unchanged = await prisma.setSong.findUnique({ where: { id: setSong.id } });
    expect(unchanged?.overrideKey).toBeNull();
  });

  it("rejects assignMemberToSetSong for a MEMBER", async () => {
    const { setSong, teamMember } = await setupMemberWithSet();
    const result = await assignMemberToSetSong(setSong.id, teamMember.id, "Bass");
    expect(result.ok).toBe(false);
    const assignments = await prisma.songAssignment.findMany({ where: { setSongId: setSong.id } });
    expect(assignments).toHaveLength(0);
  });

  it("rejects removeAssignment for a MEMBER", async () => {
    const { setSong, teamMember } = await setupMemberWithSet();
    const assignment = await prisma.songAssignment.create({
      data: { setSongId: setSong.id, teamMemberId: teamMember.id, role: "Bass" },
    });
    const result = await removeAssignment(assignment.id);
    expect(result.ok).toBe(false);
    expect(await prisma.songAssignment.findUnique({ where: { id: assignment.id } })).not.toBeNull();
  });

  // The Worship Team section on Set Detail (components/setlist/set-team.tsx)
  // drives these two whole-set-roster actions, not assignMemberToSetSong —
  // its inline editor calls assignMemberToSet + removeSetMember directly on
  // select/remove, so a MEMBER session must be rejected here too, same as
  // every other set-content mutation above.
  it("rejects assignMemberToSet for a MEMBER", async () => {
    const { set, teamMember } = await setupMemberWithSet();
    const result = await assignMemberToSet(set.id, teamMember.id, "Bass");
    expect(result.ok).toBe(false);
    const rows = await prisma.setTeamMember.findMany({ where: { setId: set.id } });
    expect(rows).toHaveLength(0);
  });

  it("rejects removeSetMember for a MEMBER", async () => {
    const { set, teamMember } = await setupMemberWithSet();
    const row = await prisma.setTeamMember.create({
      data: { setId: set.id, teamMemberId: teamMember.id, role: "Bass" },
    });
    const result = await removeSetMember(row.id);
    expect(result.ok).toBe(false);
    expect(await prisma.setTeamMember.findUnique({ where: { id: row.id } })).not.toBeNull();
  });

  // The displayed musical assignment must be whatever role the SetTeamMember
  // row holds for this set, never the account's ChurchRole (OWNER/ADMIN/
  // LEADER/MEMBER) — this is what components/setlist/set-team.tsx reads and
  // displays, and what My Part/Director Mode resolve through the same
  // SetTeamMember rows via lib/songs/assignment-resolver.ts.
  it("keeps musical assignment independent of account role (Owner+Bass, Leader+Vocal, Member+Drums)", async () => {
    const cases: { label: string; accountRole: "OWNER" | "LEADER" | "MEMBER"; musicalRole: string }[] = [
      { label: "owner-bass", accountRole: "OWNER", musicalRole: "Bass" },
      { label: "leader-vocal", accountRole: "LEADER", musicalRole: "Lead Vocal" },
      { label: "member-drums", accountRole: "MEMBER", musicalRole: "Drums" },
    ];
    for (const c of cases) {
      const owner = await createTestTeam(`role-sep-${c.label}`, "OWNER");
      cleanup.push({ teamId: owner.team.id, churchId: owner.church.id });
      const set = await prisma.worshipSet.create({ data: { teamId: owner.team.id, title: "Role Sep Service" } });
      const musician = await prisma.user.create({
        data: { name: `Musician ${c.label}`, email: `${c.label}-${Date.now()}@test.invalid`, passwordHash: "x" },
      });
      await prisma.membership.create({ data: { userId: musician.id, churchId: owner.church.id, role: c.accountRole } });
      const teamMember = await prisma.teamMember.create({
        data: { teamId: owner.team.id, userId: musician.id, name: `Musician ${c.label}`, role: c.musicalRole },
      });

      await loginAs(owner.user.id);
      const assigned = await assignMemberToSet(set.id, teamMember.id, c.musicalRole);
      expect(assigned.ok).toBe(true);

      const row = await prisma.setTeamMember.findFirst({ where: { setId: set.id, teamMemberId: teamMember.id } });
      expect(row?.role).toBe(c.musicalRole);
      expect(row?.role).not.toBe(c.accountRole);
    }
  });

  it("archiveSet and unarchiveSet remain open to any team member (deliberate, not a gap)", async () => {
    const { set } = await setupMemberWithSet();
    const archived = await archiveSet(set.id);
    expect(archived.ok).toBe(true);
    const unarchived = await unarchiveSet(set.id);
    expect(unarchived.ok).toBe(true);
  });
});
