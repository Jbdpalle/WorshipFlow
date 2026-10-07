"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guard";
import { runAction, type ActionResult } from "@/lib/actions/action-result";

export async function updateMyName(name: string): Promise<ActionResult> {
  return runAction(async () => {
    const { user, team } = await requireUser();
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, error: "Name can't be empty." };

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { name: trimmed } }),
      prisma.teamMember.updateMany({
        where: { userId: user.id, teamId: team.id },
        data: { name: trimmed },
      }),
    ]);

    revalidatePath("/", "layout");
    return { ok: true };
  });
}

export async function updateChurchName(name: string): Promise<ActionResult> {
  return runAction(async () => {
    const { team, church, membershipRole } = await requireUser();
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, error: "Church name can't be empty." };
    if (membershipRole !== "OWNER") {
      return { ok: false, error: "Only the church owner can rename it." };
    }

    await prisma.$transaction([
      prisma.church.update({ where: { id: church.id }, data: { name: trimmed } }),
      prisma.team.update({ where: { id: team.id }, data: { name: trimmed } }),
    ]);

    revalidatePath("/", "layout");
    return { ok: true };
  });
}
