"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser, isLeaderRole } from "@/lib/auth/guard";
import { seedDemoDataForTeam } from "@/lib/songs/seed-demo-data";
import { runAction, type ActionResult } from "@/lib/actions/action-result";

// A real signup starts empty (see registerUser) — this lets a leader pull
// in the same sample songs/roster on request, to explore before entering
// their own team's real data. Gated to an empty library so it can't be
// used to re-seed duplicates into a team that already has real content.
export async function loadSampleData(): Promise<ActionResult> {
  return runAction(async () => {
    const { team, membershipRole } = await requireUser();
    if (!isLeaderRole(membershipRole)) {
      return { ok: false, error: "Only the worship leader can load sample data." };
    }
    const existingSongCount = await prisma.song.count({ where: { teamId: team.id } });
    if (existingSongCount > 0) {
      return { ok: false, error: "This team already has songs — sample data is only for an empty library." };
    }

    await seedDemoDataForTeam(team.id);

    revalidatePath("/songs");
    revalidatePath("/team");
    revalidatePath("/dashboard");
    return { ok: true };
  });
}
