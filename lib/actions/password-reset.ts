"use server";

import { prisma } from "@/lib/db/prisma";
import { requireUser, isLeaderRole } from "@/lib/auth/guard";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { runAction, type ActionResult, type ActionResultData } from "@/lib/actions/action-result";
import { trackEvent } from "@/lib/usability/track";

const RESET_DURATION_HOURS = 24;

// Leader-assisted password reset: WorshipFlow has no email-sending
// capability, so this follows the same pattern as Invite — a leader
// generates a token, copies the link, and shares it with the locked-out
// member themselves (text, Slack, in person), rather than the app emailing
// a reset link. A short 24h expiry (vs. Invite's 7 days) since this is a
// more sensitive action than a first-time join.
export async function createPasswordReset(
  teamMemberId: string,
): Promise<ActionResultData<{ token: string }>> {
  return runAction(async () => {
    const { user, team, membershipRole } = await requireUser();
    if (!isLeaderRole(membershipRole)) {
      return { ok: false, error: "Only a worship leader can reset someone's password." };
    }

    const member = await prisma.teamMember.findUnique({ where: { id: teamMemberId } });
    if (!member || member.teamId !== team.id) {
      return { ok: false, error: "Team member not found." };
    }
    if (!member.userId) {
      return { ok: false, error: "This person hasn't created an account yet — invite them instead." };
    }

    const expiresAt = new Date(Date.now() + RESET_DURATION_HOURS * 60 * 60 * 1000);

    // Void any earlier unused reset links for this person so only the
    // newest one works — same reasoning as Invite reusing a pending row.
    const reset = await prisma.$transaction(async (tx) => {
      await tx.passwordReset.updateMany({
        where: { userId: member.userId!, usedAt: null },
        data: { usedAt: new Date() },
      });
      return tx.passwordReset.create({
        data: { userId: member.userId!, expiresAt, createdByUserId: user.id },
      });
    });

    trackEvent(team.id, "password_reset_created", { userId: user.id, entityId: reset.id });
    revalidatePath("/team");
    return { ok: true, data: { token: reset.token } };
  });
}

export type PasswordResetInfo =
  | { status: "valid" }
  | { status: "not_found" }
  | { status: "expired" }
  | { status: "used" };

export async function getPasswordResetInfo(token: string): Promise<PasswordResetInfo> {
  const reset = await prisma.passwordReset.findUnique({ where: { token } });
  if (!reset) return { status: "not_found" };
  if (reset.usedAt) return { status: "used" };
  if (reset.expiresAt < new Date()) return { status: "expired" };
  return { status: "valid" };
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<ActionResult> {
  return runAction(async () => {
    if (newPassword.length < 8) return { ok: false, error: "New password must be at least 8 characters." };

    const reset = await prisma.passwordReset.findUnique({ where: { token } });
    if (!reset) return { ok: false, error: "This reset link isn't valid." };
    if (reset.usedAt) return { ok: false, error: "This reset link has already been used." };
    if (reset.expiresAt < new Date()) return { ok: false, error: "This reset link has expired." };

    const passwordHash = await hashPassword(newPassword);
    await prisma.$transaction([
      prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
      prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    ]);

    await createSession({ userId: reset.userId });
    return { ok: true };
  });
}
