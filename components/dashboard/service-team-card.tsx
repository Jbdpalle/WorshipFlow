import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TextLink } from "@/components/ui/text-link";
import { Tooltip } from "@/components/ui/tooltip";
import type { DashboardSet } from "@/lib/dashboard/data";
import { ROLE_CATEGORY_ICONS } from "@/components/dashboard/role-coverage-icons";
import { ServiceRosterList } from "@/components/dashboard/service-roster-list";

// "Who is serving?" — the service roster, with per-family coverage as a
// compact footer (filled dot = confirmed, always with a text equivalent).
export function ServiceTeamCard({
  set,
  isLeaderView,
}: {
  set: DashboardSet;
  isLeaderView: boolean;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex items-center justify-between gap-2 py-2">
        <CardTitle className="text-base">Who&apos;s serving</CardTitle>
        <TextLink href={`/sets/${set.id}#team`}>{isLeaderView ? "Edit roster" : "View"}</TextLink>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <ServiceRosterList roster={set.serviceRoster} setId={set.id} canManage={isLeaderView} />
        {set.teamCoverage.length > 0 && (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="label-caps">Coverage</p>
            {set.teamCoverage.map((row) => {
              const Icon = ROLE_CATEGORY_ICONS[row.key];
              return (
                <div key={row.key} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Icon className="h-4 w-4" aria-hidden /> {row.label}
                  </span>
                  <Tooltip
                    content={`${row.confirmed} of ${row.total} ${row.label.toLowerCase()} confirmed for this service`}
                  >
                    <span tabIndex={0} className="tnum flex items-center gap-1.5">
                      {Array.from({ length: Math.min(row.total, 6) }).map((_, i) => (
                        <span
                          key={i}
                          className={
                            i < row.confirmed
                              ? "h-2.5 w-2.5 rounded-full bg-primary"
                              : "h-2.5 w-2.5 rounded-full border border-border bg-surface-muted"
                          }
                          aria-hidden
                        />
                      ))}
                      <span className="text-xs text-muted-foreground">
                        {row.confirmed}/{row.total}
                      </span>
                    </span>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
