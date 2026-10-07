import Link from "next/link";
import type { DashboardSet } from "@/lib/dashboard/data";
import { ServiceRosterList } from "@/components/dashboard/service-roster-list";

export function FollowingSundayCard({
  followingSunday,
  isLeaderView,
}: {
  followingSunday: DashboardSet | null;
  isLeaderView: boolean;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface-muted p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Coming Up
      </h2>

      {followingSunday ? (
        <div className="mt-2 space-y-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              {followingSunday.serviceDate
                ? new Date(followingSunday.serviceDate).toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })
                : followingSunday.title}
            </p>
            <p className="text-xs text-muted-foreground">
              Theme — {followingSunday.theme ?? "To be confirmed"}
            </p>
          </div>
          <ServiceRosterList
            roster={followingSunday.serviceRoster}
            setId={followingSunday.id}
            canManage={isLeaderView}
          />
          <Link
            href={`/sets/${followingSunday.id}`}
            className="inline-block text-xs font-medium text-accent hover:underline"
          >
            View Service →
          </Link>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Nothing scheduled yet.</p>
      )}
    </section>
  );
}
