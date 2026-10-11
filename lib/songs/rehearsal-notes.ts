// Quick rehearsal-observation vocabulary. These are suggested labels on a
// single RehearsalNote model (one optional `category` column) — not five
// separate note systems.
export const REHEARSAL_NOTE_CATEGORIES = [
  { value: "KEEP", label: "Keep", hint: "This works — don't lose it" },
  { value: "FIX", label: "Fix", hint: "Needs correcting" },
  { value: "TRY", label: "Try", hint: "Test an alternative" },
  { value: "DECISION", label: "Decision", hint: "Agreed direction" },
  { value: "TRANSITION", label: "Transition", hint: "Connecting songs" },
] as const;

export type RehearsalNoteCategory = (typeof REHEARSAL_NOTE_CATEGORIES)[number]["value"];

export function isRehearsalNoteCategory(value: unknown): value is RehearsalNoteCategory {
  return REHEARSAL_NOTE_CATEGORIES.some((c) => c.value === value);
}

export const REHEARSAL_NOTE_MAX_LENGTH = 500;

// A note with no section anchor can't be turned into a section direction,
// and a TRANSITION note is about the handoff between songs rather than any
// one section's role direction — those stay as rehearsal notes (or are
// discarded) instead of offering a conversion that couldn't be applied.
export function canConvertNote(note: { sectionId: string | null; category: string | null; status: string }): boolean {
  return note.status === "OPEN" && !!note.sectionId && note.category !== "TRANSITION";
}
