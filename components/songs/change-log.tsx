"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { recordChange } from "@/lib/actions/rehearsal";

type ChangeEntry = {
  id: string;
  field: string;
  fromValue: string | null;
  toValue: string | null;
  reason: string | null;
  createdAt: Date;
};

export function ChangeLogPanel({ songId, changes }: { songId: string; changes: ChangeEntry[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [field, setField] = useState("");
  const [fromValue, setFromValue] = useState("");
  const [toValue, setToValue] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grouped = groupByDay(changes);

  return (
    <div className="space-y-4">
      {grouped.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No changes recorded yet. Log a change whenever the arrangement shifts so the team never
          has the same conversation twice.
        </p>
      )}
      {grouped.map(([day, entries]) => (
        <div key={day}>
          <h4 className="text-sm font-semibold">{day}</h4>
          <ul className="mt-1 space-y-1.5">
            {entries.map((c) => (
              <li key={c.id} className="rounded-lg bg-surface-muted px-3 py-2 text-sm">
                <span className="font-medium">{c.field}</span>
                {c.fromValue || c.toValue ? (
                  <span className="text-muted-foreground">
                    {" "}
                    · {c.fromValue ?? "—"} → {c.toValue ?? "—"}
                  </span>
                ) : null}
                {c.reason && <p className="text-xs text-muted-foreground">{c.reason}</p>}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {showForm ? (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <Input value={field} onChange={(e) => setField(e.target.value)} placeholder="What changed? (e.g. BPM, Guitar — Verse 1)" />
          <div className="grid grid-cols-2 gap-2">
            <Input value={fromValue} onChange={(e) => setFromValue(e.target.value)} placeholder="From" />
            <Input value={toValue} onChange={(e) => setToValue(e.target.value)} placeholder="To" />
          </div>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={saving || !field.trim()}
              onClick={async () => {
                setSaving(true);
                setError(null);
                try {
                  await recordChange({ songId, field, fromValue, toValue, reason });
                  setShowForm(false);
                  setField("");
                  setFromValue("");
                  setToValue("");
                  setReason("");
                  router.refresh();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Unable to save that change.");
                } finally {
                  setSaving(false);
                }
              }}
            >
              Save change
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      ) : (
        <Button type="button" size="sm" variant="secondary" onClick={() => setShowForm(true)}>
          <Plus className="h-3.5 w-3.5" /> Log a change
        </Button>
      )}
    </div>
  );
}

function groupByDay(changes: ChangeEntry[]) {
  const map = new Map<string, ChangeEntry[]>();
  for (const c of changes) {
    const day = new Date(c.createdAt).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
    });
    const list = map.get(day) ?? [];
    list.push(c);
    map.set(day, list);
  }
  return Array.from(map.entries());
}
