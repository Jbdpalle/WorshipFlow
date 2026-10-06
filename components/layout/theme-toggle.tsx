"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type ThemePreference } from "@/lib/theme/use-theme";
import { cn } from "@/lib/utils/cn";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

// A compact icon button for the sidebar / mobile menu — cycles
// light → dark → system on each click, always showing the icon for the
// CURRENT choice (clicking shows you what you'll get, not what you have).
export function ThemeToggleButton({
  className,
  showLabel,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const [theme, setTheme] = useTheme();
  const index = OPTIONS.findIndex((o) => o.value === theme);
  const current = OPTIONS[index] ?? OPTIONS[2];
  const Icon = current.icon;

  return (
    <button
      type="button"
      onClick={() => setTheme(OPTIONS[(index + 1) % OPTIONS.length].value)}
      className={cn(
        "tap-target flex items-center gap-2 rounded-lg px-2 text-sm font-medium text-muted-foreground hover:bg-surface-muted hover:text-foreground",
        className,
      )}
      aria-label={`Appearance: ${current.label}. Click to change.`}
      title={`Appearance: ${current.label}`}
    >
      <Icon className="h-4 w-4" />
      {showLabel && <span>Appearance: {current.label}</span>}
    </button>
  );
}

// The explicit three-way picker for the Settings page.
export function ThemeSegmentedControl() {
  const [theme, setTheme] = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      className="inline-flex items-center gap-1 rounded-lg bg-surface-muted p-1"
    >
      {OPTIONS.map((o) => {
        const Icon = o.icon;
        const active = theme === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(o.value)}
            className={cn(
              "tap-target flex items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
