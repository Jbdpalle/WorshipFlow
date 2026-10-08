"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, FileMusic, Minus, Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { LyricsChordsView, type LyricsChordsMode } from "@/components/songs/lyrics-chords-view";
import { CHROMATIC_KEYS } from "@/lib/songs/constants";
import { Tooltip } from "@/components/ui/tooltip";
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

const SIZES = ["sm", "md", "lg", "xl"] as const;
type Size = (typeof SIZES)[number];

const MODES: { value: LyricsChordsMode; label: string }[] = [
  { value: "all", label: "Both" },
  { value: "lyrics", label: "Lyrics" },
  { value: "chords", label: "Chords" },
  { value: "numbers", label: "Numbers" },
];

export function SongChart({ song, initialKey }: { song: SongInfo; initialKey?: string | null }) {
  const [size, setSize] = useState<Size>("md");
  const [mode, setMode] = useState<LyricsChordsMode>("all");
  const [displayKey, setDisplayKey] = useState<string | null>(initialKey ?? song.key);

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ButtonLink href={`/songs/${song.id}`} variant="ghost">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Song details
          </ButtonLink>
        <div className="flex items-center gap-1 rounded-lg bg-surface-muted p-1 pl-3">
          <span className="text-sm font-semibold text-muted-foreground">Text size</span>
          <Tooltip content="Smaller text — handy on a music stand">
            <button
              onClick={() => changeSize(SIZES[Math.max(0, SIZES.indexOf(size) - 1)])}
              disabled={size === SIZES[0]}
              className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-surface disabled:opacity-40"
              aria-label="Smaller text"
            >
              <Minus className="h-4 w-4" />
            </button>
          </Tooltip>
          <span className="w-10 text-center text-sm font-bold text-foreground" aria-live="polite">{size.toUpperCase()}</span>
          <Tooltip content="Larger text — handy on a music stand">
            <button
              onClick={() => changeSize(SIZES[Math.min(SIZES.length - 1, SIZES.indexOf(size) + 1)])}
              disabled={size === SIZES[SIZES.length - 1]}
              className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-surface disabled:opacity-40"
              aria-label="Larger text"
            >
              <Plus className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold">{song.title}</h1>
        {song.artist && <p className="text-sm text-muted-foreground">{song.artist}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {song.key ? (
            <div className="flex items-center gap-1.5">
              <label htmlFor="chart-key" className="text-sm font-semibold text-muted-foreground">Key</label>
              <Tooltip content="Transposes this chart for display only — it doesn't change the song's saved key">
                <Select
                  id="chart-key"
                  value={displayKey ?? song.key}
                  onChange={(e) => setDisplayKey(e.target.value)}
                  className="h-11 w-20 text-sm"
                >
                  {CHROMATIC_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </Select>
              </Tooltip>
              {displayKey && displayKey !== song.key && (
                <Badge variant="musical">transposed from {song.key}</Badge>
              )}
            </div>
          ) : (
            <Badge variant="outline">No key set</Badge>
          )}
          {song.bpm && <Badge variant="outline">{song.bpm} BPM</Badge>}
          {song.timeSignature && <Badge variant="outline">{song.timeSignature}</Badge>}
          <div className="ml-auto flex gap-1 rounded-lg bg-surface-muted p-1">
            {MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                className={cn(
                  "tap-target rounded-md px-3 text-sm font-semibold transition-colors",
                  mode === m.value
                    ? "bg-primary text-primary-foreground"
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
        <p role="status" className="rounded-lg bg-surface-muted px-3 py-2 text-sm text-muted-foreground">
          Set this song&apos;s key above to see Nashville numbers — showing chord names until then.
        </p>
      )}

      {sectionsWithContent.length === 0 ? (
        <EmptyState
          icon={FileMusic} stage="arrange"
          title="No chords or lyrics yet"
          description="Add them to a section in Song Flow, or import a chord-chart PDF from the Songs library."
          action={
            <ButtonLink href={`/songs/${song.id}`}>Open song</ButtonLink>
          }
        />
      ) : (
        <div className="space-y-6">
          {sectionsWithContent.map((section) => (
            <div key={section.id}>
              <h2 className="mb-1 label-caps">
                {section.label}
              </h2>
              <LyricsChordsView
                content={section.lyricsChords!}
                size={size}
                mode={mode}
                songKey={song.key}
                transposeToKey={displayKey}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
