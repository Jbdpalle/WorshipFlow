import Link from "next/link";
import { ListMusic, MapPin, UserRound, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Status } from "@/components/ui/status";
import { eventTypeLabel } from "@/lib/songs/constants";
import type { SetsPageEntry } from "@/lib/dashboard/data";
import { getLeaderName, getSetStatuses } from "@/lib/sets/set-status";
import { cn } from "@/lib/utils/cn";

// The date as a binder tab: weekday, big day number, month. Undated sets
// get a plain dash so the column stays aligned.
function DateTab({ date, muted }: { date: Date | null; muted?: boolean }) {
  return (
    <div
      className={cn(
        "flex w-16 shrink-0 flex-col items-center justify-center rounded-lg border border-border py-2",
        muted ? "bg-transparent text-muted-foreground" : "bg-surface-muted text-foreground",
      )}
      aria-hidden
    >
      {date ? (
        <>
          <span className="label-caps text-inherit">
            {date.toLocaleDateString(undefined, { weekday: "short" })}
          </span>
          <span className="tnum text-2xl font-extrabold leading-none">{date.getDate()}</span>
          <span className="label-caps text-inherit">
            {date.toLocaleDateString(undefined, { month: "short" })}
          </span>
        </>
      ) : (
        <span className="text-2xl font-extrabold">—</span>
      )}
    </div>
  );
}

// One set, scannable at a glance: DATE · NAME · LEADER · TEAM · SONGS ·
// STATUS. Upcoming sets are prominent; past ones are muted.
export function SetCard({
  entry,
  now,
  muted,
  highlight,
}: {
  entry: SetsPageEntry;
  now: Date;
  muted?: boolean;
  highlight?: boolean;
}) {
  const leader = getLeaderName(entry.roster);
  const statuses = getSetStatuses(entry, now);
  const dateLabel = entry.serviceDate
    ? entry.serviceDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "No date set";

  return (
    <Link
      href={`/sets/${entry.id}`}
      className="group block h-full rounded-xl"
    >
      <Card
        muted={muted}
        className={cn(
          "flex h-full gap-4 p-4 transition-colors duration-[var(--duration-fast)] group-hover:border-primary/50",
          highlight && "border-primary/60",
        )}
      >
        <DateTab date={entry.serviceDate} muted={muted} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className={cn("text-base font-bold", muted ? "text-muted-foreground" : "text-foreground")}>
              {entry.title}
            </h3>
            {highlight && <Badge variant="primary">Next up</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {eventTypeLabel(entry.eventType)}
            {entry.theme && (
              <>
                {" · "}
                <span className={muted ? "" : "font-semibold text-musical"}>{entry.theme}</span>
              </>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <UserRound className="h-4 w-4" aria-hidden />
              {leader ? `Led by ${leader}` : "No leader yet"}
            </span>
            <span className="tnum flex items-center gap-1.5">
              <Users className="h-4 w-4" aria-hidden />
              {entry.roster.length} on team
            </span>
            <span className="tnum flex items-center gap-1.5">
              <ListMusic className="h-4 w-4" aria-hidden />
              {entry.songCount} song{entry.songCount === 1 ? "" : "s"}
            </span>
            {entry.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" aria-hidden />
                {entry.location}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {statuses.map((s) => (
              <Status key={s.label} tone={s.tone}>
                {s.label}
              </Status>
            ))}
          </div>
        </div>
      </Card>
    </Link>
  );
}
