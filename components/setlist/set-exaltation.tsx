"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateSetExaltation } from "@/lib/actions/sets";
import { getOpeningPlaceholder } from "@/lib/songs/vision-guidance";

export function SetExaltation({
  setId,
  initialExaltation,
  theme,
  keywords,
  isLeader,
}: {
  setId: string;
  initialExaltation: string;
  theme: string;
  keywords: string;
  isLeader: boolean;
}) {
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

  if (!isLeader) {
    return (
      <p className="text-sm text-muted-foreground">
        {initialExaltation.trim() || "Nothing set yet for this service."}
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
        placeholder={getOpeningPlaceholder(theme, keywords)}
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
