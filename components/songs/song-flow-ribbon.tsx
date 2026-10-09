"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils/cn";
import { dynamicsStep } from "@/lib/songs/dynamics";
import { useAutoScrollIntoView } from "@/hooks/use-auto-scroll-into-view";

type RibbonSection = {
  id: string;
  label: string;
  repeatCount: number | null;
  dynamics: string | null;
};

// The whole song at a glance: one block per section, in order, as wide as
// its repeat count and as tall as its dynamic level. Click a block to jump
// to that section. Scrolls sideways on narrow screens rather than squashing.
//
// When the selected section changes WITHOUT the viewer clicking it directly
// (a leader/MD cue arriving via poll, or the leader's own Go Next), the
// active block is scrolled into view automatically — this is the live
// auto-scroll contract: it follows position changes, it never causes one.
export function SongFlowRibbon({
  sections,
  selectedId,
  onSelect,
}: {
  sections: RibbonSection[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const activeRef = useRef<HTMLLIElement | null>(null);
  useAutoScrollIntoView(activeRef, selectedId);

  if (sections.length === 0) return null;

  return (
    <nav aria-label="Song flow" className="overflow-x-auto pb-1">
      <ol className="flex min-w-max items-end gap-1">
        {sections.map((s, i) => {
          const step = dynamicsStep(s.dynamics);
          const active = s.id === selectedId;
          return (
            <li key={s.id} ref={active ? activeRef : undefined} style={{ flexGrow: Math.max(1, s.repeatCount ?? 1), flexBasis: 72 }}>
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                aria-current={active ? "true" : undefined}
                title={s.dynamics ? `${s.label} · ${s.dynamics}` : s.label}
                className="group flex w-full flex-col items-stretch gap-1.5 text-left"
              >
                <span
                  className={cn(
                    "block rounded-t-md transition-colors duration-[var(--duration-fast)]",
                    active ? "bg-primary" : "bg-surface-muted group-hover:bg-border",
                  )}
                  style={{ height: 14 + step * 10 }}
                />
                <span
                  className={cn(
                    "tnum truncate text-xs",
                    active ? "font-bold text-primary" : "font-semibold text-muted-foreground",
                  )}
                >
                  {i + 1}. {s.label}
                  {s.repeatCount && s.repeatCount > 1 ? ` ×${s.repeatCount}` : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
