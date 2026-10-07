"use server";

import { revalidatePath } from "next/cache";
import type { TeamPlan } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guard";
import { isSuperAdmin } from "@/lib/auth/super-admin";
import { runAction, type ActionResult, type ActionResultData } from "@/lib/actions/action-result";

// Plan enforcement is currently switched off app-wide for the beta period
// (see BETA_ALL_TEAMS_UNRESTRICTED in lib/plans/limits.ts), so changing a
// team's plan has no practical effect on anyone's limits right now — this
// exists so the two designated accounts can start setting real plans ahead
// of when pricing actually goes live, without a churn of UI work later.
// No self-serve checkout, no billing UI — just the field.
export type AdminTeamRow = {
  id: string;
  name: string;
  churchName: string;
  plan: TeamPlan;
  ownerEmail: string;
  memberCount: number;
  activeSetCount: number;
};

export async function listAllTeamsForAdmin(): Promise<ActionResultData<AdminTeamRow[]>> {
  return runAction(async () => {
    const { user } = await requireUser();
    if (!isSuperAdmin(user.email)) {
      return { ok: false, error: "Not authorized." };
    }

    const teams = await prisma.team.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        church: { select: { name: true } },
        owner: { select: { email: true } },
        _count: { select: { members: true } },
      },
    });
    const activeSetCounts = await prisma.worshipSet.groupBy({
      by: ["teamId"],
      where: { teamId: { in: teams.map((t) => t.id) }, archivedAt: null },
      _count: { _all: true },
    });
    const activeSetCountByTeam = new Map(activeSetCounts.map((c) => [c.teamId, c._count._all]));

    return {
      ok: true,
      data: teams.map((t) => ({
        id: t.id,
        name: t.name,
        churchName: t.church.name,
        plan: t.plan,
        ownerEmail: t.owner.email,
        memberCount: t._count.members,
        activeSetCount: activeSetCountByTeam.get(t.id) ?? 0,
      })),
    };
  });
}

export async function setTeamPlan(teamId: string, plan: TeamPlan): Promise<ActionResult> {
  return runAction(async () => {
    const { user } = await requireUser();
    if (!isSuperAdmin(user.email)) {
      return { ok: false, error: "Not authorized." };
    }

    const team = await prisma.team.findUnique({ where: { id: teamId }, select: { id: true } });
    if (!team) return { ok: false, error: "Team not found." };

    await prisma.team.update({ where: { id: teamId }, data: { plan } });
    revalidatePath("/admin");
    return { ok: true };
  });
}
