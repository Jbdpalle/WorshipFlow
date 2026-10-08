"use client";

import { ReactNode, useId, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useOverlay } from "@/components/ui/use-overlay";

// Contextual panel. One component, two presentations:
//   phone (< md)  → bottom sheet that rises from the bottom edge
//   iPad/desktop  → drawer docked to the right
// Use for contextual editing and the mobile "More" menu. Use Dialog for a
// single focused decision.
export function Sheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useOverlay(open, onClose, panelRef);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end">
      <div className="absolute inset-0 bg-scrim" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "anim-sheet relative z-10 flex max-h-[85vh] w-full flex-col rounded-t-2xl border border-border bg-surface-elevated shadow-lg focus:outline-none md:max-h-none md:w-[28rem] md:rounded-none md:rounded-l-2xl",
          className,
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="tap-target -mr-2 flex w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
