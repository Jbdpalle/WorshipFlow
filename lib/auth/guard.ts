import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { readSession } from "@/lib/auth/session";

// Tenant isolation is granted by Membership, not by team ownership: a user
// only ever gets a `team` back if they hold a Membership on the Church that
// team belongs to. A user can belong to more than one church; until a
// church switcher exists in the UI, we resolve to their oldest membership
// (their "home" church) so every existing call site that destructures
// `{ team }` keeps working unchanged.
export async function requireUser() {
  const session = await readSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      churchMemberships: {
        orderBy: { createdAt: "asc" },
        include: { church: { include: { teams: true } } },
      },
    },
  });

  if (!user) redirect("/login");

  const membership = user.churchMemberships[0];
  const team = membership?.church.teams[0];
  if (!membership || !team) redirect("/login");

  // A demo account past its 14-day window loses access to every (app)
  // route uniformly — enforced here once, rather than per-page — but
  // never gets its data deleted (see /demo-expired, which reads the
  // session directly rather than through this same gate, to avoid a
  // redirect loop).
  if (user.isDemo && user.demoExpiresAt && user.demoExpiresAt < new Date()) {
    redirect("/demo-expired");
  }

  return { user, team, church: membership.church, membershipRole: membership.role };
}

export async function getOptionalUser() {
  const session = await readSession();
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId } });
}

// Server-side gate for leader-only actions — re-checked here independent of
// whatever the UI shows, per SEC-04 (client-side hiding is not security).
export function isLeaderRole(role: string): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "LEADER";
}
