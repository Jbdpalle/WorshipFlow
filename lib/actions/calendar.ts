"use server";

import { requireUser } from "@/lib/auth/guard";
import { getCalendarMonthData, type CalendarDateEntry } from "@/lib/dashboard/data";
import { runAction, type ActionResultData } from "@/lib/actions/action-result";

// Read-only — any team member (Leader or Member) can view the calendar.
// Mutations (scheduling a service, assigning a team) go through the
// existing createSet/assignMemberToSet actions, which already enforce
// Leader-only server-side.
export async function getCalendarMonth(year: number, month: number): Promise<ActionResultData<CalendarDateEntry[]>> {
  return runAction(async () => {
    const { team } = await requireUser();
    const entries = await getCalendarMonthData(team.id, year, month);
    return { ok: true, data: entries };
  });
}
