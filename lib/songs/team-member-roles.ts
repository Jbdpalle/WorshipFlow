import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

// Keeps the multi-role set (TeamMemberRole) in sync with a member's
// primary `role` field. Additive only: adds the role if it's missing,
// never removes others, since a member's other roles are managed
// separately from the primary/display role.
export async function ensurePrimaryTeamMemberRole(db: Db, teamMemberId: string, role: string) {
  await db.teamMemberRole.upsert({
    where: { teamMemberId_role: { teamMemberId, role } },
    create: { teamMemberId, role },
    update: {},
  });
}
