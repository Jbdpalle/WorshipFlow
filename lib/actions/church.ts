"use server";

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guard";
import { destroySession } from "@/lib/auth/session";
import { runAction, type ActionResult } from "@/lib/actions/action-result";

// Owner-only, irreversible: every Team, Song, WorshipSet, TeamMember,
// Invite, and Membership under this church cascades away with it (see the
// onDelete: Cascade chain in schema.prisma starting from Church). The
// caller's own session is destroyed in the same breath, since they have
// nothing left to be logged into.
export async function deleteChurch(confirmName: string): Promise<ActionResult> {
  return runAction(async () => {
    const { church, membershipRole } = await requireUser();
    if (membershipRole !== "OWNER") {
      return { ok: false, error: "Only the church owner can delete it." };
    }
    if (confirmName.trim() !== church.name) {
      return { ok: false, error: "Type the church's exact name to confirm." };
    }
    await prisma.church.delete({ where: { id: church.id } });
    await destroySession();
    return { ok: true };
  });
}
