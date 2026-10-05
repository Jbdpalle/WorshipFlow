"use server";

import { revalidatePath } from "next/cache";
import type { ChurchRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireUser, isLeaderRole } from "@/lib/auth/guard";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { runAction, type ActionResult, type ActionResultData } from "@/lib/actions/action-result";
import { trackEvent } from "@/lib/usability/track";

const INVITE_DURATION_DAYS = 7;

export async function createInvite(input: {
  email: string;
  role?: ChurchRole;
  teamMemberId?: string;
}): Promise<ActionResultData<{ id: string; token: string }>> {
  return runAction(async () => {
    const { team, church, membershipRole } = await requireUser();
    if (!isLeaderRole(membershipRole)) {
      return { ok: false, error: "Only the worship leader can invite people." };
    }

    const email = input.email.trim().toLowerCase();
    if (!email) return { ok: false, error: "Enter an email address." };

    if (input.teamMemberId) {
      const member = await prisma.teamMember.findUnique({ where: { id: input.teamMemberId } });
      if (!member || member.teamId !== team.id) return { ok: false, error: "Team member not found." };
      if (member.userId) return { ok: false, error: "That team member already has a login." };
    }

    // Reuse a pending invite for the same email instead of piling up
    // duplicates — refresh its token/expiry so an old link keeps working.
    const existingPending = await prisma.invite.findFirst({
      where: { teamId: team.id, email, acceptedAt: null },
    });

    const expiresAt = new Date(Date.now() + INVITE_DURATION_DAYS * 24 * 60 * 60 * 1000);
    const invite = existingPending
      ? await prisma.invite.update({
          where: { id: existingPending.id },
          data: {
            role: input.role ?? existingPending.role,
            teamMemberId: input.teamMemberId ?? existingPending.teamMemberId,
            expiresAt,
          },
        })
      : await prisma.invite.create({
          data: {
            churchId: church.id,
            teamId: team.id,
            teamMemberId: input.teamMemberId || null,
            email,
            role: input.role ?? "MEMBER",
            expiresAt,
          },
        });

    revalidatePath("/team");
    trackEvent(team.id, "team_member_invited", { entityId: invite.id });
    return { ok: true, data: { id: invite.id, token: invite.token } };
  });
}

export async function listInvites(): Promise<
  ActionResultData<{ id: string; email: string; role: ChurchRole; token: string; expiresAt: Date }[]>
> {
  return runAction(async () => {
    const { team } = await requireUser();
    const invites = await prisma.invite.findMany({
      where: { teamId: team.id, acceptedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return {
      ok: true,
      data: invites.map((i) => ({ id: i.id, email: i.email, role: i.role, token: i.token, expiresAt: i.expiresAt })),
    };
  });
}

export async function revokeInvite(inviteId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { team, membershipRole } = await requireUser();
    if (!isLeaderRole(membershipRole)) {
      return { ok: false, error: "Only the worship leader can revoke an invite." };
    }
    const invite = await prisma.invite.findUnique({ where: { id: inviteId } });
    if (!invite || invite.teamId !== team.id) return { ok: false, error: "Invite not found." };
    await prisma.invite.delete({ where: { id: inviteId } });
    revalidatePath("/team");
    return { ok: true };
  });
}

export type InviteInfo =
  | { status: "not_found" }
  | { status: "expired" }
  | { status: "accepted" }
  | { status: "valid"; email: string; churchName: string; teamMemberName: string | null; userExists: boolean };

// Public — no requireUser(), since the person opening this link isn't
// logged in yet (that's the whole point).
export async function getInviteInfo(token: string): Promise<InviteInfo> {
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { church: true, teamMember: true },
  });
  if (!invite) return { status: "not_found" };
  if (invite.acceptedAt) return { status: "accepted" };
  if (invite.expiresAt < new Date()) return { status: "expired" };

  const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });
  return {
    status: "valid",
    email: invite.email,
    churchName: invite.church.name,
    teamMemberName: invite.teamMember?.name ?? null,
    userExists: !!existingUser,
  };
}

async function resolveValidInvite(token: string) {
  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite) return { ok: false as const, error: "This invite link isn't valid." };
  if (invite.acceptedAt) return { ok: false as const, error: "This invite has already been used." };
  if (invite.expiresAt < new Date()) return { ok: false as const, error: "This invite has expired." };
  return { ok: true as const, invite };
}

async function finalizeAcceptance(inviteId: string, userId: string, teamMemberId: string | null, teamId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.invite.update({
      where: { id: inviteId },
      data: { acceptedAt: new Date(), acceptedByUserId: userId },
    });
    if (teamMemberId) {
      await tx.teamMember.update({ where: { id: teamMemberId }, data: { userId } });
    }
  });
  await createSession({ userId });
  trackEvent(teamId, "invite_accepted", { userId, entityId: inviteId });
}

// Invited email has no existing account yet — create one, scoped to the
// EXISTING church/team from the invite (never a new one, unlike signup).
export async function acceptInviteNewUser(
  token: string,
  input: { name: string; password: string },
): Promise<ActionResult> {
  return runAction(async () => {
    const resolved = await resolveValidInvite(token);
    if (!resolved.ok) return resolved;
    const { invite } = resolved;

    if (!input.name.trim()) return { ok: false, error: "Name is required." };
    if (input.password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };

    const existing = await prisma.user.findUnique({ where: { email: invite.email } });
    if (existing) return { ok: false, error: "An account with this email already exists — log in instead." };

    const passwordHash = await hashPassword(input.password);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name: input.name.trim(), email: invite.email, passwordHash },
      });
      await tx.membership.create({
        data: { userId: created.id, churchId: invite.churchId, role: invite.role },
      });
      if (!invite.teamMemberId) {
        // No specific roster row was targeted — create one, same shape as
        // what a fresh signup gets for itself.
        await tx.teamMember.create({
          data: { teamId: invite.teamId, userId: created.id, name: input.name.trim(), role: "Other" },
        });
      }
      return created;
    });

    await finalizeAcceptance(invite.id, user.id, invite.teamMemberId, invite.teamId);
    return { ok: true };
  });
}

// Invited email already has an account — verify their password (same check
// as a normal login) and attach them to this church/team instead.
export async function acceptInviteExistingUser(token: string, password: string): Promise<ActionResult> {
  return runAction(async () => {
    const resolved = await resolveValidInvite(token);
    if (!resolved.ok) return resolved;
    const { invite } = resolved;

    const user = await prisma.user.findUnique({ where: { email: invite.email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return { ok: false, error: "Incorrect password." };
    }

    const existingMembership = await prisma.membership.findUnique({
      where: { userId_churchId: { userId: user.id, churchId: invite.churchId } },
    });
    if (!existingMembership) {
      await prisma.membership.create({
        data: { userId: user.id, churchId: invite.churchId, role: invite.role },
      });
    }

    await finalizeAcceptance(invite.id, user.id, invite.teamMemberId, invite.teamId);
    return { ok: true };
  });
}
