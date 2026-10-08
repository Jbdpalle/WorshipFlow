// Presentation helpers for the Sets list: how far away a set is, who leads
// it, and which gaps to flag. Pure functions over data the page already
// has — no new rules about what makes a set "ready" (that lives in
// lib/songs/readiness.ts); these only describe what is visibly missing.

export type SetTone = "success" | "warning" | "danger" | "info" | "muted";
export type SetStatusChip = { tone: SetTone; label: string };

export type SetStatusInput = {
  serviceDate: Date | null;
  songCount: number;
  roster: { role: string; name: string }[];
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Whole calendar days from `now` to `date` (negative = in the past). */
export function daysUntil(date: Date, now: Date): number {
  return Math.round((startOfDay(date) - startOfDay(now)) / 86_400_000);
}

export function relativeDayLabel(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return days > 0 ? `In ${days} days` : `${-days} days ago`;
}

export function getLeaderName(roster: { role: string; name: string }[]): string | null {
  return roster.find((r) => r.role === "Worship Leader")?.name ?? null;
}

export function isPast(entry: { serviceDate: Date | null }, now: Date): boolean {
  return !!entry.serviceDate && daysUntil(entry.serviceDate, now) < 0;
}

/**
 * Status chips for a set card. Past sets get a single muted "Past" chip.
 * Upcoming sets get timing plus one chip per visible gap (no songs, no
 * team, no date), or a single confirmation when nothing is missing.
 */
export function getSetStatuses(entry: SetStatusInput, now: Date): SetStatusChip[] {
  if (!entry.serviceDate) {
    return [
      { tone: "warning", label: "No date yet" },
      ...gaps(entry),
    ];
  }
  const days = daysUntil(entry.serviceDate, now);
  if (days < 0) return [{ tone: "muted", label: "Past" }];

  const found = gaps(entry);
  return [
    { tone: days <= 1 ? "info" : "muted", label: relativeDayLabel(days) },
    ...(found.length > 0 ? found : [{ tone: "success" as const, label: "Songs and team set" }]),
  ];
}

function gaps(entry: SetStatusInput): SetStatusChip[] {
  const out: SetStatusChip[] = [];
  if (entry.songCount === 0) out.push({ tone: "warning", label: "No songs yet" });
  if (entry.roster.length === 0) out.push({ tone: "warning", label: "No team yet" });
  return out;
}
