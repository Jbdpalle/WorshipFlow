import { TextLink } from "@/components/ui/text-link";
import type { ServiceRosterRow } from "@/lib/dashboard/data";

// The named "who's serving, in what role" list shared by every Dashboard
// surface that shows a service's roster (hero, Coming Up card, calendar
// popover) — one component, one source of truth, so none of them can
// drift from what My Part and Rehearsal Mode resolve for the same service.
export function ServiceRosterList({
  roster,
  setId,
  emptyHref,
  emptyActionLabel,
  canManage,
}: {
  roster: ServiceRosterRow[];
  setId: string;
  emptyHref?: string;
  emptyActionLabel?: string;
  canManage: boolean;
}) {
  if (roster.length === 0) {
    return (
      <div className="space-y-1.5">
        <p className="text-sm text-muted-foreground">No team assigned yet.</p>
        {canManage && (
          <TextLink href={emptyHref ?? `/sets/${setId}#team`}>
            {emptyActionLabel ?? "Assign team"} →
          </TextLink>
        )}
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {roster.map((r, i) => (
        <li key={i} className="flex items-baseline justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0">
          <span className="text-muted-foreground">{r.role}</span>
          <span className="font-medium text-foreground">{r.name}</span>
        </li>
      ))}
    </ul>
  );
}
