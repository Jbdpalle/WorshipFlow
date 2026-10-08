"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Library, Music2, PlayCircle, Search, SearchX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadSampleDataButton } from "@/components/songs/load-sample-data-button";
import { cn } from "@/lib/utils/cn";

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

// The library as a binder index: find a song by search, key, theme or first
// letter, then read one scannable row per song (title, artist, key, tempo,
// theme). The whole row opens the song; reference links sit on top of it.
export function SongLibraryList({ songs }: { songs: LibrarySong[] }) {
  const [query, setQuery] = useState("");
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [keyFilter, setKeyFilter] = useState("");
  const [themeFilter, setThemeFilter] = useState("");

  const availableLetters = useMemo(() => {
    const set = new Set<string>();
    for (const s of songs) {
      const first = s.title.trim()[0]?.toUpperCase();
      if (first && ALPHABET.includes(first)) set.add(first);
    }
    return set;
  }, [songs]);

  const keys = useMemo(
    () => [...new Set(songs.map((s) => s.key).filter((k): k is string => !!k))].sort(),
    [songs],
  );
  const themes = useMemo(
    () => [...new Set(songs.map((s) => s.themeCategory).filter((t): t is string => !!t))].sort(),
    [songs],
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return songs.filter((s) => {
      if (activeLetter && !s.title.trim().toUpperCase().startsWith(activeLetter)) return false;
      if (keyFilter && s.key !== keyFilter) return false;
      if (themeFilter && s.themeCategory !== themeFilter) return false;
      if (!q || activeLetter) return true;
      return [s.title, s.artist, s.themeCategory, ...s.tags.map((t) => t.label)]
        .filter(Boolean)
        .some((f) => f!.toLowerCase().includes(q));
    });
  }, [songs, query, activeLetter, keyFilter, themeFilter]);

  const filtering = !!(query || activeLetter || keyFilter || themeFilter);

  function clearFilters() {
    setQuery("");
    setActiveLetter(null);
    setKeyFilter("");
    setThemeFilter("");
  }

  if (songs.length === 0) {
    return (
      <EmptyState
        icon={Library}
        title="Your song library is empty"
        description="Songs are the heart of every set. Add your first song, import from a PDF, or explore with sample songs and a sample roster first."
        action={<LoadSampleDataButton redirectToSets={false} />}
        className="py-14"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 basis-64 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            aria-label="Search songs"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value) setActiveLetter(null);
            }}
            placeholder="Search title, artist, theme, tags…"
            className="pl-9"
          />
        </div>
        {keys.length > 0 && (
          <Select
            aria-label="Filter by key"
            value={keyFilter}
            onChange={(e) => setKeyFilter(e.target.value)}
            className="w-32"
          >
            <option value="">All keys</option>
            {keys.map((k) => (
              <option key={k} value={k}>
                Key {k}
              </option>
            ))}
          </Select>
        )}
        {themes.length > 0 && (
          <Select
            aria-label="Filter by theme"
            value={themeFilter}
            onChange={(e) => setThemeFilter(e.target.value)}
            className="w-44"
          >
            <option value="">All themes</option>
            {themes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        )}
        {filtering && (
          <Button type="button" variant="ghost" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      <nav aria-label="Jump to letter" className="-mx-1 overflow-x-auto px-1 pb-1">
        <ul className="flex w-max gap-1 lg:w-auto lg:flex-wrap">
          {ALPHABET.map((letter) => {
            const hasMatch = availableLetters.has(letter);
            const active = activeLetter === letter;
            return (
              <li key={letter}>
                <button
                  type="button"
                  disabled={!hasMatch}
                  aria-pressed={active}
                  aria-label={`Songs starting with ${letter}`}
                  onClick={() => {
                    setQuery("");
                    setActiveLetter((prev) => (prev === letter ? null : letter));
                  }}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-md text-sm font-semibold transition-colors duration-[var(--duration-fast)]",
                    active
                      ? "bg-primary text-primary-foreground"
                      : hasMatch
                        ? "bg-surface-muted text-foreground hover:bg-border"
                        : "text-muted-foreground opacity-50",
                  )}
                >
                  {letter}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <p role="status" className="tnum text-sm text-muted-foreground">
        {filtering
          ? `${filtered.length} of ${songs.length} songs`
          : `${songs.length} ${songs.length === 1 ? "song" : "songs"}, A to Z`}
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No songs match"
          description={
            activeLetter
              ? `No songs start with "${activeLetter}" with the current filters.`
              : "Try a different search, or clear the filters to see every song."
          }
          action={
            <Button variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {filtered.map((song) => (
            <li
              key={song.id}
              className="relative flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 transition-colors duration-[var(--duration-fast)] hover:bg-surface-muted"
            >
              <div className="min-w-0 flex-1 basis-56">
                <h2 className="truncate text-base font-bold">
                  <Link
                    href={`/songs/${song.id}`}
                    className="inline-flex min-h-11 max-w-full items-center truncate after:absolute after:inset-0 focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring"
                  >
                    {song.title}
                  </Link>
                </h2>
                {song.artist && <p className="truncate text-sm text-muted-foreground">{song.artist}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {song.key && (
                  <Badge variant="musical" className="tnum">
                    Key {song.key}
                  </Badge>
                )}
                {song.bpm && (
                  <Badge variant="musical" className="tnum">
                    {song.bpm} BPM
                  </Badge>
                )}
                {song.themeCategory && <Badge variant="outline">{song.themeCategory}</Badge>}
              </div>
              {(song.youtubeUrl || song.spotifyUrl) && (
                <div className="relative z-10 flex items-center">
                  {song.youtubeUrl && (
                    <a
                      href={song.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open YouTube reference for ${song.title}`}
                      className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface hover:text-foreground"
                    >
                      <PlayCircle className="h-5 w-5" aria-hidden />
                    </a>
                  )}
                  {song.spotifyUrl && (
                    <a
                      href={song.spotifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open Spotify reference for ${song.title}`}
                      className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface hover:text-foreground"
                    >
                      <Music2 className="h-5 w-5" aria-hidden />
                    </a>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
