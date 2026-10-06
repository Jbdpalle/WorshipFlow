// WHAT-chip vocabulary for the Quick Direction picker, keyed by instrument
// family rather than the exact ROLES value — "Electric Guitar" and
// "Acoustic Guitar" both play guitar-shaped directions, for instance.
// Purely UI data: the role actually saved on the SongRoleNote is always one
// of the real ROLES/DIRECTION_GROUPS values (or a custom one), never one of
// these family keys, so every existing reader (My Part, Rehearsal Mode,
// selectRoleNoteForViewer) needs no changes at all.

export const QUICK_DIRECTION_FAMILIES = ["guitar", "drums", "keys", "bass", "vocals", "general"] as const;
export type QuickDirectionFamily = (typeof QUICK_DIRECTION_FAMILIES)[number];

export const QUICK_DIRECTION_VOCAB: Record<QuickDirectionFamily, string[]> = {
  guitar: ["8ths", "16ths", "Swells", "Muted", "Full strum", "Arpeggiate", "Rest"],
  drums: ["Hi-hats (8ths)", "Kick only", "Half-time", "Build", "Crash", "Full groove", "Stop"],
  keys: ["Pad", "Piano", "Strings", "Arpeggio", "Swells", "Rest"],
  bass: ["Root notes", "Sustained", "8ths", "Follow kick", "Enter halfway", "Rest"],
  vocals: ["Lead", "Harmony", "Unison", "BGV", "Ad-lib", "Octave", "No vocals"],
  general: ["Build", "Hold", "Rest", "Full", "Soft"],
};

const GUITAR_ROLES: readonly string[] = ["Acoustic Guitar", "Electric Guitar"];
const KEYS_ROLES: readonly string[] = ["Keys", "Piano", "Synth"];
const VOCAL_ROLES: readonly string[] = ["Worship Leader", "Lead Vocal", "Backing Vocal", "Rest of the Vocals"];

export function familyForRole(role: string): QuickDirectionFamily {
  if (GUITAR_ROLES.includes(role)) return "guitar";
  if (role === "Drums") return "drums";
  if (KEYS_ROLES.includes(role)) return "keys";
  if (role === "Bass") return "bass";
  if (VOCAL_ROLES.includes(role)) return "vocals";
  return "general";
}

export function vocabForRole(role: string): string[] {
  return QUICK_DIRECTION_VOCAB[familyForRole(role)];
}

// Section-level intent chips (Feature 4) — composed into the existing
// free-text SongSection.dynamics field, same as a hand-typed custom value.
export const SECTION_INTENT_CHIPS = ["Build", "Drop", "Hold", "Full"] as const;
