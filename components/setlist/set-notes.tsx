"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { updateSetNotes } from "@/lib/actions/sets";

export function SetNotes({ setId, initialNotes }: { setId: string; initialNotes: string }) {
  const [value, setValue] = useState(initialNotes);
  const [saved, setSaved] = useState(true);

  return (
    <div>
      <Textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        onBlur={async () => {
          await updateSetNotes(setId, value);
          setSaved(true);
        }}
        placeholder="Notes for the whole service — flow, transitions, reminders for the team."
        rows={3}
      />
      <p className="mt-1 text-xs text-muted-foreground">{saved ? "Saved" : "Saving…"}</p>
    </div>
  );
}
