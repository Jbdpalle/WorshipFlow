"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
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
          <CalendarDays className="h-4 w-4 text-stage-plan" aria-hidden /> Worship calendar
        </CardTitle>
        <div className="flex items-center gap-1">
          <IconButton label="Previous month" onClick={goPrevMonth}>
            <ChevronLeft className="h-5 w-5" />
          </IconButton>
          <Button type="button" variant="outline" onClick={goToday}>
            Today
          </Button>
          <IconButton label="Next month" onClick={goNextMonth}>
            <ChevronRight className="h-5 w-5" />
          </IconButton>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-center text-base font-bold text-foreground" aria-live="polite">
          {firstOfMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </p>

        <div className={cn("grid grid-cols-7 gap-1 text-center", pending && "opacity-50")}>
          {WEEKDAY_LABELS.map((w, i) => (
            <div key={i} className="text-xs font-bold uppercase text-muted-foreground">
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
                  "tnum relative flex h-11 flex-col items-center justify-center rounded-lg text-sm tap-target",
                  isSelected
                    ? "bg-primary font-bold text-primary-foreground"
                    : isToday
                      ? "border-2 border-primary font-bold text-foreground"
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
                      "absolute bottom-1 h-2 w-2 rounded-full",
                      entry.hasRoster
                        ? isSelected
                          ? "bg-primary-foreground"
                          : "bg-primary"
                        : isSelected
                          ? "border-2 border-primary-foreground"
                          : "border-2 border-warning",
                    )}
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>

        <p className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden /> Team assigned
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full border-2 border-warning" aria-hidden /> Service, no team yet
          </span>
        </p>

        {selectedDate && (
          <div className="rounded-xl border border-border bg-surface-muted p-4">
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
            {error && <p role="alert" className="mt-1 text-sm text-danger">{error}</p>}

            {selectedEntry ? (
              <div className="mt-2 space-y-2.5">
                <ServiceRosterList
                  roster={selectedEntry.roster}
                  setId={selectedEntry.setId}
                  canManage={isLeaderView}
                  emptyActionLabel="Assign team"
                />
                <div className="flex flex-wrap gap-2">
                  <ButtonLink href={`/sets/${selectedEntry.setId}`} variant="outline">
                      View service
                    </ButtonLink>
                  {isLeaderView && selectedEntry.hasRoster && (
                    <ButtonLink href={`/sets/${selectedEntry.setId}#team`} variant="outline">
                        Edit roster
                      </ButtonLink>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-muted-foreground">No service scheduled.</p>
                {isLeaderView && (
                  <Button loading={creating} disabled={creating} onClick={handleCreateService}>
                    {creating ? "Creating…" : "Schedule service"}
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
