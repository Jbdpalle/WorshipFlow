"use server";

import { revalidatePath } from "next/cache";
import type { TeamPlan } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guard";
import { runAction, type ActionResult } from "@/lib/actions/action-result";

// There's no billing integration — PRO is a manual flag the church owner
// can set on their own team, same as any other billing-adjacent setting.
// See the TeamPlan comment in schema.prisma.
export async function setTeamPlan(plan: TeamPlan): Promise<ActionResult> {
  return runAction(async () => {
    const { team, membershipRole } = await requireUser();
    if (membershipRole !== "OWNER") {
      return { ok: false, error: "Only the church owner can change the plan." };
    }
    await prisma.team.update({ where: { id: team.id }, data: { plan } });
    revalidatePath("/", "layout");
    return { ok: true };
  });
}
