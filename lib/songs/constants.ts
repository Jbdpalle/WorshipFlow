export const CHROMATIC_KEYS = [
  "C",
  "C#",
  "Db",
  "D",
  "D#",
  "Eb",
  "E",
  "F",
  "F#",
  "Gb",
  "G",
  "G#",
  "Ab",
  "A",
  "A#",
  "Bb",
  "B",
] as const;

export const ROLES = [
  "Worship Leader",
  "Lead Vocal",
  "Backing Vocal",
  "Acoustic Guitar",
  "Electric Guitar",
  "Bass",
  "Drums",
  "Keys",
  "Piano",
  "Synth",
  "Violin",
  "Other",
] as const;

export type Role = (typeof ROLES)[number];

// A coarser grouping of ROLES into the four instrument families the
// Dashboard's compact setlist and team-coverage summaries show — display
// grouping only, not a schema change (SongAssignment/TeamMember still store
// the specific ROLES value).
export const ROLE_CATEGORIES = [
  { key: "vocals", label: "Vocals", roles: ["Worship Leader", "Lead Vocal", "Backing Vocal"] },
  { key: "guitar", label: "Guitar", roles: ["Acoustic Guitar", "Electric Guitar", "Bass"] },
  { key: "keys", label: "Keys", roles: ["Keys", "Piano", "Synth"] },
  { key: "drums", label: "Drums", roles: ["Drums"] },
] as const;
export type RoleCategoryKey = (typeof ROLE_CATEGORIES)[number]["key"];
export function categoryForRole(role: string): RoleCategoryKey | null {
  return ROLE_CATEGORIES.find((c) => (c.roles as readonly string[]).includes(role))?.key ?? null;
}

// Catch-all directions for the arrangement editor's "Add direction" — not
// real instrument/vocal roles, so they never appear in Team/Set role
// pickers, only in the per-section role-note editor and its readers. Lets a
// leader say e.g. "Rest of the Band: tacet" once instead of writing a rest
// note for every instrument that isn't individually called out.
export const DIRECTION_GROUPS = ["Rest of the Band", "Rest of the Vocals"] as const;
export type DirectionGroup = (typeof DIRECTION_GROUPS)[number];

const VOCAL_ROLES: readonly string[] = ["Worship Leader", "Lead Vocal", "Backing Vocal"];

// Which catch-all applies to a musician with no note of their own for a
// section — singers fall back to "Rest of the Vocals", everyone else to
// "Rest of the Band".
export function catchAllDirectionFor(role: string): DirectionGroup {
  return VOCAL_ROLES.includes(role) ? "Rest of the Vocals" : "Rest of the Band";
}

export const DEFAULT_SONG_STRUCTURE = [
  "Intro",
  "Verse 1",
  "Chorus",
  "Verse 2",
  "Chorus",
  "Bridge",
  "Final Chorus",
  "Outro",
];

export const ENERGY_LEVELS = ["low", "medium", "high"] as const;
export type EnergyLevel = (typeof ENERGY_LEVELS)[number];

// A worship-specific classification distinct from ENERGY_LEVELS above —
// where it fits in a typical service flow, not just how energetic it
// sounds. Editorial, set by the leader (or the metadata import), never
// inferred automatically.
export const WORSHIP_TYPES = [
  "High Praise",
  "Med Praise",
  "Praise/Worship",
  "Worship",
  "Medium Worship",
  "Slow Worship",
] as const;
export type WorshipType = (typeof WORSHIP_TYPES)[number];

// Per-section dynamics — a simple label, not a mixing console.
export const DYNAMICS_LEVELS = ["Intimate", "Light", "Building", "Strong", "Full"] as const;
export type DynamicsLevel = (typeof DYNAMICS_LEVELS)[number];

export const EVENT_TYPES = [
  { value: "SERVICE", label: "Sunday Service" },
  { value: "MINISTRY_SERVICE", label: "Ministry Service" },
  { value: "REHEARSAL", label: "Rehearsal / Practice" },
  { value: "SPECIAL_EVENT", label: "Special Event" },
  { value: "CONFERENCE_CAMP", label: "Conference / Camp" },
  { value: "CUSTOM", label: "Custom" },
] as const;
export type EventTypeValue = (typeof EVENT_TYPES)[number]["value"];
export function eventTypeLabel(value: string): string {
  return EVENT_TYPES.find((t) => t.value === value)?.label ?? value;
}

export const REHEARSAL_CHECK_STATUSES = [
  { value: "practiced", label: "Practiced" },
  { value: "needs_work", label: "Needs Work" },
  { value: "confirmed", label: "Confirmed" },
  { value: "changed", label: "Changed" },
] as const;

export const FEEDBACK_TYPES = [
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature Request" },
  { value: "general", label: "General Feedback" },
] as const;

// Theme categories the rule-based theme engine reasons about. Each carries
// keyword triggers used only to *suggest* — the worship leader always makes
// the final call on theological fit.
export const THEME_CATEGORIES: {
  key: string;
  label: string;
  description: string;
  keywords: string[];
}[] = [
  {
    key: "gods-love",
    label: "God's Love",
    description: "Songs about God's love for humanity.",
    keywords: ["love", "god's love", "father", "unconditional", "faithful", "faithfulness"],
  },
  {
    key: "our-response",
    label: "Our Response to God's Love",
    description: "Songs about responding to God's love.",
    keywords: ["response", "surrender", "yield", "give", "devotion", "follow"],
  },
  {
    key: "cross-sacrifice",
    label: "Cross / Sacrifice",
    description: "Songs connected to Christ's sacrificial love.",
    keywords: ["cross", "sacrifice", "blood", "calvary", "crucified", "atonement"],
  },
  {
    key: "grace-mercy",
    label: "Grace / Mercy",
    description: "Songs connected to God's mercy and grace.",
    keywords: ["grace", "mercy", "forgiven", "forgiveness", "redeemed", "redemption"],
  },
  {
    key: "worship-adoration",
    label: "Worship / Adoration",
    description: "Songs appropriate for responding in adoration.",
    keywords: ["worship", "adoration", "holy", "glory", "praise", "majesty", "wonder"],
  },
  {
    key: "surrender",
    label: "Surrender",
    description: "Songs of yielding and trust.",
    keywords: ["surrender", "trust", "yield", "still", "rest", "peace"],
  },
  {
    key: "high-praise",
    label: "High Praise",
    description: "Energetic, celebratory declaration.",
    keywords: ["praise", "celebrate", "joy", "victory", "shout", "rejoice"],
  },
];
