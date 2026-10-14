import { laneForRole } from "@/lib/songs/role-notes";
import { dynamicsStep } from "@/lib/songs/dynamics";

// Pure derivation behind the arrangement overview (vocal + instrument
// entrances, drop-outs, builds, endings). It only reads what already exists —
// SongRoleNote rows and SongSection.dynamics — and stays section-level on
// purpose: this is "who is playing when", not a DAW grid.

export type PartState =
  | "enter" // first time this part plays
  | "return" // plays again after having dropped out
  | "play" // still playing from the previous section
  | "out" // dropped out here (rest/stop direction, or no direction after playing)
  | "off"; // not playing (before entering, or still out)

export type DynamicsTrend = "build" | "drop" | "steady" | "unknown";

// The Quick Direction picker's "off" chips ("Rest", "Stop", "No vocals") are
// stored as the start of the direction text. Only an explicit leading word
// counts — free text is never guessed at.
const REST_PATTERN = /^\s*(rest|stop|tacet|no vocals|sit out|drop out|out|silent)\b/i;

export function isRestDirection(content: string): boolean {
  return REST_PATTERN.test(content);
}

type SectionInput = {
  id: string;
  label: string;
  repeatCount: number | null;
  dynamics?: string | null;
  roleNotes: { role: string; content: string }[];
};

export type ArrangementRow = { role: string; lane: "vocal" | "instrument" };

export type ArrangementColumn = {
  id: string;
  label: string;
  repeatCount: number | null;
  dynamics: string | null;
  dynamicsStep: number;
  trend: DynamicsTrend;
  isEnding: boolean;
  states: Record<string, PartState>;
};

export type ArrangementOverview = { rows: ArrangementRow[]; columns: ArrangementColumn[] };

export function deriveArrangementOverview(sections: SectionInput[]): ArrangementOverview {
  const roleOrder: string[] = [];
  for (const s of sections) {
    for (const n of s.roleNotes) {
      if (n.content.trim() && !roleOrder.includes(n.role)) roleOrder.push(n.role);
    }
  }
  const rows: ArrangementRow[] = [
    ...roleOrder.filter((r) => laneForRole(r) === "vocal"),
    ...roleOrder.filter((r) => laneForRole(r) === "instrument"),
  ].map((role) => ({ role, lane: laneForRole(role) }));

  const playing = new Map<string, boolean>();
  const hasPlayed = new Set<string>();
  let previousStep = 0;

  const columns = sections.map((section, i): ArrangementColumn => {
    const states: Record<string, PartState> = {};
    for (const { role } of rows) {
      const notes = section.roleNotes.filter((n) => n.role === role && n.content.trim());
      // Any non-rest direction means the part is active here.
      const active = notes.length > 0 && notes.some((n) => !isRestDirection(n.content));
      const wasPlaying = playing.get(role) ?? false;
      let state: PartState;
      if (active) {
        state = wasPlaying ? "play" : hasPlayed.has(role) ? "return" : "enter";
        hasPlayed.add(role);
      } else {
        state = wasPlaying ? "out" : "off";
      }
      playing.set(role, active);
      states[role] = state;
    }

    const step = dynamicsStep(section.dynamics);
    const trend: DynamicsTrend =
      step === 0 || (i > 0 && previousStep === 0)
        ? "unknown"
        : i === 0
          ? "steady"
          : step > previousStep
            ? "build"
            : step < previousStep
              ? "drop"
              : "steady";
    previousStep = step;

    return {
      id: section.id,
      label: section.label,
      repeatCount: section.repeatCount,
      dynamics: section.dynamics ?? null,
      dynamicsStep: step,
      trend,
      isEnding: i === sections.length - 1 && sections.length > 1,
      states,
    };
  });

  return { rows, columns };
}

export const PART_STATE_LABEL: Record<PartState, string> = {
  enter: "Enters",
  return: "Returns",
  play: "Playing",
  out: "Drops out",
  off: "Not playing",
};

// Short, glanceable tag for one viewer's own part in a given section.
export function partStateBadge(state: PartState | undefined): string | null {
  if (state === "enter" || state === "return") return "IN";
  if (state === "out") return "OUT";
  return null;
}

// Per-section IN/OUT tags for one role (null where nothing changes), or
// undefined when that role has no directions anywhere in the song.
export function partTagsForRole(
  sections: SectionInput[],
  role: string,
): Record<string, string | null> | undefined {
  const overview = deriveArrangementOverview(sections);
  if (!overview.rows.some((r) => r.role === role)) return undefined;
  return Object.fromEntries(overview.columns.map((c) => [c.id, partStateBadge(c.states[role])]));
}

// Same, but for a viewer holding several roles at once: a section is tagged
// IN if any of their roles enters there, else OUT if any drops out there —
// "something you play starts/stops here" rather than tracking each role's
// tag separately (the flow ribbon only has room for one badge per section).
export function partTagsForRoles(
  sections: SectionInput[],
  roles: string[],
): Record<string, string | null> | undefined {
  const perRole = roles.map((role) => partTagsForRole(sections, role)).filter((t) => t !== undefined);
  if (perRole.length === 0) return undefined;
  const sectionIds = new Set(perRole.flatMap((t) => Object.keys(t)));
  const merged: Record<string, string | null> = {};
  for (const id of sectionIds) {
    const states = perRole.map((t) => t[id]);
    merged[id] = states.includes("IN") ? "IN" : states.includes("OUT") ? "OUT" : null;
  }
  return merged;
}
