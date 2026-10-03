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
  toSetSongId: string;
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
        className={cn(
          "group flex w-full items-center gap-2 py-1 text-xs text-muted-foreground hover:text-foreground",
        )}
      >
        <ArrowDown className="h-3.5 w-3.5 shrink-0" />
        <span className={cn("font-medium", transition && "text-accent")}>{typeLabel}</span>
        {transition?.direction && <span className="truncate">— {transition.direction}</span>}
        {keyChange && (
          <span className="ml-auto shrink-0 rounded-full bg-accent/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-accent">
            {keyChange}
          </span>
        )}
        <Pencil className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100" />
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-border bg-surface-muted p-2.5">
      {keyChange && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-accent">
          Key change: <span className="font-mono">{keyChange}</span>
        </p>
      )}
      <div className="flex items-center gap-2">
        <ArrowDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <Select
          value={type}
          onChange={(e) => setType(e.target.value as TransitionTypeValue)}
          className="h-7 w-36 text-xs"
        >
          {TRANSITION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
        <button type="button" onClick={() => setOpen(false)} className="ml-auto text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <Textarea
        value={direction}
        onChange={(e) => setDirection(e.target.value)}
        rows={2}
        placeholder="Hold the last chord. Keys continue pads into the next song."
        className="text-xs"
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          className="h-7 px-2 text-xs"
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
            className="h-7 px-2 text-xs text-danger"
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
