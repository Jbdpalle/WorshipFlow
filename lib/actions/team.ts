"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser, isLeaderRole } from "@/lib/auth/guard";
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
    const { user, team } = await requireUser();
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
    const { team } = await requireUser();
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
    if (!isLeaderRole(membershipRole)) {
      return { ok: false, error: "Only the worship leader can remove a team member." };
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
    if (!isLeaderRole(membershipRole)) {
      return { ok: false, error: "Only the worship leader can revoke access." };
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
