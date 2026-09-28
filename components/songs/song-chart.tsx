"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LyricsChordsView, type LyricsChordsMode } from "@/components/songs/lyrics-chords-view";
import { cn } from "@/lib/utils/cn";

type Section = { id: string; label: string; lyricsChords: string | null };
type SongInfo = {
  id: string;
  title: string;
  artist: string | null;
  key: string | null;
  bpm: number | null;
  timeSignature: string | null;
  sections: Section[];
};

const SIZES = ["sm", "md", "lg"] as const;
type Size = (typeof SIZES)[number];

const MODES: { value: LyricsChordsMode; label: string }[] = [
  { value: "all", label: "Both" },
  { value: "lyrics", label: "Lyrics" },
  { value: "chords", label: "Chords" },
  { value: "numbers", label: "Numbers" },
];

export function SongChart({ song }: { song: SongInfo }) {
  const [size, setSize] = useState<Size>("md");
  const [mode, setMode] = useState<LyricsChordsMode>("all");

  useEffect(() => {
    // Reads a per-viewer browser preference that isn't available during SSR,
    // so this can only happen after mount.
    try {
      const saved = localStorage.getItem("worshipflow-chart-size");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved && SIZES.includes(saved as Size)) setSize(saved as Size);
    } catch {
      // ignore
    }
  }, []);

  function changeSize(next: Size) {
    setSize(next);
    try {
      localStorage.setItem("worshipflow-chart-size", next);
    } catch {
      // ignore
    }
  }

  const sectionsWithContent = song.sections.filter((s) => s.lyricsChords?.trim());

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-16">
      <div className="flex items-center justify-between gap-2">
        <Link href={`/songs/${song.id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <div className="flex items-center gap-1 rounded-lg bg-surface-muted p-1">
          <button
            onClick={() => changeSize(SIZES[Math.max(0, SIZES.indexOf(size) - 1)])}
            className="rounded-md p-1.5 hover:bg-surface"
            aria-label="Smaller text"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-10 text-center text-xs text-muted-foreground">{size.toUpperCase()}</span>
          <button
            onClick={() => changeSize(SIZES[Math.min(SIZES.length - 1, SIZES.indexOf(size) + 1)])}
            className="rounded-md p-1.5 hover:bg-surface"
            aria-label="Larger text"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold">{song.title}</h1>
        {song.artist && <p className="text-sm text-muted-foreground">{song.artist}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {song.key && <Badge variant="outline">Key {song.key}</Badge>}
          {song.bpm && <Badge variant="outline">{song.bpm} BPM</Badge>}
          {song.timeSignature && <Badge variant="outline">{song.timeSignature}</Badge>}
          <div className="ml-auto flex gap-1 rounded-lg bg-surface-muted p-1">
            {MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  mode === m.value
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {mode === "numbers" && !song.key && (
        <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm text-muted-foreground">
          Set this song&apos;s key above to see Nashville numbers — showing chord names until then.
        </p>
      )}

      {sectionsWithContent.length === 0 ? (
        <p className="text-muted-foreground">
          No chords or lyrics saved for this song yet. Add them from the Arrangement tab, or
          import a chord-chart PDF from the Song Library.
        </p>
      ) : (
        <div className="space-y-6">
          {sectionsWithContent.map((section) => (
            <div key={section.id}>
              <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {section.label}
              </h2>
              <LyricsChordsView
                content={section.lyricsChords!}
                size={size}
                mode={mode}
                songKey={song.key}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
