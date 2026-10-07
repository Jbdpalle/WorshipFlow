import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { requireUser, isLeaderRole } from "@/lib/auth/guard";
import { getRosterPageData } from "@/lib/dashboard/data";
import { ServiceRosterList } from "@/components/dashboard/service-roster-list";
import { ImportRosterDialog } from "@/components/team/import-roster-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { eventTypeLabel } from "@/lib/songs/constants";

// Image-based roster import calls the Anthropic API, which can take longer
// than Vercel's default serverless timeout — see the same note on
// app/(app)/songs/page.tsx.
export const maxDuration = 60;

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export default async function RosterPage() {
  const { team, membershipRole } = await requireUser();
  const isLeader = isLeaderRole(membershipRole);
  const entries = await getRosterPageData(team.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Roster</h1>
          <p className="text-sm text-muted-foreground">
            Who&apos;s serving, service by service — import a schedule and it shows up here.
          </p>
        </div>
        {isLeader && <ImportRosterDialog />}
      </div>

      {entries.length === 0 ? (
        <section className="rounded-2xl border border-border bg-surface p-8 text-center shadow-sm sm:p-12">
          <ClipboardList className="mx-auto h-9 w-9 text-accent" aria-hidden />
          <h2 className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            No roster yet
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            {isLeader
              ? "Import a spreadsheet or image of your schedule, and who's serving each date will show up here."
              : "Your worship leader hasn't imported a schedule yet — check back soon."}
          </p>
        </section>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm">{formatDate(entry.serviceDate)}</CardTitle>
                  {entry.eventType !== "SERVICE" && (
                    <Badge variant="outline">{eventTypeLabel(entry.eventType)}</Badge>
                  )}
                </div>
                <Link href={`/sets/${entry.id}`} className="block truncate text-xs text-accent hover:underline">
                  {entry.title === formatDate(entry.serviceDate) ? "View Service →" : entry.title}
                </Link>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <ServiceRosterList
                  roster={entry.roster}
                  setId={entry.id}
                  canManage={isLeader}
                  emptyActionLabel="Assign Team"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
