type RehearsalEntry = {
  id: string;
  occurredAt: Date;
  bpmUsed: number | null;
  summary: string | null;
  notes: { id: string; content: string }[];
};

export function RehearsalHistoryList({ rehearsals }: { rehearsals: RehearsalEntry[] }) {
  if (rehearsals.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No rehearsals logged yet. Start a rehearsal from the set to begin building history.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {rehearsals.map((r) => (
        <div key={r.id} className="rounded-lg bg-surface-muted p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {new Date(r.occurredAt).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            {r.bpmUsed && <span className="text-xs text-muted-foreground">{r.bpmUsed} BPM</span>}
          </div>
          {r.summary && <p className="mt-1 text-sm">{r.summary}</p>}
          {r.notes.length > 0 && (
            <ul className="mt-2 list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
              {r.notes.map((n) => (
                <li key={n.id}>{n.content}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
