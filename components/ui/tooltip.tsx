"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTooltipsEnabled } from "@/lib/tooltips/use-tooltips-enabled";
import { cn } from "@/lib/utils/cn";

const SHOW_DELAY_MS = 350;

// A small "what does this do" bubble for icon-only or otherwise ambiguous
// controls — shows on hover and on keyboard focus (so it's not mouse-only),
// and is skipped entirely when the person has turned tooltips off in
// Settings → Appearance (see lib/tooltips/use-tooltips-enabled.ts).
// Positioned via a fixed-position portal (not CSS absolute) so it's never
// clipped by a scrolling/overflow-hidden parent, e.g. the horizontal strips
// in Song Flow and Rehearsal.
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

  useEffect(() => {
    // document.body isn't available during SSR, needed for the portal target.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  function show() {
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;
      setCoords({
        top: side === "top" ? rect.top - 8 : rect.bottom + 8,
        left: rect.left + rect.width / 2,
      });
      setOpen(true);
    }, SHOW_DELAY_MS);
  }

  function hide() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(false);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
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
