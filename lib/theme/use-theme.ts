"use client";

import { useEffect, useState } from "react";

// Light is the default. Stage (dark) is a manual choice, never inferred from
// the OS, so a phone in dark mode still opens WorshipFlow in light.
export type ThemePreference = "light" | "dark";

const STORAGE_KEY = "worshipflow-theme";
const EVENT = "worshipflow:theme-change";

export function getStoredTheme(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "dark") return "dark";
  } catch {
    // ignore — localStorage can throw in private browsing
  }
  return "light";
}

// Mirrors the inline script that runs before paint in app/layout.tsx, so
// the two never disagree. Also keeps the browser UI colour in step.
export function applyTheme(theme: ThemePreference) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // ignore
  }
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((m) => m.setAttribute("content", theme === "dark" ? "#16181a" : "#f3f0ea"));
  window.dispatchEvent(new CustomEvent(EVENT, { detail: theme }));
}

// Several toggle controls can be on screen at once (sidebar + Settings) —
// this keeps them all in sync without a React context provider.
export function useTheme(): [ThemePreference, (theme: ThemePreference) => void] {
  const [theme, setThemeState] = useState<ThemePreference>("light");

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
