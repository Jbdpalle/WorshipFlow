"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { suggestThemeAndVerse } from "@/lib/actions/song-insights";
import { updateSong, addBibleReference } from "@/lib/actions/songs";

export function ThemeVerseSuggestion({ songId }: { songId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [suggestion, setSuggestion] = useState<{ theme: string; verseReference: string; verseText: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  async function handleSuggest() {
    setLoading(true);
    setError(null);
    const result = await suggestThemeAndVerse(songId);
    if (result.ok) {
      setSuggestion(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  async function handleApply() {
    if (!suggestion) return;
    setApplying(true);
    setError(null);
    const [themeResult, verseResult] = await Promise.all([
      updateSong(songId, { themeCategory: suggestion.theme }),
      addBibleReference(songId, suggestion.verseReference, suggestion.verseText || undefined),
    ]);
    if (!themeResult.ok) {
      setError(themeResult.error);
      setApplying(false);
      return;
    }
    if (!verseResult.ok) {
      setError(verseResult.error);
      setApplying(false);
      return;
    }
    setApplied(true);
    setApplying(false);
    router.refresh();
  }

  if (applied) {
    return <p className="text-xs text-success">Theme and verse added below — feel free to edit either.</p>;
  }

  if (!suggestion) {
    return (
      <div className="space-y-1">
        <Button loading={loading} type="button" size="sm" variant="ghost" disabled={loading} onClick={handleSuggest}>
          <Sparkles className="h-3.5 w-3.5" /> {loading ? "Reading lyrics…" : "Suggest theme & verse"}
        </Button>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg bg-musical-soft p-3 text-sm">
      <div>
        <span className="font-medium">Theme:</span> {suggestion.theme}
      </div>
      <div>
        <span className="font-medium">{suggestion.verseReference}</span>
        {suggestion.verseText && <span className="text-muted-foreground"> — {suggestion.verseText}</span>}
      </div>
      <p className="text-xs text-muted-foreground">
        AI-generated — double-check the verse reference before relying on it.
      </p>
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button loading={applying} type="button" size="sm" disabled={applying} onClick={handleApply}>
          {applying ? "Applying…" : "Use this"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={applying}
          onClick={() => {
            setSuggestion(null);
            setError(null);
          }}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
