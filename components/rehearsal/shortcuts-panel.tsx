"use client";

import { useState } from "react";
import { Keyboard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import {
  DEFAULT_SHORTCUT_MAP,
  SHORTCUT_LABELS,
  type DirectorAction,
  saveShortcutMap,
} from "@/hooks/use-director-shortcuts";

function keyDisplay(key: string) {
  if (key === "ArrowRight") return "→";
  if (key === "ArrowLeft") return "←";
  if (key === " ") return "Space";
  return key.length === 1 ? key.toUpperCase() : key;
}

// A compact, inline settings surface for the leader/MD to check and rebind
// their footswitch/keyboard mapping before the service starts — "show
// available shortcuts clearly before service" from the build spec. Listens
// for exactly one keydown while a row is in "Press a key…" state, so
// binding a physical footswitch is the same action as binding any other
// key: press it once.
export function ShortcutsPanel({
  map,
  onChange,
}: {
  map: Record<DirectorAction, string>;
  onChange: (map: Record<DirectorAction, string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [listeningFor, setListeningFor] = useState<DirectorAction | null>(null);

  function startListening(action: DirectorAction) {
    setListeningFor(action);
    function onKey(e: KeyboardEvent) {
      e.preventDefault();
      window.removeEventListener("keydown", onKey, true);
      setListeningFor(null);
      if (e.key === "Escape") return;
      const next = { ...map, [action]: e.key };
      onChange(next);
      saveShortcutMap(next);
    }
    window.addEventListener("keydown", onKey, true);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap-target flex items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-primary-foreground hover:bg-black/10"
      >
        <Keyboard className="h-4 w-4" aria-hidden /> Shortcuts
      </button>
    );
  }

  return (
    <div className="w-full rounded-xl border border-border bg-surface p-4 text-foreground">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-bold">
          <Keyboard className="h-4 w-4" aria-hidden /> Footswitch / keyboard shortcuts
        </h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close shortcuts panel"
          className="tap-target flex w-11 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Any device that sends keyboard input — a Bluetooth keyboard, a HID footswitch — works here. Click a key to
        change it, then press the new key (or the pedal) once.
      </p>
      <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {(Object.keys(SHORTCUT_LABELS) as DirectorAction[]).map((action) => (
          <div
            key={action}
            className="flex items-center justify-between gap-2 rounded-lg bg-surface-muted px-3 py-2 text-sm"
          >
            <span className="font-medium">{SHORTCUT_LABELS[action]}</span>
            <button
              type="button"
              onClick={() => startListening(action)}
              className={cn(
                "tnum min-h-9 min-w-[4.5rem] rounded-md border px-2.5 text-sm font-bold",
                listeningFor === action
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface text-foreground hover:bg-surface-muted",
              )}
            >
              {listeningFor === action ? "Press a key…" : keyDisplay(map[action])}
            </button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-3"
        onClick={() => {
          onChange(DEFAULT_SHORTCUT_MAP);
          saveShortcutMap(DEFAULT_SHORTCUT_MAP);
        }}
      >
        Reset to defaults
      </Button>
    </div>
  );
}
