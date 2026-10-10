"use client";

import {
  getAllOutboxItems,
  putOutboxItem,
  deleteOutboxItem,
  updateOutboxItem,
  type OutboxItem,
} from "@/lib/offline/db";
import { OFFLINE_ACTION_REGISTRY, type OfflineActionName } from "@/lib/offline/action-registry";
import type { ActionResult, ActionResultData } from "@/lib/actions/action-result";

// The write half of offline support. callOffline() is a drop-in
// replacement for calling a Server Action directly: online, it behaves
// identically (calls through, returns the real result). Offline — or if
// the call throws from a genuine network failure, see lib/songs the same
// bug class fixed in chord-edit-sheet.tsx this session — it queues the
// call in IndexedDB instead and returns an optimistic success with
// `queued: true`, so the UI can show "saved, will sync" rather than
// blocking the user or losing the edit.
//
// Replay order is FIFO and best-effort: each item is retried once a
// connection is detected (the `online` event, plus a check on mount in
// case the event was missed) and removed from the queue only once the
// real action confirms success. A real validation/permission error
// (ok: false, not a thrown network error) is never retried — it's
// surfaced once and dropped, the same way it would be online.

export type OfflineCallResult = (ActionResult | ActionResultData<unknown>) & { queued?: boolean };

function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export async function callOffline(
  actionName: OfflineActionName,
  args: unknown[],
  label: string,
): Promise<OfflineCallResult> {
  if (!isOffline()) {
    try {
      const action = OFFLINE_ACTION_REGISTRY[actionName];
      return await action(...args);
    } catch {
      // Reported online but the request still failed — queue it rather
      // than surface a dead end, exactly the gap this session's earlier
      // offline-save bug fix closed for the chord editor specifically.
      await enqueue(actionName, args, label);
      return { ok: true, queued: true };
    }
  }
  await enqueue(actionName, args, label);
  return { ok: true, queued: true };
}

async function enqueue(actionName: OfflineActionName, args: unknown[], label: string): Promise<void> {
  const item: OutboxItem = {
    id: crypto.randomUUID(),
    actionName,
    args,
    createdAt: Date.now(),
    status: "pending",
    attempts: 0,
    lastError: null,
    label,
  };
  await putOutboxItem(item);
  notifyListeners();
}

// Everything still in the queue, pending and failed alike — callers (the
// "N changes pending sync" indicator) decide how to present each status.
export async function getPendingOutbox(): Promise<OutboxItem[]> {
  return getAllOutboxItems();
}

let draining = false;

// Drains the whole queue once, in order. Safe to call repeatedly (e.g. on
// every `online` event) — a no-op when nothing is pending, and guarded
// against overlapping runs so a flaky connection can't double-submit the
// same queued item from two concurrent drains.
export async function drainOutbox(): Promise<void> {
  if (draining) return;
  if (isOffline()) return;
  draining = true;
  try {
    const items = await getAllOutboxItems();
    for (const item of items) {
      if (item.status === "failed") continue; // needs a person to look at it, not another silent retry
      if (isOffline()) break; // lost the connection again mid-drain
      await updateOutboxItem(item.id, { status: "syncing" });
      const action = OFFLINE_ACTION_REGISTRY[item.actionName as OfflineActionName];
      if (!action) {
        // Only happens if an item was queued by an older build whose
        // registry no longer knows this action name — drop it rather than
        // retry forever against nothing.
        await deleteOutboxItem(item.id);
        continue;
      }
      try {
        const result = await action(...item.args);
        if (result.ok) {
          await deleteOutboxItem(item.id);
        } else {
          // A real rejection (permission denied, validation failed) — not
          // a network problem, so retrying won't help. Surface it once.
          await updateOutboxItem(item.id, { status: "failed", lastError: result.error, attempts: item.attempts + 1 });
        }
      } catch {
        // Network failed again — leave it pending for the next drain.
        await updateOutboxItem(item.id, { status: "pending", attempts: item.attempts + 1 });
        break;
      }
    }
  } finally {
    draining = false;
    notifyListeners();
  }
}

type Listener = () => void;
const listeners = new Set<Listener>();
function notifyListeners() {
  listeners.forEach((l) => l());
}

// For the "N changes pending sync" indicator — re-reads the queue whenever
// an item is added, removed, or a drain finishes.
export function subscribeOutbox(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let wired = false;
// Idempotent — every offline-capable screen can call this on mount without
// worrying about double-registering the `online` listener.
export function ensureOutboxWired(): void {
  if (wired || typeof window === "undefined") return;
  wired = true;
  window.addEventListener("online", () => {
    drainOutbox();
  });
  if (navigator.onLine) drainOutbox();
}
