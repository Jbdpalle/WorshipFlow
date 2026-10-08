"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceRosterList } from "@/components/dashboard/service-roster-list";
import { getCalendarMonth } from "@/lib/actions/calendar";
import { createSet } from "@/lib/actions/sets";
import { eventTypeLabel } from "@/lib/songs/constants";
import type { CalendarDateEntry } from "@/lib/dashboard/data";
import { cn } from "@/lib/utils/cn";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// A focused worship-team service calendar, not a general calendar app:
// month navigation, service indicators, and tap/click (never hover-only)
// to see or manage a date's roster. Reuses the existing WorshipSet/
// SetTeamMember data and actions — no second scheduling system.
export function WorshipCalendar({
  initialYear,
  initialMonth,
  initialEntries,
  isLeaderView,
}: {
  initialYear: number;
  initialMonth: number; // 0-indexed, JS Date convention
  initialEntries: CalendarDateEntry[];
  isLeaderView: boolean;
}) {
  const router = useRouter();
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [entries, setEntries] = useState(initialEntries);
  const [pending, startTransition] = useTransition();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayKey = toDateKey(new Date());

  function loadMonth(y: number, m: number) {
    setYear(y);
    setMonth(m);
    setError(null);
    startTransition(async () => {
      const result = await getCalendarMonth(y, m);
      if (result.ok) setEntries(result.data);
    });
  }

  function goPrevMonth() {
    const d = new Date(year, month - 1, 1);
    loadMonth(d.getFullYear(), d.getMonth());
  }
  function goNextMonth() {
    const d = new Date(year, month + 1, 1);
    loadMonth(d.getFullYear(), d.getMonth());
  }
  function goToday() {
    const t = new Date();
    loadMonth(t.getFullYear(), t.getMonth());
    setSelectedDate(todayKey);
  }

  const entriesByDate = new Map(entries.map((e) => [e.date, e]));

  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedEntry = selectedDate ? (entriesByDate.get(selectedDate) ?? null) : null;

  async function handleCreateService() {
    if (!selectedDate) return;
    setCreating(true);
    setError(null);
    const title = new Date(selectedDate).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    const result = await createSet({ title, serviceDate: selectedDate });
    if (!result.ok) {
      setError(result.error);
      setCreating(false);
      return;
    }
    const refreshed = await getCalendarMonth(year, month);
    if (refreshed.ok) setEntries(refreshed.data);
    setCreating(false);
    router.refresh();
  }

  return (
    <Card id="worship-calendar">
      <CardHeader className="flex items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-4 w-4 text-accent" /> Worship Calendar
        </CardTitle>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goPrevMonth}
            aria-label="Previous month"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-muted tap-target"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-surface-muted tap-target"
          >
            Today
          </button>
          <button
            type="button"
            onClick={goNextMonth}
            aria-label="Next month"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-muted tap-target"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-center text-sm font-semibold text-foreground">
          {firstOfMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </p>

        <div className={cn("grid grid-cols-7 gap-1 text-center", pending && "opacity-50")}>
          {WEEKDAY_LABELS.map((w, i) => (
            <div key={i} className="text-[10px] font-semibold uppercase text-muted-foreground">
              {w}
            </div>
          ))}
          {cells.map((d, i) => {
            if (!d) return <div key={i} aria-hidden />;
            const key = toDateKey(d);
            const entry = entriesByDate.get(key);
            const isToday = key === todayKey;
            const isSelected = key === selectedDate;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedDate(isSelected ? null : key)}
                className={cn(
                  "relative flex h-9 flex-col items-center justify-center rounded-lg text-sm tap-target",
                  isSelected
                    ? "bg-accent font-semibold text-accent-foreground"
                    : isToday
                      ? "border border-accent font-semibold text-foreground"
                      : "text-foreground hover:bg-surface-muted",
                )}
                aria-label={
                  entry
                    ? `${d.toLocaleDateString(undefined, { month: "long", day: "numeric" })}: ${eventTypeLabel(entry.eventType)}${entry.hasRoster ? " with team assigned" : ", no team yet"}`
                    : d.toLocaleDateString(undefined, { month: "long", day: "numeric" })
                }
                aria-pressed={isSelected}
              >
                {d.getDate()}
                {entry && (
                  <span
                    className={cn(
                      "absolute bottom-1 h-1.5 w-1.5 rounded-full",
                      isSelected
                        ? "bg-accent-foreground"
                        : entry.hasRoster
                          ? "bg-accent"
                          : "bg-muted-foreground/50",
                    )}
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>

        {selectedDate && (
          <div className="rounded-lg border border-border bg-surface-muted p-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">
                {new Date(selectedDate).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              {selectedEntry && selectedEntry.eventType !== "SERVICE" && (
                <Badge variant="outline">{eventTypeLabel(selectedEntry.eventType)}</Badge>
              )}
            </div>
            {error && <p className="mt-1 text-xs text-danger">{error}</p>}

            {selectedEntry ? (
              <div className="mt-2 space-y-2.5">
                <ServiceRosterList
                  roster={selectedEntry.roster}
                  setId={selectedEntry.setId}
                  canManage={isLeaderView}
                  emptyActionLabel="Assign Team"
                />
                <div className="flex flex-wrap gap-2">
                  <Link href={`/sets/${selectedEntry.setId}`}>
                    <Button size="sm" variant="secondary">
                      View Service
                    </Button>
                  </Link>
                  {isLeaderView && selectedEntry.hasRoster && (
                    <Link href={`/sets/${selectedEntry.setId}#team`}>
                      <Button size="sm" variant="secondary">
                        Edit Roster
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-muted-foreground">No service scheduled.</p>
                {isLeaderView && (
                  <Button size="sm" disabled={creating} onClick={handleCreateService}>
                    {creating ? "Creating…" : "Schedule Service"}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
