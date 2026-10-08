import { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

// The one loading system for pages. Every route's loading.tsx composes
// these so loading looks the same everywhere: same header shape, same card
// shape, same rhythm as the real screen it stands in for.

/** Wrapper: announces "Loading" once to screen readers and marks the region busy. */
export function PageSkeleton({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className={cn("space-y-6", className)}>
      <span className="sr-only">Loading…</span>
      {children}
    </div>
  );
}

/** Matches SectionHeader: caps label, title, optional description and action. */
export function HeaderSkeleton({ action = false, description = true }: { action?: boolean; description?: boolean }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-9 w-64 max-w-full" />
        {description && <Skeleton className="h-4 w-80 max-w-full" />}
      </div>
      {action && <Skeleton className="h-11 w-36 rounded-lg" />}
    </div>
  );
}

/** A bordered panel with a few text lines inside. */
export function CardSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-3 rounded-xl border border-border bg-surface p-4", className)}>
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn("h-4", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

/** A responsive grid of cards. */
export function CardGridSkeleton({ count = 4, lines = 3, className }: { count?: number; lines?: number; className?: string }) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2", className)}>
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} lines={lines} />
      ))}
    </div>
  );
}

/** Divided rows inside one panel (library, lists). */
export function RowListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border rounded-xl border border-border bg-surface">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="hidden h-6 w-14 rounded-full sm:block" />
          <Skeleton className="hidden h-6 w-16 rounded-full sm:block" />
        </div>
      ))}
    </div>
  );
}

/** Pill-shaped controls (filters, set-order). */
export function PillsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-11 w-28 rounded-full" />
      ))}
    </div>
  );
}
