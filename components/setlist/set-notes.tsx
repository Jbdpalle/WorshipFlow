"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { updateSetNotes } from "@/lib/actions/sets";

export function SetNotes({ setId, initialNotes }: { setId: string; initialNotes: string }) {
  const [value, setValue] = useState(initialNotes);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        onBlur={async () => {
          setError(null);
          const result = await updateSetNotes(setId, value);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setSaved(true);
        }}
        placeholder={'Keep this one intimate. Build toward free worship. Connect this to the sermon.'}
        rows={3}
      />
      {error ? (
        <p className="mt-1 text-xs text-danger">{error}</p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">{saved ? "Saved" : "Saving…"}</p>
      )}
    </div>
  );
}
