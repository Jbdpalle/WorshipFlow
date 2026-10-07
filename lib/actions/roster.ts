"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser, isLeaderRole } from "@/lib/auth/guard";
import { runAction, type ActionResultData } from "@/lib/actions/action-result";
import { checkCanCreateSet } from "@/lib/plans/limits";

function formatServiceTitle(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export type GenerateWeeklyServicesResult = {
  created: { id: string; title: string; serviceDate: string }[];
  skippedExisting: number;
  limitReachedAfter: number | null; // how many were created before a plan limit stopped the rest, or null if never hit
};

// The fast path for "plan the next N Sundays": one weekday, a date range,
// done — not a general recurrence engine. Skips any date that already has
// a WorshipSet (so re-running this for an overlapping range is safe and
// never creates duplicates), and stops cleanly (keeping what it already
// made) if a plan limit is hit partway through rather than failing the
// whole batch.
export async function generateWeeklyServices(input: {
  startDate: string;
  endDate: string;
  weekday: number; // 0 (Sunday) .. 6 (Saturday), JS Date convention
  titlePrefix?: string;
}): Promise<ActionResultData<GenerateWeeklyServicesResult>> {
  return runAction(async () => {
    const { user, team, membershipRole } = await requireUser();
    if (!isLeaderRole(membershipRole)) {
      return { ok: false, error: "Only the worship leader can plan the roster." };
    }
    if (input.weekday < 0 || input.weekday > 6) {
      return { ok: false, error: "Invalid day of week." };
    }

    const start = new Date(input.startDate);
    const end = new Date(input.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return { ok: false, error: "Pick a valid start and end date." };
    }
    // A generous but real ceiling — this is a weekly-Sundays planner, not a
    // bulk data-loading tool; 2 years of one weekday is already 100+ dates.
    const spanDays = (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
    if (spanDays > 730) {
      return { ok: false, error: "That range is too long — try 2 years or less." };
    }

    const dates: Date[] = [];
    const first = new Date(start);
    const dayDiff = (input.weekday - first.getDay() + 7) % 7;
    first.setDate(first.getDate() + dayDiff);
    for (let d = new Date(first); d <= end; d.setDate(d.getDate() + 7)) {
      dates.push(new Date(d));
    }
    if (dates.length === 0) {
      return { ok: false, error: "No matching dates in that range." };
    }

    const existingSets = await prisma.worshipSet.findMany({
      where: { teamId: team.id, serviceDate: { gte: start, lte: end } },
      select: { serviceDate: true },
    });

    const created: GenerateWeeklyServicesResult["created"] = [];
    let skippedExisting = 0;
    let limitReachedAfter: number | null = null;

    for (const date of dates) {
      if (existingSets.some((s) => s.serviceDate && sameDay(s.serviceDate, date))) {
        skippedExisting++;
        continue;
      }
      const limit = await checkCanCreateSet(team.id, team.plan, user.isDemo);
      if (!limit.ok) {
        limitReachedAfter = created.length;
        break;
      }
      const set = await prisma.worshipSet.create({
        data: {
          teamId: team.id,
          title: input.titlePrefix ? `${input.titlePrefix} — ${formatServiceTitle(date)}` : formatServiceTitle(date),
          serviceDate: date,
        },
      });
      created.push({ id: set.id, title: set.title, serviceDate: date.toISOString() });
    }

    revalidatePath("/roster");
    revalidatePath("/sets");
    revalidatePath("/dashboard");
    return { ok: true, data: { created, skippedExisting, limitReachedAfter } };
  });
}

export type CopyRosterResult = { copied: number; skippedAlreadyAssigned: number };

// Copies a service's whole-team roster (SetTeamMember rows) onto another
// service. Merge semantics, never overwrite: a role this person already
// holds on the target (same teamMemberId + role) is left untouched, and
// nothing on the target is removed — the director reviews and edits the
// copy afterward rather than risk silently clobbering work already done
// on the target date.
export async function copyRosterToSet(fromSetId: string, toSetId: string): Promise<ActionResultData<CopyRosterResult>> {
  return runAction(async () => {
    const { team, membershipRole } = await requireUser();
    if (!isLeaderRole(membershipRole)) {
      return { ok: false, error: "Only the worship leader can copy the roster." };
    }
    if (fromSetId === toSetId) return { ok: false, error: "Pick a different service to copy to." };

    const [fromSet, toSet] = await Promise.all([
      prisma.worshipSet.findUnique({ where: { id: fromSetId }, include: { teamMembers: true } }),
      prisma.worshipSet.findUnique({ where: { id: toSetId }, include: { teamMembers: true } }),
    ]);
    if (!fromSet || fromSet.teamId !== team.id) return { ok: false, error: "Source service not found." };
    if (!toSet || toSet.teamId !== team.id) return { ok: false, error: "Target service not found." };

    const existingKeys = new Set(toSet.teamMembers.map((m) => `${m.teamMemberId}:${m.role}`));
    let copied = 0;
    let skippedAlreadyAssigned = 0;
    for (const row of fromSet.teamMembers) {
      const key = `${row.teamMemberId}:${row.role}`;
      if (existingKeys.has(key)) {
        skippedAlreadyAssigned++;
        continue;
      }
      await prisma.setTeamMember.create({
        data: { setId: toSetId, teamMemberId: row.teamMemberId, role: row.role },
      });
      copied++;
    }

    revalidatePath("/roster");
    revalidatePath(`/sets/${toSetId}`);
    revalidatePath("/dashboard");
    return { ok: true, data: { copied, skippedAlreadyAssigned } };
  });
}
