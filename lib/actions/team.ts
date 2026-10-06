"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guard";
import { ensurePrimaryTeamMemberRole } from "@/lib/songs/team-member-roles";
import { runAction, type ActionResult } from "@/lib/actions/action-result";
import { checkCanAddTeamMember } from "@/lib/plans/limits";

export async function addTeamMember(input: {
  name: string;
  role: string;
  instrument?: string;
  bio?: string;
}): Promise<ActionResult> {
  return runAction(async () => {
    const { user, team } = await requireUser();
    const limit = await checkCanAddTeamMember(team.id, team.plan, user.isDemo);
    if (!limit.ok) return limit;
    const member = await prisma.teamMember.create({
      data: {
        teamId: team.id,
        name: input.name,
        role: input.role,
        instrument: input.instrument || null,
        bio: input.bio || null,
      },
    });
    await ensurePrimaryTeamMemberRole(prisma, member.id, input.role);
    revalidatePath("/team");
    return { ok: true };
  });
}

export async function updateTeamMember(
  memberId: string,
  input: Partial<{ name: string; role: string; instrument: string; bio: string }>,
): Promise<ActionResult> {
  return runAction(async () => {
    const { team } = await requireUser();
    const member = await prisma.teamMember.findUnique({ where: { id: memberId } });
    if (!member || member.teamId !== team.id) return { ok: false, error: "Not found." };
    await prisma.teamMember.update({ where: { id: memberId }, data: input });
    if (input.role) await ensurePrimaryTeamMemberRole(prisma, memberId, input.role);
    revalidatePath("/team");
    return { ok: true };
  });
}

export async function removeTeamMember(memberId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { team } = await requireUser();
    const member = await prisma.teamMember.findUnique({ where: { id: memberId } });
    if (!member || member.teamId !== team.id) return { ok: false, error: "Not found." };
    await prisma.teamMember.delete({ where: { id: memberId } });
    revalidatePath("/team");
    return { ok: true };
  });
}
