import { Mic, Guitar, Keyboard, Drum, type LucideIcon } from "lucide-react";
import type { RoleCategoryKey } from "@/lib/songs/constants";
import { cn } from "@/lib/utils/cn";

export const ROLE_CATEGORY_ICONS: Record<RoleCategoryKey, LucideIcon> = {
  vocals: Mic,
  guitar: Guitar,
  keys: Keyboard,
  drums: Drum,
};

// The small mic/guitar/keys/drums row shown on each setlist row — filled
// gold when that instrument family has an assignment for the song, gray
// when it doesn't yet.
export function CoverageIcons({ covered }: { covered: RoleCategoryKey[] }) {
  const coveredSet = new Set(covered);
  return (
    <div className="flex items-center gap-1">
      {(Object.keys(ROLE_CATEGORY_ICONS) as RoleCategoryKey[]).map((key) => {
        const Icon = ROLE_CATEGORY_ICONS[key];
        const on = coveredSet.has(key);
        return (
          <span
            key={key}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full",
              on ? "bg-accent/20 text-accent" : "bg-surface-muted text-muted-foreground/40",
            )}
            title={on ? `${key} covered` : `${key} not assigned`}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        );
      })}
    </div>
  );
}
