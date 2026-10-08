import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TextLink } from "@/components/ui/text-link";
import { eventTypeLabel } from "@/lib/songs/constants";
import type { DashboardSet, ThisWeekItem } from "@/lib/dashboard/data";

function short(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

// What comes after the next service: the following service and anything
// else this week, as one quiet list (muted, so it never competes with the
// next service above it).
export function ComingUpCard({
  following,
  thisWeek,
}: {
  following: DashboardSet | null;
  thisWeek: ThisWeekItem[];
}) {
  const rows = [
    ...(following
      ? [
          {
            id: following.id,
            date: following.serviceDate ? short(new Date(following.serviceDate)) : "No date",
            title: following.title,
            sub: following.theme ? `Theme: ${following.theme}` : "Service",
          },
        ]
      : []),
    ...thisWeek.map((t) => ({
      id: t.id,
      date: short(t.serviceDate),
      title: t.title,
      sub: eventTypeLabel(t.eventType),
    })),
  ];

  return (
    <Card muted className="flex h-full flex-col">
      <CardHeader className="py-3">
        <CardTitle className="text-base text-foreground">Coming up</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {rows.length === 0 ? (
          <p className="p-4 text-sm">Nothing else is scheduled yet.</p>
        ) : (
          <ul>
            {rows.map((r) => (
              <li key={r.id} className="border-t border-border first:border-t-0">
                <Link
                  href={`/sets/${r.id}`}
                  className="flex min-h-14 items-center gap-4 px-4 py-2 hover:bg-surface-muted"
                >
                  <span className="tnum w-24 shrink-0 text-sm font-semibold text-foreground">{r.date}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground">{r.title}</span>
                    <span className="block truncate text-xs">{r.sub}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-border px-4">
          <TextLink href="/dashboard#worship-calendar">View calendar →</TextLink>
        </div>
      </CardContent>
    </Card>
  );
}
