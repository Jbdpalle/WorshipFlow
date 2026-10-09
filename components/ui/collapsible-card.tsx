"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

// A Card whose header toggles its body open/closed — for sections that are
// useful to glance at but don't need to stay expanded every visit (the
// Worship Team roster, a long setlist), so a long page like Set Detail
// doesn't force a scroll past things already reviewed. `headerAction`
// renders as its own sibling control (never nested inside the toggle
// button) so it keeps working independently of expand/collapse state.
export function CollapsibleCard({
  id,
  title,
  summary,
  headerAction,
  defaultOpen = true,
  children,
}: {
  id?: string;
  title: string;
  summary?: ReactNode;
  headerAction?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card id={id}>
      <div className={cn("flex items-center gap-2 p-4", open && "border-b border-border")}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="tap-target flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
        >
          <span className="flex min-w-0 items-center gap-2">
            <CardTitle className="text-base">{title}</CardTitle>
            {!open && summary && (
              <span className="truncate text-sm font-normal text-muted-foreground">{summary}</span>
            )}
          </span>
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-[var(--duration-fast)]",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </button>
        {headerAction && <div className="shrink-0">{headerAction}</div>}
      </div>
      {open && <CardContent>{children}</CardContent>}
    </Card>
  );
}
