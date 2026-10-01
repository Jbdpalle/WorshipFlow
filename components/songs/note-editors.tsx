"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { updateSong } from "@/lib/actions/songs";
import { savePersonalNote } from "@/lib/actions/notes";

export function SongVisionEditor({ songId, initialVision }: { songId: string; initialVision: string }) {
  const [value, setValue] = useState(initialVision);
  return (
    <div>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => updateSong(songId, { visionNote: value })}
        rows={3}
        placeholder="Start intimate. Keep Verse 1 open. Bring BGVs in during the second chorus. Build through the bridge and leave room for spontaneous worship."
      />
    </div>
  );
}

export function TeamNotesEditor({ songId, initialNotes }: { songId: string; initialNotes: string }) {
  const [value, setValue] = useState(initialNotes);
  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">
        Leader direction for the whole song — visible to the whole team.
      </p>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => updateSong(songId, { notes: value })}
        rows={4}
        placeholder="Overall feel, dynamics, anything that applies to the whole song."
      />
    </div>
  );
}

export function PersonalNoteEditor({ songId, initialNote }: { songId: string; initialNote: string }) {
  const [value, setValue] = useState(initialNote);
  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">
        Private to you — never overwrites the leader&apos;s arrangement or shows to the team.
      </p>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => savePersonalNote(songId, value)}
        rows={4}
        placeholder="Reminders just for you — e.g. capo 2, start lower than normal."
      />
    </div>
  );
}
