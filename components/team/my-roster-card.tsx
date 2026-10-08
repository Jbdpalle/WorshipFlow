import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { eventTypeLabel } from "@/lib/songs/constants";
import type { MyRosterData } from "@/lib/dashboard/data";

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

// "When am I serving?" — independent of whether a service has any songs
// yet. Distinct from the per-song breakdown below it on this same page,
// which answers "what am I doing in each song."
export function MyRosterCard({ data, memberName }: { data: MyRosterData; memberName: string }) {
  const { upcoming, recent } = data;

  if (upcoming.length === 0 && recent.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <CalendarCheck className="h-4 w-4 text-primary" aria-hidden />
        <CardTitle className="text-base">When I&apos;m serving</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <section>
          <h3 className="label-caps">Upcoming</h3>
          {upcoming.length === 0 ? (
            <p className="mt-1.5 text-sm text-muted-foreground">
              No upcoming services yet for {memberName}.
            </p>
          ) : (
            <ul className="mt-1 divide-y divide-border">
              {upcoming.map((row) => (
                <li key={row.setId} className="flex items-center justify-between gap-2 text-sm">
                  <Link href={`/sets/${row.setId}`} className="inline-flex min-h-11 min-w-0 items-center truncate font-semibold hover:text-primary hover:underline">
                    {formatDate(row.serviceDate)}
                    {row.eventType !== "SERVICE" && (
                      <span className="text-muted-foreground"> · {eventTypeLabel(row.eventType)}</span>
                    )}
                  </Link>
                  <span className="flex shrink-0 gap-1">
                    {row.roles.map((role) => (
                      <Badge key={role} variant="primary">
                        {role}
                      </Badge>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {recent.length > 0 && (
          <section className="border-t border-border pt-3">
            <h3 className="label-caps">Recent</h3>
            <ul className="mt-1.5 space-y-1.5">
              {recent.map((row) => (
                <li key={row.setId} className="flex items-baseline justify-between gap-2 text-sm text-muted-foreground">
                  <Link href={`/sets/${row.setId}`} className="inline-flex min-h-11 min-w-0 items-center truncate font-semibold hover:text-primary hover:underline">
                    {formatDate(row.serviceDate)}
                  </Link>
                  <span className="flex shrink-0 gap-1">
                    {row.roles.map((role) => (
                      <Badge key={role} variant="outline">
                        {role}
                      </Badge>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
