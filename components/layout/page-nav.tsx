"use client";

import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";

// A back affordance on detail pages (e.g. /sets/123, /songs/45/chart). Top
// level destinations already have the sidebar / bottom bar, so they get no
// extra bar. router.back() falls back to browser history, which works for
// both deep links and normal click-through.
export function PageNav() {
  const router = useRouter();
  const pathname = usePathname();
  const depth = (pathname ?? "").split("/").filter(Boolean).length;

  if (depth < 2) return null;

  return (
    <div className="border-b border-border bg-surface px-4 text-sm md:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => router.back()}
        className="tap-target -ml-2 flex items-center gap-1 rounded-lg px-2 font-semibold text-muted-foreground hover:bg-surface-muted hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden /> Back
      </button>
    </div>
  );
}
