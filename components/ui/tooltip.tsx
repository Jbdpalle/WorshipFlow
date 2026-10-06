"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTooltipsEnabled } from "@/lib/tooltips/use-tooltips-enabled";
import { cn } from "@/lib/utils/cn";

const SHOW_DELAY_MS = 350;
const LONG_PRESS_MS = 500;
const TOUCH_AUTO_HIDE_MS = 2500;

// A small "what does this do" bubble for icon-only or otherwise ambiguous
// controls — shows on hover and on keyboard focus (so it's not mouse-only),
// and is skipped entirely when the person has turned tooltips off in
// Settings → Appearance (see lib/tooltips/use-tooltips-enabled.ts).
// Positioned via a fixed-position portal (not CSS absolute) so it's never
// clipped by a scrolling/overflow-hidden parent, e.g. the horizontal strips
// in Song Flow and Rehearsal.
//
// Touch has no hover, so a long-press (not a plain tap) shows the bubble
// instead — a plain tap still does whatever the control normally does,
// unchanged. A long-press suppresses the click it would otherwise fire
// (so holding "Remove" doesn't also remove something) and auto-hides after
// a couple of seconds since there's no touch equivalent of mouseleave.
export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: {
  content: string;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
}) {
  const enabled = useTooltipsEnabled();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressNextClickRef = useRef(false);

  useEffect(() => {
    // document.body isn't available during SSR, needed for the portal target.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  function showNow() {
    if (!enabled) return;
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCoords({
      top: side === "top" ? rect.top - 8 : rect.bottom + 8,
      left: rect.left + rect.width / 2,
    });
    setOpen(true);
  }

  function show() {
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(showNow, SHOW_DELAY_MS);
  }

  function hide() {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    setOpen(false);
  }

  function handleTouchStart() {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      suppressNextClickRef.current = true;
      showNow();
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = setTimeout(hide, TOUCH_AUTO_HIDE_MS);
    }, LONG_PRESS_MS);
  }

  function cancelLongPress() {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  }

  function handleClickCapture(e: MouseEvent) {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      e.preventDefault();
      e.stopPropagation();
    }
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    };
  }, []);

  return (
    <span
      ref={wrapperRef}
      className={cn("inline-flex", className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onTouchStart={handleTouchStart}
      onTouchEnd={cancelLongPress}
      onTouchMove={cancelLongPress}
      onTouchCancel={cancelLongPress}
      onClickCapture={handleClickCapture}
    >
      {children}
      {mounted &&
        enabled &&
        open &&
        coords &&
        createPortal(
          <span
            role="tooltip"
            className={cn(
              "pointer-events-none fixed z-[200] max-w-[220px] -translate-x-1/2 text-balance rounded-md bg-foreground px-2 py-1 text-center text-xs font-medium leading-snug text-background shadow-lg",
              side === "top" ? "-translate-y-full" : "",
            )}
            style={{ top: coords.top, left: coords.left }}
          >
            {content}
          </span>,
          document.body,
        )}
    </span>
  );
}
