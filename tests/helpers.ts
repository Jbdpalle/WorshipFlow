import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

// Creates a full User -> Church -> Membership -> Team graph directly via
// Prisma (the same shape registerUser builds), then signs this test
// process's session cookie as that user — so a Server Action's own
// requireUser() call resolves exactly as it would for a real logged-in
// request, without going through the HTTP/signup layer.
export async function createTestTeam(label: string, role: "OWNER" | "ADMIN" | "LEADER" | "MEMBER" = "OWNER") {
  const stamp = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const user = await prisma.user.create({
    data: {
      name: `Test ${label}`,
      email: `${stamp}@test.invalid`,
      passwordHash: await hashPassword("irrelevant-not-logged-in-via-password"),
    },
  });
  const church = await prisma.church.create({ data: { name: `Test Church ${stamp}`, ownerId: user.id } });
  await prisma.membership.create({ data: { userId: user.id, churchId: church.id, role } });
  const team = await prisma.team.create({ data: { name: `Test Team ${stamp}`, ownerId: user.id, churchId: church.id } });

  return { user, church, team };
}

export async function loginAs(userId: string) {
  await createSession({ userId });
}

export async function cleanupTeam(teamId: string, churchId: string) {
  // Church cascade-deletes Membership/Team and everything hanging off the
  // Team (songs, sets, etc.) per the schema's onDelete: Cascade chain.
  await prisma.church.delete({ where: { id: churchId } }).catch(() => {});
  void teamId;
}
