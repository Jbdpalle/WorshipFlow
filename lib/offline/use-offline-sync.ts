"use client";

import { useEffect, useRef, useState } from "react";
import { getSnapshot, putSnapshot } from "@/lib/offline/db";
import { ensureOutboxWired, getPendingOutbox, subscribeOutbox } from "@/lib/offline/outbox";
import type { OutboxItem } from "@/lib/offline/db";

// Call once per offline-capable screen, with the exact data it just
// received from the server (props from a successful SSR/RSC load). Writes
// it to the local cache under `key` so a later offline visit has something
// to fall back to. A no-op whenever the data hasn't actually changed since
// the last save, so this doesn't re-write on every unrelated re-render.
export function useSyncDownSnapshot<T>(key: string, data: T): void {
  const lastSaved = useRef<string | null>(null);
  useEffect(() => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return; // only cache data we know is fresh
    const serialized = JSON.stringify(data);
    if (serialized === lastSaved.current) return;
    lastSaved.current = serialized;
    putSnapshot(key, data);
  }, [key, data]);
}

// Reads back whatever was last cached for `key`. `fallback` is what the
// component already has (its live SSR props) — on the very common path
// where that's already good data, this never needs to touch IndexedDB at
// all. It's only consulted when the caller explicitly asks (e.g. the
// component detected it's offline, or its props look like the SW's stale
// cached-HTML fallback rather than a real server response).
export function useOfflineFallback<T>(key: string, shouldLoad: boolean): { data: T | null; savedAt: number | null } {
  const [state, setState] = useState<{ data: T | null; savedAt: number | null }>({ data: null, savedAt: null });
  useEffect(() => {
    if (!shouldLoad) return;
    let cancelled = false;
    getSnapshot<T>(key).then((snapshot) => {
      if (cancelled || !snapshot) return;
      setState({ data: snapshot.data, savedAt: snapshot.savedAt });
    });
    return () => {
      cancelled = true;
    };
  }, [key, shouldLoad]);
  return state;
}

// Plain online/offline flag, kept in sync with the same browser events the
// global OfflineBanner already listens to.
export function useIsOffline(): boolean {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOffline(!navigator.onLine);
    ensureOutboxWired();
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);
  return offline;
}

// Drives the "N changes waiting to sync" indicator — re-reads the outbox
// whenever anything enqueues, drains, or fails.
export function useOutboxItems(): OutboxItem[] {
  const [items, setItems] = useState<OutboxItem[]>([]);
  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      getPendingOutbox().then((next) => {
        if (!cancelled) setItems(next);
      });
    };
    refresh();
    const unsubscribe = subscribeOutbox(refresh);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);
  return items;
}
