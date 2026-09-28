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
