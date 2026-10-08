import { ArrowRight, CalendarHeart } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { DashboardSet } from "@/lib/dashboard/data";
import { ServiceProgressPath } from "@/components/dashboard/service-progress-path";

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

// The one focal point of the Dashboard: what is the next service, what is
// the next step, and the single primary action.
export function NextSundayHero({
  nextSunday,
  isLeaderView,
}: {
  nextSunday: DashboardSet | null;
  isLeaderView: boolean;
}) {
  if (!nextSunday) {
    return (
      <EmptyState
        icon={CalendarHeart} stage="plan"
        title="No upcoming service"
        description={
          isLeaderView
            ? "Schedule your next service to start planning the set, song flow and team."
            : "Your worship leader hasn't scheduled the next service yet. Check back soon."
        }
        action={
          isLeaderView ? (
            <ButtonLink href="/sets/new" size="lg">Schedule service</ButtonLink>
          ) : undefined
        }
        className="py-14"
      />
    );
  }

  const nextIncomplete = nextSunday.stages.find((s) => !s.complete);
  const allComplete = !nextIncomplete;
  const leader = nextSunday.effectiveLeaderName;
  const meta = [
    nextSunday.serviceDate ? formatDate(new Date(nextSunday.serviceDate)) : "No date set",
    nextSunday.theme,
    leader ? `Led by ${leader}` : null,
  ].filter(Boolean);

  return (
    <Card className="p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 space-y-1">
          <p className="label-caps">Next service</p>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {nextSunday.title}
          </h2>
          <p className="text-sm text-muted-foreground">{meta.join(" · ")}</p>
        </div>
        {isLeaderView ? (
          <ButtonLink href={allComplete ? `/rehearsal/${nextSunday.id}` : nextIncomplete!.href} size="lg">
              {allComplete ? "Start rehearsal" : "Continue planning"}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
        ) : (
          <ButtonLink href="/my-part" size="lg">
              Open my part <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
        )}
      </div>

      {nextSunday.notes?.trim() && (
        <div className="mt-5 rounded-lg bg-musical-soft px-4 py-3">
          <p className="label-caps text-musical">Leader&apos;s note</p>
          <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-foreground">
            {nextSunday.notes}
          </p>
        </div>
      )}

      <div className="mt-6 border-t border-border pt-5">
        <ServiceProgressPath stages={nextSunday.stages} />
        <p className="mt-4 text-sm text-muted-foreground">
          {nextIncomplete ? (
            <>
              <span className="font-semibold text-foreground">Next:</span>{" "}
              {nextStepHeadline(nextIncomplete.key)}. {nextStepDescription(nextIncomplete.key)}
            </>
          ) : (
            <>
              <span className="font-semibold text-foreground">You&apos;re ready.</span> Setlist,
              song flow, team and rehearsal are all set.
            </>
          )}
        </p>
      </div>
    </Card>
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
      return "Add songs to get started.";
    case "songFlow":
      return "Add keys, arrangement notes and transitions for each song.";
    case "team":
      return "Confirm who's playing before the service.";
    case "rehearsal":
      return "Run through the set together.";
    default:
      return "";
  }
}
