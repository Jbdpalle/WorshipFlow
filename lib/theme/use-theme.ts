"use client";

import { useEffect, useState } from "react";

export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "worshipflow-theme";
const EVENT = "worshipflow:theme-change";

export function getStoredTheme(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    // ignore — localStorage can throw in private browsing
  }
  return "system";
}

// "system" removes the override and falls back to prefers-color-scheme (see
// globals.css); "light"/"dark" pin an explicit choice that wins regardless
// of OS setting. Mirrors the same inline script that runs before paint in
// app/layout.tsx, so the two never disagree.
export function applyTheme(theme: ThemePreference) {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  } else {
    root.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: theme }));
}

// Several toggle controls can be on screen at once (sidebar + Settings) —
// this keeps them all in sync without a React context provider.
export function useTheme(): [ThemePreference, (theme: ThemePreference) => void] {
  const [theme, setThemeState] = useState<ThemePreference>("system");

  useEffect(() => {
    // Reads localStorage, which isn't available during SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(getStoredTheme());
    function onChange(e: Event) {
      setThemeState((e as CustomEvent<ThemePreference>).detail);
    }
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  function setTheme(next: ThemePreference) {
    applyTheme(next);
    setThemeState(next);
  }

  return [theme, setTheme];
}
