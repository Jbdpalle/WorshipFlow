"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { updateSetMeta } from "@/lib/actions/sets";

type SongOption = { songId: string; title: string };

export function SetMetaEditor({
  setId,
  initialTheme,
  initialLeaderName,
  initialKeywords,
  initialAnchorSongId,
  songOptions,
}: {
  setId: string;
  initialTheme: string;
  initialLeaderName: string;
  initialKeywords: string;
  initialAnchorSongId: string;
  songOptions: SongOption[];
}) {
  const [theme, setTheme] = useState(initialTheme);
  const [leaderName, setLeaderName] = useState(initialLeaderName);
  const [keywords, setKeywords] = useState(initialKeywords);
  const [anchorSongId, setAnchorSongId] = useState(initialAnchorSongId);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Other actions on this page (the anchor star on a song card, in
  // particular) can change this same WorshipSet and call router.refresh(),
  // which gives this component fresh props without remounting it — resync
  // local state from props during render rather than only on mount. See
  // https://react.dev/learn/you-might-not-need-an-effect
  const [synced, setSynced] = useState({ initialTheme, initialLeaderName, initialKeywords, initialAnchorSongId });
  if (
    synced.initialTheme !== initialTheme ||
    synced.initialLeaderName !== initialLeaderName ||
    synced.initialKeywords !== initialKeywords ||
    synced.initialAnchorSongId !== initialAnchorSongId
  ) {
    setSynced({ initialTheme, initialLeaderName, initialKeywords, initialAnchorSongId });
    setTheme(initialTheme);
    setLeaderName(initialLeaderName);
    setKeywords(initialKeywords);
    setAnchorSongId(initialAnchorSongId);
  }

  async function save(input: {
    theme?: string;
    leaderName?: string;
    keywords?: string;
    anchorSongId?: string | null;
  }) {
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
      <div>
        <Label htmlFor="set-anchor">Anchor song</Label>
        <Select
          id="set-anchor"
          value={anchorSongId}
          onChange={(e) => {
            const next = e.target.value;
            setAnchorSongId(next);
            save({ anchorSongId: next || null });
          }}
        >
          <option value="">None</option>
          {songOptions.map((s) => (
            <option key={s.songId} value={s.songId}>
              {s.title}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="set-keywords">Key words</Label>
        <Input
          id="set-keywords"
          value={keywords}
          placeholder="grace, surrender, hope"
          onChange={(e) => {
            setKeywords(e.target.value);
            setSaved(false);
          }}
          onBlur={() => save({ keywords })}
        />
      </div>
      <div className="flex items-center justify-between gap-2 sm:col-span-2">
        {error ? (
          <p className="text-xs text-danger">{error}</p>
        ) : (
          <p className="text-xs text-muted-foreground">{saved ? "Saved" : "Saving…"}</p>
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => save({ theme, leaderName, keywords, anchorSongId: anchorSongId || null })}
        >
          <Save className="h-3.5 w-3.5" /> Save
        </Button>
      </div>
    </div>
  );
}
