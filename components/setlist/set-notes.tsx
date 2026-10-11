"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateSetNotes } from "@/lib/actions/sets";

export function SetNotes({
  setId,
  initialNotes,
  isLeader,
  placeholder = "Keep this one intimate. Build toward free worship. Connect this to the sermon.",
  emptyText = "No notes yet for this service.",
  rows = 3,
}: {
  setId: string;
  initialNotes: string;
  isLeader: boolean;
  placeholder?: string;
  emptyText?: string;
  rows?: number;
}) {
  const [value, setValue] = useState(initialNotes);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    const result = await updateSetNotes(setId, value);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
  }

  if (!isLeader) {
    return (
      <p className="whitespace-pre-line text-sm text-foreground">
        {initialNotes.trim() || emptyText}
      </p>
    );
  }

  return (
    <div>
      <Textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        onBlur={save}
        placeholder={placeholder}
        rows={rows}
        aria-label="Set vision"
      />
      <div className="mt-1 flex items-center justify-between gap-2">
        {error ? (
          <p className="text-xs text-danger">{error}</p>
        ) : (
          <p className="text-xs text-muted-foreground">{saved ? "Saved" : "Saving…"}</p>
        )}
        <Button type="button" variant="secondary" size="sm" onClick={save}>
          <Save className="h-3.5 w-3.5" /> Save
        </Button>
      </div>
    </div>
  );
}
