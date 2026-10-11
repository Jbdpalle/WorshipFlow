import { openDB, type IDBPDatabase } from "idb";

// The browser-local half of offline support: a cache of the last known
// content for the screens that need to work away from wifi, plus a queue
// (the "outbox", see outbox.ts) of edits made while offline, waiting to be
// replayed once there's a connection again. Nothing here ever becomes the
// server's source of truth — it's a local mirror, refreshed every time a
// screen loads successfully online, and read from only when there's no
// network to ask the server directly.
//
// One flat "snapshots" store keyed by a caller-chosen string (e.g.
// `rehearsal:${setId}`) rather than one IndexedDB object store per screen —
// every snapshot is just a JSON-serializable blob plus a timestamp, so
// there's nothing a per-kind schema would buy beyond what the key prefix
// already gives for free.
const DB_NAME = "worshipflow-offline";
const DB_VERSION = 1;
const SNAPSHOTS_STORE = "snapshots";
export const OUTBOX_STORE = "outbox";

export type OutboxStatus = "pending" | "syncing" | "failed";

export type OutboxItem = {
  id: string;
  // Key into the registry in outbox.ts — never the function itself (can't
  // survive structured clone / IndexedDB storage).
  actionName: string;
  args: unknown[];
  createdAt: number;
  status: OutboxStatus;
  attempts: number;
  lastError: string | null;
  // Short, human-readable label for a "pending changes" list — e.g.
  // "Rehearsal notes — Sunday Set".
  label: string;
};

let dbPromise: Promise<IDBPDatabase> | null = null;

function isBrowser() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function getDB(): Promise<IDBPDatabase> {
  if (!isBrowser()) {
    return Promise.reject(new Error("Offline storage is only available in the browser."));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(SNAPSHOTS_STORE)) {
          db.createObjectStore(SNAPSHOTS_STORE);
        }
        if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
          db.createObjectStore(OUTBOX_STORE, { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export type Snapshot<T> = { savedAt: number; data: T };

// Swallows every failure (quota exceeded, private browsing, a disabled
// IndexedDB) rather than throwing — offline caching is a best-effort
// enhancement; a storage error here must never block the page the user
// actually came for, online or offline.
export async function putSnapshot<T>(key: string, data: T): Promise<void> {
  try {
    const db = await getDB();
    const snapshot: Snapshot<T> = { savedAt: Date.now(), data };
    await db.put(SNAPSHOTS_STORE, snapshot, key);
  } catch {
    // best-effort cache write — see comment above
  }
}

export async function getSnapshot<T>(key: string): Promise<Snapshot<T> | null> {
  try {
    const db = await getDB();
    const value = await db.get(SNAPSHOTS_STORE, key);
    return (value as Snapshot<T> | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function deleteSnapshot(key: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(SNAPSHOTS_STORE, key);
  } catch {
    // best-effort
  }
}

export async function putOutboxItem(item: OutboxItem): Promise<void> {
  const db = await getDB();
  await db.put(OUTBOX_STORE, item);
}

export async function getAllOutboxItems(): Promise<OutboxItem[]> {
  try {
    const db = await getDB();
    const items = (await db.getAll(OUTBOX_STORE)) as OutboxItem[];
    return items.sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

export async function deleteOutboxItem(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(OUTBOX_STORE, id);
  } catch {
    // best-effort
  }
}

export async function updateOutboxItem(id: string, patch: Partial<OutboxItem>): Promise<void> {
  try {
    const db = await getDB();
    const existing = (await db.get(OUTBOX_STORE, id)) as OutboxItem | undefined;
    if (!existing) return;
    await db.put(OUTBOX_STORE, { ...existing, ...patch });
  } catch {
    // best-effort
  }
}
