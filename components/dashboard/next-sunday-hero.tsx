import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarHeart, ArrowRight } from "lucide-react";
import type { DashboardSet } from "@/lib/dashboard/data";
import { ServiceProgressPath } from "@/components/dashboard/service-progress-path";
import { ROLE_CATEGORY_ICONS } from "@/components/dashboard/role-coverage-icons";
import { ServiceRosterList } from "@/components/dashboard/service-roster-list";
import { Tooltip } from "@/components/ui/tooltip";

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export function NextSundayHero({
  nextSunday,
  isLeaderView,
}: {
  nextSunday: DashboardSet | null;
  isLeaderView: boolean;
}) {
  if (!nextSunday) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-8 text-center shadow-sm sm:p-12">
        <CalendarHeart className="mx-auto h-9 w-9 text-accent" aria-hidden />
        <h2 className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          No upcoming service
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          {isLeaderView
            ? "Schedule your next Sunday service to start planning the setlist, song flow, and team."
            : "Your worship leader hasn't scheduled the next service yet — check back soon."}
        </p>
        {isLeaderView && (
          <Link href="/sets/new" className="mt-5 inline-block">
            <Button size="lg">Schedule Service</Button>
          </Link>
        )}
      </section>
    );
  }

  const nextIncomplete = nextSunday.stages.find((s) => !s.complete);
  const allComplete = !nextIncomplete;

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Next Service
            </p>
            <h1 className="mt-1 text-3xl font-bold text-foreground sm:text-4xl">{nextSunday.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {nextSunday.serviceDate ? formatDate(new Date(nextSunday.serviceDate)) : "No date set"}
              {nextSunday.theme ? ` · ${nextSunday.theme}` : ""}
            </p>
          </div>
          {isLeaderView && (
            <Link href={allComplete ? `/rehearsal/${nextSunday.id}` : nextIncomplete!.href}>
              <Button size="lg">
                {allComplete ? "Start Rehearsal" : "Continue Planning"} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>

        <div className="mt-6 border-t border-border pt-5">
          <ServiceProgressPath stages={nextSunday.stages} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {nextIncomplete ? (
          <section className="rounded-xl border border-accent/30 bg-accent/10 p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-accent">Next Step</h2>
            <p className="mt-1.5 font-semibold text-foreground">{nextStepHeadline(nextIncomplete.key)}</p>
            <p className="mt-1 text-sm text-muted-foreground">{nextStepDescription(nextIncomplete.key)}</p>
            <Link href={nextIncomplete.href} className="mt-3 inline-block">
              <Button size="sm">
                Go to {nextIncomplete.label} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </section>
        ) : (
          <section className="rounded-xl border border-success/30 bg-success/10 p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-success">Next Step</h2>
            <p className="mt-1.5 font-semibold text-foreground">You&apos;re ready</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Setlist, Song Flow, Team, and Rehearsal are all set for Sunday.
            </p>
          </section>
        )}

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Who&apos;s Serving</CardTitle>
            <Link href={`/sets/${nextSunday.id}#team`} className="text-xs font-medium text-accent hover:underline">
              {isLeaderView ? "Edit Roster" : "View"}
            </Link>
          </CardHeader>
          <CardContent>
            <ServiceRosterList
              roster={nextSunday.serviceRoster}
              setId={nextSunday.id}
              canManage={isLeaderView}
            />
          </CardContent>
        </Card>

        {nextSunday.teamCoverage.length > 0 && (
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Team Coverage</CardTitle>
              <Link href="/team" className="text-xs font-medium text-accent hover:underline">
                View Team
              </Link>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {nextSunday.teamCoverage.map((row) => {
                const Icon = ROLE_CATEGORY_ICONS[row.key];
                return (
                  <div key={row.key} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" /> {row.label}
                    </span>
                    <Tooltip content={`${row.confirmed} of ${row.total} ${row.label.toLowerCase()} confirmed for this service`}>
                      <span tabIndex={0} className="flex items-center gap-1">
                        {Array.from({ length: Math.min(row.total, 6) }).map((_, i) => (
                          <span
                            key={i}
                            className={
                              i < row.confirmed
                                ? "h-2.5 w-2.5 rounded-full bg-accent"
                                : "h-2.5 w-2.5 rounded-full bg-surface-muted"
                            }
                            aria-hidden
                          />
                        ))}
                      </span>
                    </Tooltip>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Service Notes</CardTitle>
            <Link href={`/sets/${nextSunday.id}`} className="text-xs font-medium text-accent hover:underline">
              Edit
            </Link>
          </CardHeader>
          <CardContent>
            {nextSunday.notes?.trim() ? (
              <p className="whitespace-pre-line text-sm text-muted-foreground">{nextSunday.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No notes yet for this service.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function nextStepHeadline(stage: string) {
  switch (stage) {
    case "setlist":
      return "Build the setlist";
    case "songFlow":
      return "Add song flow details";
    case "team":
      return "Assign the team";
    case "rehearsal":
      return "Rehearse the set";
    default:
      return "Continue planning";
  }
}

function nextStepDescription(stage: string) {
  switch (stage) {
    case "setlist":
      return "Add songs to this service's setlist to get started.";
    case "songFlow":
      return "Add keys, arrangement notes, and transitions for each song.";
    case "team":
      return "Confirm who's playing before Sunday.";
    case "rehearsal":
      return "Run through the set together before the service.";
    default:
      return "";
  }
}
