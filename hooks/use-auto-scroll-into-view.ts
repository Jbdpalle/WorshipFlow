"use client";

import { useEffect, useRef, type RefObject } from "react";

// Scrolls `ref`'s element into view whenever `key` changes to a non-null
// value — used to follow the live/practice position (section or song) as it
// changes, in the Song Flow ribbon and the set's song-nav strip.
//
// This only runs on a KEY change, never on a timer and never on every
// render, so it can't accidentally "advance" anything — it just follows
// wherever the authoritative position (or the viewer's own selection)
// already moved to. `block: "nearest"` keeps vertical page scroll alone
// (these ribbons scroll horizontally); `inline: "center"` keeps the active
// item away from the ribbon's edges instead of just barely visible.
export function useAutoScrollIntoView<T extends HTMLElement>(
  ref: RefObject<T | null>,
  key: string | null | undefined,
) {
  const lastKeyRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (key == null) return;
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    const el = ref.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    // ref is a stable object identity from useRef; only `key` should retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
