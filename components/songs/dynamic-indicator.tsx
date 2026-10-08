import { cn } from "@/lib/utils/cn";
import { DYNAMICS_STEP_COUNT, dynamicsStep } from "@/lib/songs/dynamics";

const HEIGHTS = ["h-1.5", "h-2.5", "h-3.5", "h-[18px]", "h-[22px]"];

// Dynamics as five rising bars plus the word, so the shape of a song reads
// before any text does. Custom labels (not on the 1–5 scale) show the word
// with empty bars. The bars are decorative; the label carries the meaning.
export function DynamicIndicator({
  dynamics,
  showLabel = true,
  className,
}: {
  dynamics: string | null | undefined;
  showLabel?: boolean;
  className?: string;
}) {
  if (!dynamics) return null;
  const step = dynamicsStep(dynamics);
  return (
    <span
      className={cn("inline-flex items-end gap-2", className)}
      role="img"
      aria-label={step > 0 ? `Dynamics: ${dynamics}, ${step} of ${DYNAMICS_STEP_COUNT}` : `Dynamics: ${dynamics}`}
    >
      <span className="inline-flex items-end gap-0.5" aria-hidden>
        {HEIGHTS.map((h, i) => (
          <i
            key={i}
            className={cn("block w-1 rounded-[1px]", h, i < step ? "bg-musical" : "bg-border")}
          />
        ))}
      </span>
      {showLabel && <span className="text-xs font-semibold leading-none text-muted-foreground">{dynamics}</span>}
    </span>
  );
}
