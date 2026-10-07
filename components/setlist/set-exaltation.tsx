"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateSetExaltation } from "@/lib/actions/sets";

export function SetExaltation({ setId, initialExaltation }: { setId: string; initialExaltation: string }) {
  const [value, setValue] = useState(initialExaltation);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    const result = await updateSetExaltation(setId, value);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
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
        placeholder="What's on your heart as you open worship — a verse, a prayer, a word to set the tone."
        rows={3}
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
