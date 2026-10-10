"use client";

import { useState } from "react";
import { Save, Lock, Plus } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SaveStatus, type SaveState } from "@/components/ui/save-status";
import { updateSong } from "@/lib/actions/songs";
import { savePersonalNote } from "@/lib/actions/notes";

export function TeamNotesEditor({ songId, initialNotes }: { songId: string; initialNotes: string }) {
  const [value, setValue] = useState(initialNotes);
  const [status, setStatus] = useState<SaveState>("idle");

  async function save() {
    setStatus("saving");
    const result = await updateSong(songId, { notes: value });
    setStatus(result.ok ? "saved" : "error");
    if (result.ok) setTimeout(() => setStatus("idle"), 1800);
  }

  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">
        Leader direction for the whole song — visible to the whole team.
      </p>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        rows={4}
        placeholder="Overall feel, dynamics, anything that applies to the whole song."
      />
      <div className="mt-2 flex items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={save}>
          <Save className="h-3.5 w-3.5" /> Save
        </Button>
        <SaveStatus state={status} />
      </div>
    </div>
  );
}

export function PersonalNoteEditor({ songId, initialNote }: { songId: string; initialNote: string }) {
  const [value, setValue] = useState(initialNote);
  const [status, setStatus] = useState<SaveState>("idle");

  async function save() {
    setStatus("saving");
    const result = await savePersonalNote(songId, value);
    setStatus(result.ok ? "saved" : "error");
    if (result.ok) setTimeout(() => setStatus("idle"), 1800);
  }

  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">
        Private to you — never overwrites the leader&apos;s arrangement or shows to the team.
      </p>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        rows={4}
        placeholder="Reminders just for you — e.g. capo 2, start lower than normal."
      />
      <div className="mt-2 flex items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={save}>
          <Save className="h-3.5 w-3.5" /> Save
        </Button>
        <SaveStatus state={status} />
      </div>
    </div>
  );
}

// A private reminder pinned to one section/cue — e.g. "come in quiet on
// line 2" — distinct from the whole-song PersonalNoteEditor above. Same
// PersonalNote model, same userId-only visibility; sectionId is just which
// row this is (see savePersonalNote). Never visible to anyone but the
// author, and never changes the leader's shared arrangement.
export function SectionPersonalNote({
  songId,
  sectionId,
  initialNote,
}: {
  songId: string;
  sectionId: string;
  initialNote: string;
}) {
  const [open, setOpen] = useState(initialNote.trim().length > 0);
  const [value, setValue] = useState(initialNote);
  // Same render-time resync as RoleNoteRow — this component stays mounted
  // across a same-section refresh (its parent FocusedSectionEditor only
  // remounts when switching sections), so without this a fresh initialNote
  // from the server wouldn't otherwise reach already-mounted local state.
  const [syncedNote, setSyncedNote] = useState(initialNote);
  if (initialNote !== syncedNote) {
    setSyncedNote(initialNote);
    setValue(initialNote);
  }
  const [status, setStatus] = useState<SaveState>("idle");

  async function save() {
    setStatus("saving");
    const result = await savePersonalNote(songId, value, sectionId);
    setStatus(result.ok ? "saved" : "error");
    if (result.ok) setTimeout(() => setStatus("idle"), 1800);
  }

  if (!open) {
    return (
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" /> Add a private note (just for you)
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-border p-2">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Lock className="h-3 w-3" aria-hidden /> Private to you — not part of the shared arrangement
      </p>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        rows={1}
        className="min-h-9 bg-surface text-sm"
        placeholder="e.g. Come in quiet on line 2"
        autoFocus
      />
      <div className="mt-1.5 flex items-center gap-2">
        <SaveStatus state={status} />
      </div>
    </div>
  );
}
