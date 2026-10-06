"use server";

import { prisma } from "@/lib/db/prisma";
import { readSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { runAction, type ActionResult } from "@/lib/actions/action-result";
import { trackEvent } from "@/lib/usability/track";

// Converts a demo account (expired or not) into a real Free account by
// updating the same User row in place — same Church/Team/songs/sets, just
// a real email + password replacing the throwaway demo credentials and
// isDemo flipped off. No data is copied or rebuilt.
export async function convertDemoToFree(input: {
  name: string;
  email: string;
  password: string;
}): Promise<ActionResult> {
  return runAction(async () => {
    const session = await readSession();
    if (!session) return { ok: false, error: "Your session has expired — please log in again." };

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { churchMemberships: { include: { church: { include: { teams: true } } }, take: 1 } },
    });
    if (!user) return { ok: false, error: "Your session has expired — please log in again." };
    if (!user.isDemo) return { ok: false, error: "This account isn't a demo account." };

    const team = user.churchMemberships[0]?.church.teams[0];
    if (team) trackEvent(team.id, "free_signup_started", { userId: user.id });

    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    if (!name) return { ok: false, error: "Enter your name." };
    if (!email) return { ok: false, error: "Enter an email address." };
    if (input.password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== user.id) {
      return { ok: false, error: "An account with that email already exists." };
    }

    const passwordHash = await hashPassword(input.password);
    await prisma.user.update({
      where: { id: user.id },
      data: { name, email, passwordHash, isDemo: false, demoExpiresAt: null },
    });

    return { ok: true };
  });
}
