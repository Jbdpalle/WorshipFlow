"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Home } from "lucide-react";

// A consistent back/home affordance on every authenticated page, not just
// the ones with their own in-page navigation. router.back() falls back to
// browser history (works for both a deep link and a normal click-through),
// Home always goes to the dashboard regardless of how deep the page is.
export function PageNav() {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/dashboard";

  if (isHome) return null;

  return (
    <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-2 text-sm">
      <button
        type="button"
        onClick={() => router.back()}
        className="tap-target flex items-center gap-1 rounded-md px-1.5 font-medium text-muted-foreground hover:bg-surface-muted hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </button>
      <Link
        href="/dashboard"
        className="tap-target flex items-center gap-1 rounded-md px-1.5 font-medium text-muted-foreground hover:bg-surface-muted hover:text-foreground"
      >
        <Home className="h-4 w-4" /> Home
      </Link>
    </div>
  );
}
