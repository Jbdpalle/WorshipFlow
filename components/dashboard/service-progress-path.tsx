import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { ProgressStage } from "@/lib/songs/readiness";

// Shared "Setlist → Song Flow → Team → Rehearsal" planning-stage indicator —
// used on the Dashboard (progress toward the next service) and on the Set
// detail page (contextual navigation between the same four stages).
export function ServiceProgressPath({ stages }: { stages: ProgressStage[] }) {
  return (
    <ol className="grid grid-cols-2 gap-x-4 gap-y-3 sm:flex sm:items-center sm:gap-0">
      {stages.map((stage, i) => (
        <li key={stage.key} className="flex items-center sm:flex-1 sm:last:flex-initial">
          <Link href={stage.href} className="group flex min-w-0 items-center gap-2.5">
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                stage.complete
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-surface text-muted-foreground group-hover:border-accent/50 group-hover:text-foreground",
              )}
              aria-hidden
            >
              {stage.complete ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-foreground">
                {stage.label}
              </span>
              <span className="block truncate text-xs text-muted-foreground">{stage.sublabel}</span>
            </span>
          </Link>
          {i < stages.length - 1 && (
            <span
              className="mx-3 hidden h-px flex-1 bg-border sm:block"
              aria-hidden
            />
          )}
        </li>
      ))}
    </ol>
  );
}
