"use client";

import { cn } from "@/lib/utils/cn";

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "tap-target relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-[var(--duration-fast)]",
        checked ? "bg-primary" : "border border-border bg-surface-muted",
      )}
    >
      <span
        className={cn(
          "inline-block h-[18px] w-[18px] transform rounded-full bg-surface-elevated transition-transform duration-[var(--duration-fast)]",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}
