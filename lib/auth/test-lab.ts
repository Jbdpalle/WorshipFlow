import { prisma } from "@/lib/db/prisma";
import { isSuperAdmin } from "@/lib/auth/super-admin";

// The Test Lab is an ordinary Church + Team, so it is isolated from every
// real church by the same Membership rule as everything else: nobody sees
// its sets, songs or roster unless they hold a Membership on it, and only
// the two accounts in lib/auth/super-admin.ts are ever given one. There is
// no per-row "is test" flag to forget to filter on.
export const TEST_LAB_CHURCH_NAME = "WorshipFlow Test Lab";
export const TEST_LAB_TEAM_NAME = "Test Lab";

// A church counts as the Test Lab only if it has that name AND is owned by a
// super admin — so another user can't claim the identity just by naming
// their own church the same.
export async function findTestLabChurch() {
  const candidates = await prisma.church.findMany({
    where: { name: TEST_LAB_CHURCH_NAME },
    include: { owner: { select: { email: true } }, teams: true },
    orderBy: { createdAt: "asc" },
  });
  return candidates.find((c) => isSuperAdmin(c.owner.email)) ?? null;
}

export async function isTestLabChurchId(churchId: string): Promise<boolean> {
  const lab = await findTestLabChurch();
  return !!lab && lab.id === churchId;
}
