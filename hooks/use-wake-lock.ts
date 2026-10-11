"use client";

import { useEffect } from "react";

// Keeps the screen from dimming/locking while a musician follows the leader
// hands-free. Uses the browser Screen Wake Lock API where it exists and does
// nothing where it doesn't; the browser releases the lock whenever the tab is
// hidden, so it is requested again when the tab becomes visible.
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    async function acquire() {
      try {
        const next = await navigator.wakeLock.request("screen");
        if (cancelled) next.release().catch(() => {});
        else sentinel = next;
      } catch {
        // Denied (battery saver, unsupported context) — following still works.
      }
    }
    function onVisible() {
      if (document.visibilityState === "visible") acquire();
    }
    acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      sentinel?.release().catch(() => {});
    };
  }, [enabled]);
}
