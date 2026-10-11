"use client";

import { cn } from "@/lib/utils/cn";

// A plain next/link to `#worship-calendar` doesn't reliably scroll when
// you're already on /dashboard — the App Router treats a same-pathname,
// hash-only navigation as a no-op in several Next versions, so the link
// visibly did nothing. A real click handler sidesteps that entirely.
export function ScrollToCalendarButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        const target = document.getElementById("worship-calendar");
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
      className={cn(
        "inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline",
        className,
      )}
    >
      View calendar →
    </button>
  );
}
