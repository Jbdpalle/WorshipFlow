"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import type { ChurchRole } from "@prisma/client";
import { requireUser, isLeaderRole, isAdminRole } from "@/lib/auth/guard";
import { ensurePrimaryTeamMemberRole } from "@/lib/songs/team-member-roles";
import { runAction, type ActionResult } from "@/lib/actions/action-result";
import { checkCanAddTeamMember } from "@/lib/plans/limits";

export async function addTeamMember(input: {
  name: string;
  role: string;
  instrument?: string;
  bio?: string;
}): Promise<ActionResult> {
  return runAction(async () => {
    const { user, team, membershipRole } = await requireUser();
    if (!isLeaderRole(membershipRole)) {
      return { ok: false, error: "Only the worship leader can add a team member." };
    }
    const limit = await checkCanAddTeamMember(team.id, team.plan, user.isDemo);
    if (!limit.ok) return limit;
    const member = await prisma.teamMember.create({
      data: {
        teamId: team.id,
        name: input.name,
        role: input.role,
        instrument: input.instrument || null,
        bio: input.bio || null,
      },
    });
    await ensurePrimaryTeamMemberRole(prisma, member.id, input.role);
    revalidatePath("/team");
    return { ok: true };
  });
}

export async function updateTeamMember(
  memberId: string,
  input: Partial<{ name: string; role: string; instrument: string; bio: string }>,
): Promise<ActionResult> {
  return runAction(async () => {
    const { team, membershipRole } = await requireUser();
    if (!isLeaderRole(membershipRole)) {
      return { ok: false, error: "Only the worship leader can edit a team member." };
    }
    const member = await prisma.teamMember.findUnique({ where: { id: memberId } });
    if (!member || member.teamId !== team.id) return { ok: false, error: "Not found." };
    await prisma.teamMember.update({ where: { id: memberId }, data: input });
    if (input.role) await ensurePrimaryTeamMemberRole(prisma, memberId, input.role);
    revalidatePath("/team");
    return { ok: true };
  });
}

export async function removeTeamMember(memberId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { team, church, membershipRole } = await requireUser();
    if (!isAdminRole(membershipRole)) {
      return { ok: false, error: "Only an admin or the church owner can remove a team member." };
    }
    const member = await prisma.teamMember.findUnique({ where: { id: memberId } });
    if (!member || member.teamId !== team.id) return { ok: false, error: "Not found." };
    await prisma.$transaction(async (tx) => {
      await tx.teamMember.delete({ where: { id: memberId } });
      if (member.userId) {
        // Removing the roster card alone leaves their actual login access
        // to this church untouched (whatever ChurchRole they were invited
        // with) — revoke that too, so "Remove" really does remove them,
        // not just hide their card.
        await tx.membership.deleteMany({ where: { userId: member.userId, churchId: church.id } });
      }
    });
    revalidatePath("/team");
    return { ok: true };
  });
}

// Two TeamMember rows can turn out to be the same real person (an import
// that didn't exactly match an existing roster row, a typo'd re-add, etc.).
// Deleting the extra one outright (removeTeamMember above) cascade-deletes
// everything tied to its own id -- past assignments, role directions,
// personal notes -- which silently loses real history instead of just
// removing a redundant card. This moves every one of those relations onto
// `keep` first, deduping against anything `keep` already has (the unique
// constraints below would otherwise reject the move), then deletes the
// now-empty `merge` row. Never touches Membership/login access -- a
// duplicate roster CARD is not the same thing as someone's account, and
// merging must never silently revoke someone's ability to log in.
export async function mergeTeamMembers(keepId: string, mergeId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { team, membershipRole } = await requireUser();
    if (!isAdminRole(membershipRole)) {
      return { ok: false, error: "Only an admin or the church owner can merge team members." };
    }
    if (keepId === mergeId) {
      return { ok: false, error: "Pick two different people to merge." };
    }
    const [keep, merge] = await Promise.all([
      prisma.teamMember.findUnique({ where: { id: keepId } }),
      prisma.teamMember.findUnique({ where: { id: mergeId } }),
    ]);
    if (!keep || keep.teamId !== team.id) return { ok: false, error: "Not found." };
    if (!merge || merge.teamId !== team.id) return { ok: false, error: "Not found." };

    await prisma.$transaction(async (tx) => {
      // SetTeamMember: unique on (setId, teamMemberId, role) -- drop merge's
      // row wherever keep already has the same (setId, role), else move it.
      const [keepSetRoles, mergeSetRoles] = await Promise.all([
        tx.setTeamMember.findMany({ where: { teamMemberId: keepId }, select: { setId: true, role: true } }),
        tx.setTeamMember.findMany({ where: { teamMemberId: mergeId } }),
      ]);
      const keepSetRoleKeys = new Set(keepSetRoles.map((r) => `${r.setId}:${r.role}`));
      for (const row of mergeSetRoles) {
        if (keepSetRoleKeys.has(`${row.setId}:${row.role}`)) {
          await tx.setTeamMember.delete({ where: { id: row.id } });
        } else {
          await tx.setTeamMember.update({ where: { id: row.id }, data: { teamMemberId: keepId } });
        }
      }

      // SongAssignment: no DB-level unique constraint, but the app only
      // ever intends one assignment per (setSongId, teamMemberId) -- same
      // dedupe-then-move rule, keeping whichever row already belongs to keep.
      const [keepAssignments, mergeAssignments] = await Promise.all([
        tx.songAssignment.findMany({ where: { teamMemberId: keepId }, select: { setSongId: true } }),
        tx.songAssignment.findMany({ where: { teamMemberId: mergeId } }),
      ]);
      const keepAssignedSongs = new Set(keepAssignments.map((a) => a.setSongId));
      for (const row of mergeAssignments) {
        if (keepAssignedSongs.has(row.setSongId)) {
          await tx.songAssignment.delete({ where: { id: row.id } });
        } else {
          await tx.songAssignment.update({ where: { id: row.id }, data: { teamMemberId: keepId } });
        }
      }

      // SongRoleNote: unique on (sectionId, role, teamMemberId).
      const [keepNotes, mergeNotes] = await Promise.all([
        tx.songRoleNote.findMany({ where: { teamMemberId: keepId }, select: { sectionId: true, role: true } }),
        tx.songRoleNote.findMany({ where: { teamMemberId: mergeId } }),
      ]);
      const keepNoteKeys = new Set(keepNotes.map((n) => `${n.sectionId}:${n.role}`));
      for (const row of mergeNotes) {
        if (keepNoteKeys.has(`${row.sectionId}:${row.role}`)) {
          await tx.songRoleNote.delete({ where: { id: row.id } });
        } else {
          await tx.songRoleNote.update({ where: { id: row.id }, data: { teamMemberId: keepId } });
        }
      }

      // TeamMemberRole: unique on (teamMemberId, role) -- copy over any
      // role keep doesn't already have; cascade-delete cleans up merge's
      // own rows once the TeamMember row itself goes.
      const [keepRoles, mergeRoles] = await Promise.all([
        tx.teamMemberRole.findMany({ where: { teamMemberId: keepId }, select: { role: true } }),
        tx.teamMemberRole.findMany({ where: { teamMemberId: mergeId }, select: { role: true } }),
      ]);
      const keepRoleSet = new Set(keepRoles.map((r) => r.role));
      const rolesToAdd = mergeRoles.filter((r) => !keepRoleSet.has(r.role));
      if (rolesToAdd.length > 0) {
        await tx.teamMemberRole.createMany({
          data: rolesToAdd.map((r) => ({ teamMemberId: keepId, role: r.role })),
        });
      }

      // PersonalNote: no unique constraint -- a straight reassignment.
      await tx.personalNote.updateMany({ where: { teamMemberId: mergeId }, data: { teamMemberId: keepId } });

      // Invite: no unique constraint on teamMemberId -- a straight
      // reassignment, so a still-pending invite for the duplicate card
      // now links to the kept one instead.
      await tx.invite.updateMany({ where: { teamMemberId: mergeId }, data: { teamMemberId: keepId } });

      // Everything that pointed at `merge` now points at `keep` (or was a
      // dropped duplicate); the row itself is safe to remove. Its own
      // TeamMemberRole rows cascade-delete here too.
      await tx.teamMember.delete({ where: { id: mergeId } });
    });

    revalidatePath("/team");
    revalidatePath("/roster");
    revalidatePath("/sets");
    return { ok: true };
  });
}

// Admin/Owner can re-grant someone's role (Member/Leader/Admin) after the
// fact — previously a role was only ever set once, at invite time. Never
// grants OWNER (there's exactly one, the church's creator — no transfer
// feature here) and never changes the OWNER's own row, so this can't be
// used to strip or duplicate ownership.
export async function setMembershipRole(membershipId: string, newRole: ChurchRole): Promise<ActionResult> {
  return runAction(async () => {
    const { church, membershipRole } = await requireUser();
    if (!isAdminRole(membershipRole)) {
      return { ok: false, error: "Only an admin or the church owner can change someone's role." };
    }
    if (newRole === "OWNER") {
      return { ok: false, error: "Ownership can't be changed here." };
    }
    const membership = await prisma.membership.findUnique({ where: { id: membershipId } });
    if (!membership || membership.churchId !== church.id) return { ok: false, error: "Not found." };
    if (membership.role === "OWNER") {
      return { ok: false, error: "The church owner's role can't be changed here." };
    }
    await prisma.membership.update({ where: { id: membershipId }, data: { role: newRole } });
    revalidatePath("/team");
    return { ok: true };
  });
}

export type ChurchAccessRow = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  isSelf: boolean;
};

// Everyone with a real login on this church — distinct from the roster
// (TeamMember) list above, since someone can have access without a roster
// card (or, before the removeTeamMember fix above, could even have had a
// roster card deleted while still quietly keeping full access).
export async function listChurchAccess(): Promise<ChurchAccessRow[]> {
  const { user, church } = await requireUser();
  const memberships = await prisma.membership.findMany({
    where: { churchId: church.id },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  return memberships.map((m) => ({
    membershipId: m.id,
    userId: m.userId,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
    isSelf: m.userId === user.id,
  }));
}

export async function revokeChurchAccess(membershipId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { user, church, membershipRole } = await requireUser();
    if (!isAdminRole(membershipRole)) {
      return { ok: false, error: "Only an admin or the church owner can revoke access." };
    }
    const membership = await prisma.membership.findUnique({ where: { id: membershipId } });
    if (!membership || membership.churchId !== church.id) return { ok: false, error: "Not found." };
    if (membership.userId === user.id) return { ok: false, error: "You can't revoke your own access." };
    if (membership.role === "OWNER") return { ok: false, error: "The church owner's access can't be revoked here." };

    const teams = await prisma.team.findMany({ where: { churchId: church.id }, select: { id: true } });
    const teamIds = teams.map((t) => t.id);

    await prisma.$transaction(async (tx) => {
      await tx.membership.delete({ where: { id: membershipId } });
      if (teamIds.length > 0) {
        await tx.teamMember.deleteMany({ where: { teamId: { in: teamIds }, userId: membership.userId } });
      }
      // They may have been resolving to this church by default — clear
      // that so requireUser() falls back to whatever membership they have
      // left, instead of pointing at a church they're no longer in.
      await tx.user.updateMany({
        where: { id: membership.userId, currentChurchId: church.id },
        data: { currentChurchId: null },
      });
    });

    revalidatePath("/team");
    return { ok: true };
  });
}
