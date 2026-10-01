"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSetMeta } from "@/lib/actions/sets";

export function SetMetaEditor({
  setId,
  initialTheme,
  initialLeaderName,
}: {
  setId: string;
  initialTheme: string;
  initialLeaderName: string;
}) {
  const [theme, setTheme] = useState(initialTheme);
  const [leaderName, setLeaderName] = useState(initialLeaderName);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function save(input: { theme?: string; leaderName?: string }) {
    setError(null);
    const result = await updateSetMeta(setId, input);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <Label htmlFor="set-leader">Worship leader</Label>
        <Input
          id="set-leader"
          value={leaderName}
          placeholder="Not assigned"
          onChange={(e) => {
            setLeaderName(e.target.value);
            setSaved(false);
          }}
          onBlur={() => save({ leaderName })}
        />
      </div>
      <div>
        <Label htmlFor="set-theme">Theme</Label>
        <Input
          id="set-theme"
          value={theme}
          placeholder="Not set"
          onChange={(e) => {
            setTheme(e.target.value);
            setSaved(false);
          }}
          onBlur={() => save({ theme })}
        />
      </div>
      {error ? (
        <p className="sm:col-span-2 text-xs text-danger">{error}</p>
      ) : (
        <p className="sm:col-span-2 text-xs text-muted-foreground">{saved ? "Saved" : "Saving…"}</p>
      )}
    </div>
  );
}
