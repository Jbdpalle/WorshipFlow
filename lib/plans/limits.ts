import { prisma } from "@/lib/db/prisma";
import type { TeamPlan } from "@prisma/client";

// Numeric ceilings for the Free plan — every non-demo team defaults to
// FREE (see Team.plan). PRO lifts these entirely; there's no billing flow
// yet, so a team only reaches PRO by a manual/future upgrade step.
export const FREE_LIMITS = {
  maxActiveSets: 3,
  maxTeamMembers: 6,
};

// The demo trial is deliberately stricter than Free, and independent of
// Team.plan — it's keyed off User.isDemo so a demo account stays capped
// even though its team row is also nominally FREE.
export const DEMO_LIMITS = {
  maxSongs: 1,
  maxActiveSets: 1,
  maxInvites: 1,
  days: 14,
};

type LimitCheck = { ok: true } | { ok: false; error: string };

export async function checkCanCreateSet(
  teamId: string,
  plan: TeamPlan,
  isDemo: boolean,
): Promise<LimitCheck> {
  const count = await prisma.worshipSet.count({ where: { teamId, archivedAt: null } });
  if (isDemo) {
    if (count >= DEMO_LIMITS.maxActiveSets) {
      return {
        ok: false,
        error: `The WorshipFlow demo is limited to ${DEMO_LIMITS.maxActiveSets} set so you can focus on trying the full workflow — create a free account for more.`,
      };
    }
    return { ok: true };
  }
  if (plan === "PRO") return { ok: true };
  if (count >= FREE_LIMITS.maxActiveSets) {
    return {
      ok: false,
      error: `Free plan is limited to ${FREE_LIMITS.maxActiveSets} active sets. Archive an older one or upgrade to add more.`,
    };
  }
  return { ok: true };
}

export async function checkCanCreateSong(teamId: string, isDemo: boolean): Promise<LimitCheck> {
  if (!isDemo) return { ok: true }; // Free plan has no song-count ceiling, only sets/members
  const count = await prisma.song.count({ where: { teamId } });
  if (count >= DEMO_LIMITS.maxSongs) {
    return {
      ok: false,
      error: `The WorshipFlow demo is limited to ${DEMO_LIMITS.maxSongs} song so you can focus on trying the full workflow — create a free account for more.`,
    };
  }
  return { ok: true };
}

export async function checkCanAddTeamMember(
  teamId: string,
  plan: TeamPlan,
  isDemo: boolean,
): Promise<LimitCheck> {
  // Roster-only entries (no login) aren't the limited resource for a demo
  // — invites are (see checkCanInvite) — so demo accounts aren't capped here.
  if (isDemo) return { ok: true };
  if (plan === "PRO") return { ok: true };
  const count = await prisma.teamMember.count({ where: { teamId } });
  if (count >= FREE_LIMITS.maxTeamMembers) {
    return {
      ok: false,
      error: `Free plan is limited to ${FREE_LIMITS.maxTeamMembers} team members. Upgrade to add more.`,
    };
  }
  return { ok: true };
}

export async function checkCanInvite(teamId: string, isDemo: boolean): Promise<LimitCheck> {
  if (!isDemo) return { ok: true }; // Free plan's member cap is enforced in checkCanAddTeamMember
  const count = await prisma.invite.count({ where: { teamId } });
  if (count >= DEMO_LIMITS.maxInvites) {
    return {
      ok: false,
      error: `The WorshipFlow demo allows inviting ${DEMO_LIMITS.maxInvites} teammate — create a free account to invite your whole team.`,
    };
  }
  return { ok: true };
}
