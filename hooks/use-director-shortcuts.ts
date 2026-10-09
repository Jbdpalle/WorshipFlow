"use client";

import { useEffect, useRef } from "react";

// Option A of the live-control spec: a footswitch that sends keyboard
// events (HID, or a Bluetooth keyboard pedal) drives the exact same
// Director Mode actions as the on-screen buttons, through this one
// mapping. No proprietary pedal protocol, no MIDI — any device that can
// "type" a key already works.
export type DirectorAction = "goNext" | "previous" | "hold" | "build" | "drop" | "wait" | "repeat";

export const DEFAULT_SHORTCUT_MAP: Record<DirectorAction, string> = {
  goNext: "ArrowRight",
  previous: "ArrowLeft",
  hold: "h",
  build: "b",
  drop: "d",
  wait: "w",
  repeat: "r",
};

export const SHORTCUT_LABELS: Record<DirectorAction, string> = {
  goNext: "Go Next",
  previous: "Previous",
  hold: "Hold",
  build: "Build",
  drop: "Drop",
  wait: "Wait",
  repeat: "Repeat",
};

const STORAGE_KEY = "worshipflow:director-shortcuts";

// Per-device configuration, not account data — the whole point is that a
// leader can map their own footswitch/keyboard once on the device they
// perform from. Falls back to defaults wherever storage is unavailable
// (SSR, private browsing, blocked storage) rather than throwing.
export function loadShortcutMap(): Record<DirectorAction, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SHORTCUT_MAP };
    const parsed = JSON.parse(raw) as Partial<Record<DirectorAction, string>>;
    return { ...DEFAULT_SHORTCUT_MAP, ...parsed };
  } catch {
    return { ...DEFAULT_SHORTCUT_MAP };
  }
}

export function saveShortcutMap(map: Record<DirectorAction, string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Best-effort only — shortcuts still work for the rest of this session
    // from in-memory state even if persisting them failed.
  }
}

// Pure and independently testable: should this keydown be ignored because
// the viewer is typing somewhere (a note, a direction, a search box), or
// because it's a synthetic OS key-repeat from a held key?
export function shouldIgnoreShortcutEvent(e: { repeat: boolean; target: EventTarget | null }): boolean {
  if (e.repeat) return true;
  const target = e.target as HTMLElement | null;
  if (!target) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

// Pure: resolve a keydown's `key` against the mapping. Letter keys compare
// case-insensitively so Shift/CapsLock state on the pedal/keyboard doesn't
// matter; named keys (ArrowRight, etc.) compare exactly.
export function resolveShortcutAction(key: string, map: Record<DirectorAction, string>): DirectorAction | null {
  const normalized = key.length === 1 ? key.toLowerCase() : key;
  for (const action of Object.keys(map) as DirectorAction[]) {
    const mapped = map[action];
    const normalizedMapped = mapped.length === 1 ? mapped.toLowerCase() : mapped;
    if (normalizedMapped === normalized) return action;
  }
  return null;
}

// Binds one document-level keydown listener while `enabled`. Handlers are
// read through a ref on every event (not captured at bind time), so a
// stale closure from a prop/state change never fires an outdated action —
// e.g. Previous always acts on the CURRENT section index, not whatever it
// was when the listener was first attached.
export function useDirectorShortcuts(
  enabled: boolean,
  map: Record<DirectorAction, string>,
  handlers: Partial<Record<DirectorAction, () => void>>,
) {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });
  // A bouncy pedal contact or an accidental second tap within this window
  // is swallowed rather than firing the action twice.
  const busyRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(e: KeyboardEvent) {
      if (shouldIgnoreShortcutEvent(e)) return;
      const action = resolveShortcutAction(e.key, map);
      if (!action) return;
      const handler = handlersRef.current[action];
      if (!handler) return;
      e.preventDefault();
      if (busyRef.current) return;
      busyRef.current = true;
      handler();
      window.setTimeout(() => {
        busyRef.current = false;
      }, 350);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, map]);
}
