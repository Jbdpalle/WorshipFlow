// The only place that maps an outbox item's stored `actionName` string back
// to the real Server Action function, so a queued edit can be replayed once
// there's a connection again. An action only needs an entry here once its
// calling UI actually wraps it with lib/offline/outbox.ts's callOffline —
// every other action keeps working exactly as before (fails immediately
// when offline, same as today).
import { saveRehearsalNotes, setRehearsalCheck } from "@/lib/actions/rehearsal";
import { updateSectionLyrics } from "@/lib/actions/songs";
import type { ActionResult, ActionResultData } from "@/lib/actions/action-result";

type RegisteredAction = (...args: unknown[]) => Promise<ActionResult | ActionResultData<unknown>>;

// Each real action has its own concrete parameter types, which TS correctly
// won't widen implicitly to `unknown[]` (that would let a caller pass the
// wrong argument types and have it silently compile) — the cast here is the
// one place that's accepted: callOffline's own call sites already know and
// pass the right argument tuple for the action name they name.
export const OFFLINE_ACTION_REGISTRY: Record<string, RegisteredAction> = {
  saveRehearsalNotes: saveRehearsalNotes as RegisteredAction,
  setRehearsalCheck: setRehearsalCheck as RegisteredAction,
  updateSectionLyrics: updateSectionLyrics as RegisteredAction,
};

export type OfflineActionName = keyof typeof OFFLINE_ACTION_REGISTRY;
