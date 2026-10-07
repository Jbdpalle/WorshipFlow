"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Sparkles, PlayCircle, Music2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { loadSampleData } from "@/lib/actions/sample-data";

type LibrarySong = {
  id: string;
  title: string;
  artist: string | null;
  key: string | null;
  bpm: number | null;
  themeCategory: string | null;
  tags: { id: string; label: string }[];
  youtubeUrl: string | null;
  spotifyUrl: string | null;
};

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function SongLibraryList({ songs }: { songs: LibrarySong[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [loadingSample, setLoadingSample] = useState(false);
  const [sampleError, setSampleError] = useState<string | null>(null);

  const availableLetters = useMemo(() => {
    const set = new Set<string>();
    for (const s of songs) {
      const first = s.title.trim()[0]?.toUpperCase();
      if (first && ALPHABET.includes(first)) set.add(first);
    }
    return set;
  }, [songs]);

  const filtered = useMemo(() => {
    if (activeLetter) {
      return songs.filter((s) => s.title.trim().toUpperCase().startsWith(activeLetter));
    }
    const q = query.toLowerCase().trim();
    if (!q) return songs;
    return songs.filter((s) =>
      [s.title, s.artist, s.themeCategory, ...s.tags.map((t) => t.label)]
        .filter(Boolean)
        .some((f) => f!.toLowerCase().includes(q)),
    );
  }, [songs, query, activeLetter]);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (value) setActiveLetter(null);
  }

  function handleLetterClick(letter: string) {
    setQuery("");
    setActiveLetter((prev) => (prev === letter ? null : letter));
  }

  if (songs.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-3 py-10 text-center">
          <p className="text-muted-foreground">
            No songs yet — add your first one above, or explore with sample songs and a sample
            roster first.
          </p>
          {sampleError && <p className="text-sm text-danger">{sampleError}</p>}
          <Button
            type="button"
            variant="secondary"
            disabled={loadingSample}
            onClick={async () => {
              setLoadingSample(true);
              setSampleError(null);
              const result = await loadSampleData();
              setLoadingSample(false);
              if (!result.ok) {
                setSampleError(result.error);
                return;
              }
              router.refresh();
            }}
          >
            <Sparkles className="h-4 w-4" /> {loadingSample ? "Loading…" : "Load sample songs to explore"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search title, artist, theme, tags, scripture…"
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-1">
        {ALPHABET.map((letter) => {
          const hasMatch = availableLetters.has(letter);
          const active = activeLetter === letter;
          return (
            <button
              key={letter}
              type="button"
              disabled={!hasMatch}
              onClick={() => handleLetterClick(letter)}
              className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-medium transition-colors ${
                active
                  ? "bg-accent text-accent-foreground"
                  : hasMatch
                    ? "bg-surface-muted text-foreground hover:bg-surface-muted/70"
                    : "text-muted-foreground/30"
              }`}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {activeLetter ? `No songs start with "${activeLetter}".` : `No songs match "${query}".`}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((song) => (
            <Link key={song.id} href={`/songs/${song.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="space-y-2 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{song.title}</h3>
                    {(song.youtubeUrl || song.spotifyUrl) && (
                      <div className="flex shrink-0 items-center gap-1">
                        {song.youtubeUrl && (
                          <button
                            type="button"
                            aria-label="Open YouTube reference"
                            className="rounded-md p-1 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.open(song.youtubeUrl!, "_blank", "noopener,noreferrer");
                            }}
                          >
                            <PlayCircle className="h-4 w-4" />
                          </button>
                        )}
                        {song.spotifyUrl && (
                          <button
                            type="button"
                            aria-label="Open Spotify reference"
                            className="rounded-md p-1 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.open(song.spotifyUrl!, "_blank", "noopener,noreferrer");
                            }}
                          >
                            <Music2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {song.artist && <p className="text-xs text-muted-foreground">{song.artist}</p>}
                  <div className="flex flex-wrap gap-1.5">
                    {song.key && <Badge variant="outline">Key {song.key}</Badge>}
                    {song.bpm && <Badge variant="outline">{song.bpm} BPM</Badge>}
                    {song.themeCategory && <Badge variant="accent">{song.themeCategory}</Badge>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
