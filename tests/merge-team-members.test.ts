import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { mergeTeamMembers } from "@/lib/actions/team";
import { createTestTeam, loginAs, cleanupTeam } from "./helpers";

describe("mergeTeamMembers", () => {
  const cleanup: { teamId: string; churchId: string }[] = [];
  afterEach(async () => {
    while (cleanup.length) {
      const c = cleanup.pop()!;
      await cleanupTeam(c.teamId, c.churchId);
    }
  });

  it("rejects a plain LEADER (admin-only, same as removeTeamMember)", async () => {
    const leader = await createTestTeam("merge-leader-reject", "LEADER");
    cleanup.push({ teamId: leader.team.id, churchId: leader.church.id });
    const keep = await prisma.teamMember.create({ data: { teamId: leader.team.id, name: "Karthik", role: "Bass" } });
    const merge = await prisma.teamMember.create({ data: { teamId: leader.team.id, name: "kk", role: "Bass" } });
    await loginAs(leader.user.id);

    const result = await mergeTeamMembers(keep.id, merge.id);
    expect(result.ok).toBe(false);
    expect(await prisma.teamMember.findUnique({ where: { id: merge.id } })).not.toBeNull();
  });

  it("rejects merging across teams (tenant isolation)", async () => {
    const owner = await createTestTeam("merge-tenant-a", "OWNER");
    cleanup.push({ teamId: owner.team.id, churchId: owner.church.id });
    const other = await createTestTeam("merge-tenant-b", "OWNER");
    cleanup.push({ teamId: other.team.id, churchId: other.church.id });
    const keep = await prisma.teamMember.create({ data: { teamId: owner.team.id, name: "Karthik", role: "Bass" } });
    const foreignMerge = await prisma.teamMember.create({ data: { teamId: other.team.id, name: "kk", role: "Bass" } });
    await loginAs(owner.user.id);

    const result = await mergeTeamMembers(keep.id, foreignMerge.id);
    expect(result.ok).toBe(false);
    expect(await prisma.teamMember.findUnique({ where: { id: foreignMerge.id } })).not.toBeNull();
  });

  it("rejects merging a member into itself", async () => {
    const owner = await createTestTeam("merge-self", "OWNER");
    cleanup.push({ teamId: owner.team.id, churchId: owner.church.id });
    const member = await prisma.teamMember.create({ data: { teamId: owner.team.id, name: "Karthik", role: "Bass" } });
    await loginAs(owner.user.id);

    const result = await mergeTeamMembers(member.id, member.id);
    expect(result.ok).toBe(false);
  });

  it("moves assignments, directions, and roster rows onto the kept member and deletes the duplicate", async () => {
    const owner = await createTestTeam("merge-happy-path", "OWNER");
    cleanup.push({ teamId: owner.team.id, churchId: owner.church.id });
    await loginAs(owner.user.id);

    const keep = await prisma.teamMember.create({ data: { teamId: owner.team.id, name: "Karthik", role: "Bass" } });
    const merge = await prisma.teamMember.create({ data: { teamId: owner.team.id, name: "kk", role: "Bass" } });

    const set = await prisma.worshipSet.create({ data: { teamId: owner.team.id, title: "Sunday" } });
    const song = await prisma.song.create({ data: { teamId: owner.team.id, title: "A Song" } });
    const setSong = await prisma.setSong.create({ data: { setId: set.id, songId: song.id, order: 0 } });
    const section = await prisma.songSection.create({ data: { songId: song.id, label: "Verse 1", order: 0 } });

    // History that lives only on the duplicate ("kk") — this must survive the merge.
    await prisma.setTeamMember.create({ data: { setId: set.id, teamMemberId: merge.id, role: "Bass" } });
    await prisma.songAssignment.create({ data: { setSongId: setSong.id, teamMemberId: merge.id, role: "Bass" } });
    await prisma.songRoleNote.create({
      data: { sectionId: section.id, role: "Bass", content: "Root notes only.", teamMemberId: merge.id, visibility: "PERSON" },
    });

    const result = await mergeTeamMembers(keep.id, merge.id);
    expect(result.ok).toBe(true);

    // The duplicate card is gone.
    expect(await prisma.teamMember.findUnique({ where: { id: merge.id } })).toBeNull();

    // Everything that was on it now belongs to the kept member.
    const setTeamMembers = await prisma.setTeamMember.findMany({ where: { setId: set.id } });
    expect(setTeamMembers).toHaveLength(1);
    expect(setTeamMembers[0].teamMemberId).toBe(keep.id);

    const assignments = await prisma.songAssignment.findMany({ where: { setSongId: setSong.id } });
    expect(assignments).toHaveLength(1);
    expect(assignments[0].teamMemberId).toBe(keep.id);

    const notes = await prisma.songRoleNote.findMany({ where: { sectionId: section.id } });
    expect(notes).toHaveLength(1);
    expect(notes[0].teamMemberId).toBe(keep.id);
    expect(notes[0].content).toBe("Root notes only.");
  });

  it("dedupes instead of colliding when both the kept and duplicate member already have the same assignment", async () => {
    const owner = await createTestTeam("merge-dedupe", "OWNER");
    cleanup.push({ teamId: owner.team.id, churchId: owner.church.id });
    await loginAs(owner.user.id);

    const keep = await prisma.teamMember.create({ data: { teamId: owner.team.id, name: "Karthik", role: "Bass" } });
    const merge = await prisma.teamMember.create({ data: { teamId: owner.team.id, name: "kk", role: "Bass" } });

    const set = await prisma.worshipSet.create({ data: { teamId: owner.team.id, title: "Sunday" } });
    const song = await prisma.song.create({ data: { teamId: owner.team.id, title: "A Song" } });
    const setSong = await prisma.setSong.create({ data: { setId: set.id, songId: song.id, order: 0 } });
    const section = await prisma.songSection.create({ data: { songId: song.id, label: "Verse 1", order: 0 } });

    // Both already assigned to the same set/song/section+role -- a naive
    // reassignment would violate SetTeamMember/SongRoleNote's unique
    // constraints instead of silently dropping the redundant duplicate row.
    await prisma.setTeamMember.create({ data: { setId: set.id, teamMemberId: keep.id, role: "Bass" } });
    await prisma.setTeamMember.create({ data: { setId: set.id, teamMemberId: merge.id, role: "Bass" } });
    await prisma.songAssignment.create({ data: { setSongId: setSong.id, teamMemberId: keep.id, role: "Bass" } });
    await prisma.songAssignment.create({ data: { setSongId: setSong.id, teamMemberId: merge.id, role: "Lead Vocal" } });
    await prisma.songRoleNote.create({
      data: { sectionId: section.id, role: "Bass", content: "Keep's note.", teamMemberId: keep.id, visibility: "PERSON" },
    });
    await prisma.songRoleNote.create({
      data: { sectionId: section.id, role: "Bass", content: "Duplicate's note.", teamMemberId: merge.id, visibility: "PERSON" },
    });

    const result = await mergeTeamMembers(keep.id, merge.id);
    expect(result.ok).toBe(true);

    const setTeamMembers = await prisma.setTeamMember.findMany({ where: { setId: set.id, teamMemberId: keep.id } });
    expect(setTeamMembers).toHaveLength(1);

    const assignments = await prisma.songAssignment.findMany({ where: { setSongId: setSong.id, teamMemberId: keep.id } });
    expect(assignments).toHaveLength(1);
    expect(assignments[0].role).toBe("Bass"); // keep's existing assignment wins, duplicate's dropped

    const notes = await prisma.songRoleNote.findMany({ where: { sectionId: section.id, teamMemberId: keep.id } });
    expect(notes).toHaveLength(1);
    expect(notes[0].content).toBe("Keep's note."); // keep's existing note wins
  });

  it("never touches Membership/login access, even for a duplicate with its own account", async () => {
    const owner = await createTestTeam("merge-preserves-login", "OWNER");
    cleanup.push({ teamId: owner.team.id, churchId: owner.church.id });
    await loginAs(owner.user.id);

    const keep = await prisma.teamMember.create({ data: { teamId: owner.team.id, name: "Karthik", role: "Bass" } });

    const duplicateUser = await prisma.user.create({
      data: { name: "kk", email: `kk-${Date.now()}@test.invalid`, passwordHash: "x" },
    });
    await prisma.membership.create({ data: { userId: duplicateUser.id, churchId: owner.church.id, role: "MEMBER" } });
    const merge = await prisma.teamMember.create({
      data: { teamId: owner.team.id, name: "kk", role: "Bass", userId: duplicateUser.id },
    });

    const result = await mergeTeamMembers(keep.id, merge.id);
    expect(result.ok).toBe(true);

    // The roster card is gone, but the account and its church access remain.
    expect(await prisma.teamMember.findUnique({ where: { id: merge.id } })).toBeNull();
    expect(await prisma.user.findUnique({ where: { id: duplicateUser.id } })).not.toBeNull();
    const membership = await prisma.membership.findFirst({ where: { userId: duplicateUser.id, churchId: owner.church.id } });
    expect(membership).not.toBeNull();
  });
});
