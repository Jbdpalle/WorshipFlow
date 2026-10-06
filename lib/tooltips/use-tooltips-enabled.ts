"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "worshipflow-tooltips";
const EVENT = "worshipflow:tooltips-change";

// On by default — this only ever needs to be read once a person has
// actually turned it off, so "no value stored" means enabled.
export function getTooltipsEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setTooltipsEnabled(enabled: boolean) {
  try {
    if (enabled) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, "off");
    }
  } catch {
    // ignore — localStorage can throw in private browsing
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: enabled }));
}

// Every <Tooltip> on the page reads this independently and stays in sync
// via the custom event — same pattern as lib/theme/use-theme.ts.
export function useTooltipsEnabled(): boolean {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    // Reads localStorage, which isn't available during SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(getTooltipsEnabled());
    function onChange(e: Event) {
      setEnabled((e as CustomEvent<boolean>).detail);
    }
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  return enabled;
}
