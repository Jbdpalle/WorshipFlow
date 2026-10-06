"use client";

import { useState } from "react";
import { Save } from "lucide-react";
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
