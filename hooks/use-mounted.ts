"use client";

import { useEffect, useState } from "react";

// Guards a form's submit button against a real, reproduced race: filling a
// controlled input before React finishes hydrating that component can
// silently revert the typed value once hydration catches up (confirmed on
// a freshly-compiled dev route; see WORSHIPFLOW_FULL_PRODUCT_AUDIT.md §15).
// Disabling submit — not the inputs — until mounted is true closes that
// window without blocking anyone from typing.
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // One-time "hydration is done" flag, not state synced from a prop —
    // the recommended render-time-sync pattern doesn't apply here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  return mounted;
}
