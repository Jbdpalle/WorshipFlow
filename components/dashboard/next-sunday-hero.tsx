import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CalendarHeart } from "lucide-react";
import type { DashboardSet } from "@/lib/dashboard/data";

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NextSundayHero({ nextSunday }: { nextSunday: DashboardSet | null }) {
  if (!nextSunday) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <CalendarHeart className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
        <h2 className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          No upcoming service
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          There isn&apos;t a Sunday service scheduled yet.
        </p>
        <Link href="/sets/new" className="mt-4 inline-block">
          <Button>Schedule Service</Button>
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Next Sunday
        </h2>
        {nextSunday.serviceDate && (
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {formatDate(new Date(nextSunday.serviceDate))}
          </span>
        )}
      </div>

      <h1 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">{nextSunday.title}</h1>

      {nextSunday.theme ? (
        <p className="mt-1 text-sm font-medium uppercase tracking-wide text-accent">
          {nextSunday.theme}
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">
          Theme not set ·{" "}
          <Link href={`/sets/${nextSunday.id}`} className="underline hover:text-foreground">
            Add Theme
          </Link>
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Worship Leader</p>
          {nextSunday.leaderName ? (
            <p className="text-base font-medium text-foreground">{nextSunday.leaderName}</p>
          ) : (
            <Link
              href={`/sets/${nextSunday.id}`}
              className="text-base font-medium text-accent underline"
            >
              Assign Leader
            </Link>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            {nextSunday.songCount} song{nextSunday.songCount === 1 ? "" : "s"} · {nextSunday.teamMemberCount}{" "}
            team member{nextSunday.teamMemberCount === 1 ? "" : "s"}
          </p>
        </div>

        <Link href={`/sets/${nextSunday.id}`}>
          <Button size="lg">View Set →</Button>
        </Link>
      </div>
    </section>
  );
}
