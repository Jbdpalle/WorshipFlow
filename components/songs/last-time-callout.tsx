import { History } from "lucide-react";

type ChangeEntry = {
  id: string;
  field: string;
  fromValue: string | null;
  toValue: string | null;
};

export type LastRehearsal = {
  occurredAt: Date;
  notes: { id: string; content: string }[];
} | null;

export function LastTimeCallout({
  lastRehearsal,
  recentChanges,
}: {
  lastRehearsal: LastRehearsal;
  recentChanges: ChangeEntry[];
}) {
  if (!lastRehearsal && recentChanges.length === 0) return null;

  return (
    <div className="space-y-2 rounded-xl border border-accent/30 bg-accent/5 p-3.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
        <History className="h-3.5 w-3.5" /> Last Time
      </div>
      {lastRehearsal && (
        <p className="text-xs text-muted-foreground">
          Rehearsed{" "}
          {new Date(lastRehearsal.occurredAt).toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
          })}
        </p>
      )}
      {lastRehearsal && lastRehearsal.notes.length > 0 && (
        <ul className="space-y-0.5 text-sm">
          {lastRehearsal.notes.map((n) => (
            <li key={n.id}>• {n.content}</li>
          ))}
        </ul>
      )}
      {recentChanges.length > 0 && (
        <ul className="space-y-0.5 text-sm">
          {recentChanges.map((c) => (
            <li key={c.id}>
              <span className="font-medium">{c.field}</span>
              {(c.fromValue || c.toValue) && (
                <span className="text-muted-foreground">
                  {" "}
                  · {c.fromValue ?? "—"} → {c.toValue ?? "—"}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
