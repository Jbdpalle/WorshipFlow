import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// Colour = where you are in the workflow. Plan → Arrange → Assign → Rehearse,
// then My part, Lead and Support. The colour only ever repeats information the
// label already carries (icons are decorative), so nobody depends on it.
// Class names are written out in full so Tailwind can see them.
export type Stage = "plan" | "arrange" | "assign" | "rehearse" | "mypart" | "lead" | "support";

export const STAGES: Stage[] = ["plan", "arrange", "assign", "rehearse", "mypart", "lead", "support"];

export const STAGE_TEXT: Record<Stage, string> = {
  plan: "text-stage-plan",
  arrange: "text-stage-arrange",
  assign: "text-stage-assign",
  rehearse: "text-stage-rehearse",
  mypart: "text-stage-mypart",
  lead: "text-stage-lead",
  support: "text-stage-support",
};

export const STAGE_SOFT_BG: Record<Stage, string> = {
  plan: "bg-stage-plan-soft",
  arrange: "bg-stage-arrange-soft",
  assign: "bg-stage-assign-soft",
  rehearse: "bg-stage-rehearse-soft",
  mypart: "bg-stage-mypart-soft",
  lead: "bg-stage-lead-soft",
  support: "bg-stage-support-soft",
};

const SOLID_BG: Record<Stage, string> = {
  plan: "bg-stage-plan",
  arrange: "bg-stage-arrange",
  assign: "bg-stage-assign",
  rehearse: "bg-stage-rehearse",
  mypart: "bg-stage-mypart",
  lead: "bg-stage-lead",
  support: "bg-stage-support",
};

const TILE_SIZE = {
  sm: { box: "h-8 w-8 rounded-lg", icon: "h-4 w-4" },
  md: { box: "h-10 w-10 rounded-xl", icon: "h-5 w-5" },
  lg: { box: "h-12 w-12 rounded-xl", icon: "h-6 w-6" },
} as const;

/**
 * A stage-coloured icon.
 * - variant "plain": just the glyph in the stage colour (navigation, inline).
 * - variant "tile":  glyph on its soft tint (headers, empty states, cards).
 * - variant "solid": white/dark glyph on the full colour (a single call-out).
 */
export function StageIcon({
  icon: Icon,
  stage,
  variant = "tile",
  size = "md",
  className,
}: {
  icon: LucideIcon;
  stage: Stage;
  variant?: "plain" | "tile" | "solid";
  size?: keyof typeof TILE_SIZE;
  className?: string;
}) {
  const s = TILE_SIZE[size];
  if (variant === "plain") {
    return <Icon className={cn(s.icon, "shrink-0", STAGE_TEXT[stage], className)} aria-hidden />;
  }
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        s.box,
        variant === "tile" ? [STAGE_SOFT_BG[stage], STAGE_TEXT[stage]] : [SOLID_BG[stage], "text-background"],
        className,
      )}
    >
      <Icon className={s.icon} />
    </span>
  );
}
