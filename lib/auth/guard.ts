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

  return { user, team, church: membership.church, membershipRole: membership.role };
}

export async function getOptionalUser() {
  const session = await readSession();
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId } });
}
