import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

// The one loading placeholder. Shape it with width/height classes to match
// the content that will replace it. Pulse stops under reduced-motion.
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-surface-muted", className)}
      {...props}
    />
  );
}

// Page / card loading: a stack of text-like lines.
export function SkeletonLines({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div role="status" aria-label="Loading" className={cn("space-y-2", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn("h-4", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}
