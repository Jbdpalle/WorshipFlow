import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { readSession } from "@/lib/auth/session";

// The MVP is single-team-per-user: a worship leader signs up, gets an owned
// Team, and every teammate they add is a roster entry inside that same Team.
// This keeps tenancy isolation simple (one team per session) while leaving
// room for multi-team support later without a schema change.
export async function requireUser() {
  const session = await readSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      ownedTeams: true,
      memberships: { include: { team: true } },
    },
  });

  if (!user) redirect("/login");

  const team = user.ownedTeams[0] ?? user.memberships[0]?.team;
  if (!team) redirect("/login");

  return { user, team };
}

export async function getOptionalUser() {
  const session = await readSession();
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId } });
}
