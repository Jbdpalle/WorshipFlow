"use client";

import { RefObject, useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Open overlays, innermost last. Only the top one reacts to Escape and Tab,
// so a confirmation opened from inside a drawer closes by itself first.
const overlayStack: symbol[] = [];

// Shared behaviour for every overlay (Dialog, Sheet): Escape closes, page
// scroll is locked, focus moves into the panel, Tab stays inside it, and
// focus returns to whatever opened it. One implementation so all overlays
// behave the same for keyboard and screen-reader users.
export function useOverlay(
  open: boolean,
  onClose: () => void,
  panelRef: RefObject<HTMLElement | null>,
) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const token = Symbol("overlay");
    overlayStack.push(token);
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    function onKey(e: KeyboardEvent) {
      if (overlayStack[overlayStack.length - 1] !== token) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const at = overlayStack.indexOf(token);
      if (at !== -1) overlayStack.splice(at, 1);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [open, panelRef]);
}
