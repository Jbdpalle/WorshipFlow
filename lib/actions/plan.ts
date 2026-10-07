"use server";

import { revalidatePath } from "next/cache";
import type { TeamPlan } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guard";
import { runAction, type ActionResult } from "@/lib/actions/action-result";

// There's no billing integration — PRO is a manual flag a church owner/admin
// can set on their own team, same as any other setting. See the TeamPlan
// comment in schema.prisma.
export async function setTeamPlan(plan: TeamPlan): Promise<ActionResult> {
  return runAction(async () => {
    const { team, membershipRole } = await requireUser();
    if (membershipRole !== "OWNER" && membershipRole !== "ADMIN") {
      return { ok: false, error: "Only a church owner or admin can change the plan." };
    }
    await prisma.team.update({ where: { id: team.id }, data: { plan } });
    revalidatePath("/", "layout");
    return { ok: true };
  });
}
