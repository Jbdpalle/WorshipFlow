import { DYNAMICS_LEVELS } from "@/lib/songs/constants";

export const DYNAMICS_STEP_COUNT = DYNAMICS_LEVELS.length;

/**
 * Where a dynamics label sits on the 1–5 scale (Intimate … Full), or 0 when
 * it is unset or a custom label the leader typed ("Driving", "Hushed").
 * Used only to draw the dynamic indicator; the label itself is always
 * shown too, so custom words never lose meaning.
 */
export function dynamicsStep(dynamics: string | null | undefined): number {
  if (!dynamics) return 0;
  const index = (DYNAMICS_LEVELS as readonly string[]).indexOf(dynamics);
  return index + 1; // -1 (custom) becomes 0
}
