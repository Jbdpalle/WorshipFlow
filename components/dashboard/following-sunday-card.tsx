import Link from "next/link";
import type { DashboardSet } from "@/lib/dashboard/data";

export function FollowingSundayCard({ followingSunday }: { followingSunday: DashboardSet | null }) {
  return (
    <section className="rounded-xl border border-border bg-surface-muted p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Coming Up
      </h2>

      {followingSunday ? (
        <div className="mt-2">
          <p className="text-sm font-medium text-foreground">
            {followingSunday.serviceDate
              ? new Date(followingSunday.serviceDate).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                })
              : followingSunday.title}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Leader — {followingSunday.leaderName ?? "Not assigned"}
          </p>
          <p className="text-xs text-muted-foreground">
            Theme — {followingSunday.theme ?? "To be confirmed"}
          </p>
          <Link
            href={`/sets/${followingSunday.id}`}
            className="mt-2 inline-block text-xs font-medium text-accent hover:underline"
          >
            View →
          </Link>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Nothing scheduled yet.</p>
      )}
    </section>
  );
}
