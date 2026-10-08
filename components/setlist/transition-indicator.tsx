"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { upsertTransition, deleteTransition } from "@/lib/actions/transitions";
import { cn } from "@/lib/utils/cn";

const TRANSITION_TYPES = [
  { value: "DIRECT", label: "Direct" },
  { value: "INSTRUMENTAL", label: "Instrumental" },
  { value: "PAD", label: "Pad" },
  { value: "SPOKEN", label: "Spoken" },
  { value: "PRAYER", label: "Prayer" },
  { value: "FREE_WORSHIP", label: "Free Worship" },
  { value: "COUNT_IN", label: "Count-in" },
  { value: "PAUSE", label: "Pause" },
  { value: "CUSTOM", label: "Custom" },
] as const;
type TransitionTypeValue = (typeof TRANSITION_TYPES)[number]["value"];

export type TransitionData = {
  id: string;
  type: TransitionTypeValue;
  direction: string | null;
} | null;

export function TransitionIndicator({
  setId,
  fromSetSongId,
  toSetSongId,
  transition,
  fromKey,
  toKey,
}: {
  setId: string;
  fromSetSongId: string;
  toSetSongId: string | null;
  transition: TransitionData;
  fromKey?: string | null;
  toKey?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TransitionTypeValue>(transition?.type ?? "DIRECT");
  const [direction, setDirection] = useState(transition?.direction ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typeLabel = TRANSITION_TYPES.find((t) => t.value === (transition?.type ?? "DIRECT"))?.label;
  // Only worth showing when the keys actually differ — a same-key
  // transition doesn't need the reminder, and "same instrument, no key
  // change" is exactly the case a key change could otherwise get lost in.
  const keyChange = fromKey && toKey && fromKey !== toKey ? `${fromKey} → ${toKey}` : null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex min-h-11 w-full items-center gap-3 rounded-lg px-1 text-left text-sm text-muted-foreground hover:bg-surface-muted"
      >
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
            transition ? "bg-musical-soft text-musical" : "bg-surface-muted text-muted-foreground",
          )}
          aria-hidden
        >
          <ArrowDown className="h-4 w-4" />
        </span>
        <span className={cn("font-semibold", transition ? "text-musical" : "text-muted-foreground")}>
          <span className="sr-only">Edit transition: </span>
          {typeLabel}
        </span>
        {transition?.direction && <span className="min-w-0 truncate">{transition.direction}</span>}
        {keyChange && (
          <span className="tnum ml-auto shrink-0 rounded-full bg-musical-soft px-2.5 py-0.5 text-xs font-bold text-musical">
            {keyChange}
          </span>
        )}
        <Pencil className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden />
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-border bg-surface-muted p-2.5">
      {keyChange && (
        <p className="flex items-center gap-1.5 text-sm font-semibold text-musical">
          Key change: <span className="tnum">{keyChange}</span>
        </p>
      )}
      <div className="flex items-center gap-2">
        <ArrowDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <Select
          value={type}
          onChange={(e) => setType(e.target.value as TransitionTypeValue)}
          aria-label="Transition type"
          className="h-10 w-40 text-sm"
        >
          {TRANSITION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close transition editor"
          className="tap-target ml-auto flex w-11 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <Textarea
        value={direction}
        onChange={(e) => setDirection(e.target.value)}
        rows={2}
        placeholder={
          toSetSongId
            ? "Hold the last chord. Keys continue pads into the next song."
            : "Hold the last chord and let it ring out."
        }
        className="text-xs"
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          className="h-10 px-3 text-sm"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            setError(null);
            const result = await upsertTransition({ setId, fromSetSongId, toSetSongId, type, direction });
            setSaving(false);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setOpen(false);
            router.refresh();
          }}
        >
          Save
        </Button>
        {transition && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-10 px-3 text-sm text-danger"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              setError(null);
              const result = await deleteTransition(transition.id);
              setSaving(false);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setType("DIRECT");
              setDirection("");
              setOpen(false);
              router.refresh();
            }}
          >
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
