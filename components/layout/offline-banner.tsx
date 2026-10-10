"use client";

import { WifiOff, RefreshCw } from "lucide-react";
import { useIsOffline, useOutboxItems } from "@/lib/offline/use-offline-sync";

// Real offline detection (navigator.onLine + the online/offline events) via
// useIsOffline, which also wires up the outbox's connection listener (see
// lib/offline/outbox.ts) exactly once, globally, regardless of which page
// is mounted — so a queued edit on Rehearsal Mode still syncs even if the
// user has since navigated to Dashboard before reconnecting.
//
// Rehearsal Mode, Song Chart and My Part now cache enough locally to stay
// usable offline, and queue the edits they support for background sync —
// this banner reflects that instead of flatly saying nothing works.
export function OfflineBanner() {
  const offline = useIsOffline();
  const outboxItems = useOutboxItems();
  const pending = outboxItems.filter((i) => i.status !== "failed");
  const failed = outboxItems.filter((i) => i.status === "failed");

  if (!offline && pending.length === 0 && failed.length === 0) return null;

  if (offline) {
    return (
      <div className="flex items-center justify-center gap-2 bg-warning/15 px-4 py-2 text-center text-sm font-medium text-warning">
        <WifiOff className="h-4 w-4 shrink-0" />
        You&apos;re offline — Rehearsal Mode, Song Chart and My Part still work from what was last loaded.
        {pending.length > 0 && ` ${pending.length} change${pending.length === 1 ? "" : "s"} will sync once you're back online.`}
      </div>
    );
  }

  // Back online with items still queued (mid-sync) or stuck (a real error,
  // not just a dropped connection) — never silently finish draining
  // without telling anyone something didn't make it.
  return (
    <div className="flex items-center justify-center gap-2 bg-info/15 px-4 py-2 text-center text-sm font-medium text-info">
      {failed.length > 0 ? (
        <>
          <WifiOff className="h-4 w-4 shrink-0" />
          {failed.length} change{failed.length === 1 ? "" : "s"} couldn&apos;t sync — {failed[0]?.lastError ?? "please try again"}.
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
          Syncing {pending.length} offline change{pending.length === 1 ? "" : "s"}…
        </>
      )}
    </div>
  );
}
