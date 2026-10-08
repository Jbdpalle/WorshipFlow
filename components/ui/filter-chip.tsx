import Link from "next/link";
import { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

// A filter as a link (so the filtered view is shareable and server
// rendered). Selected = filled primary, with aria-current for screen
// readers; count is part of the label so it is never colour-only.
export function FilterChip({
  href,
  selected,
  children,
}: {
  href: string;
  selected: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "tap-target inline-flex items-center rounded-full px-4 text-sm font-semibold transition-colors duration-[var(--duration-fast)]",
        selected
          ? "bg-primary text-primary-foreground"
          : "bg-surface-muted text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
