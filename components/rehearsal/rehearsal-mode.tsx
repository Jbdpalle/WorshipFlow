"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Save, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Metronome } from "@/components/metronome/metronome";
import { LyricsChordsView } from "@/components/songs/lyrics-chords-view";
import { REHEARSAL_CHECK_STATUSES } from "@/lib/songs/constants";
import { startRehearsal, saveRehearsalNotes, setRehearsalCheck } from "@/lib/actions/rehearsal";
import { cn } from "@/lib/utils/cn";

type RoleNote = { id: string; role: string; content: string };
type Section = {
  id: string;
  label: string;
  order: number;
  lyricsChords: string | null;
  roleNotes: RoleNote[];
};
type SetSongData = {
  id: string;
  order: number;
  song: {
    id: string;
    title: string;
    key: string | null;
    bpm: number | null;
    sections: Section[];
  };
};

export function RehearsalMode({ setTitle, songs }: { setTitle: string; songs: SetSongData[] }) {
  const [songIndex, setSongIndex] = useState(0);
  const setSong = songs[songIndex];

  if (!setSong) {
    return <p className="text-muted-foreground">This set has no songs yet.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {songs.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setSongIndex(i)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium tap-target",
              i === songIndex
                ? "bg-accent text-accent-foreground"
                : "bg-surface-muted text-muted-foreground",
            )}
          >
            {String(i + 1).padStart(2, "0")}. {s.song.title}
          </button>
        ))}
      </div>

      <SongRehearsalPanel key={setSong.id} setTitle={setTitle} setSong={setSong} />
    </div>
  );
}

function SongRehearsalPanel({ setTitle, setSong }: { setTitle: string; setSong: SetSongData }) {
  const song = setSong.song;
  const sections = song.sections;

  const [sectionIndex, setSectionIndex] = useState(0);
  const [rehearsalId, setRehearsalId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    startRehearsal(song.id, setSong.id, song.bpm ?? undefined)
      .then((r) => {
        if (!cancelled) setRehearsalId(r.id);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to start rehearsal tracking for this song.");
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song.id, setSong.id]);

  const current = sections[sectionIndex];
  const next = sections[sectionIndex + 1];

  const instructionsByRole = useMemo(() => {
    if (!current) return [];
    return current.roleNotes.filter((n) => n.content.trim().length > 0);
  }, [current]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{setTitle}</p>
          <h1 className="text-xl font-semibold">{song.title}</h1>
        </div>
        <div className="flex gap-1.5">
          {song.key && <Badge variant="outline">Key {song.key}</Badge>}
          {song.bpm && <Badge variant="outline">{song.bpm} BPM</Badge>}
        </div>
      </div>

      {sections.length === 0 ? (
        <p className="text-muted-foreground">
          This song has no arrangement yet.{" "}
          <Link href={`/songs/${song.id}`} className="text-accent underline">
            Add one
          </Link>
          .
        </p>
      ) : (
        <>
          <div className="rounded-2xl border-2 border-accent bg-accent/10 p-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              Current Section
            </p>
            <h2 className="mt-1 text-3xl font-bold">{current?.label}</h2>
            {next && <p className="mt-2 text-sm text-muted-foreground">Next: {next.label}</p>}
            <div className="mt-4 flex justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={sectionIndex === 0}
                onClick={() => setSectionIndex((i) => Math.max(0, i - 1))}
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={sectionIndex >= sections.length - 1}
                onClick={() => setSectionIndex((i) => Math.min(sections.length - 1, i + 1))}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {current?.lyricsChords?.trim() && (
            <div className="space-y-1 rounded-lg bg-surface-muted p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Lyrics &amp; Chords
              </h3>
              <LyricsChordsView content={current.lyricsChords} size="sm" />
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Team Instructions</h3>
            {instructionsByRole.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No specific instructions for this section.
              </p>
            ) : (
              instructionsByRole.map((n) => (
                <div key={n.id} className="rounded-lg bg-surface-muted px-3 py-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {n.role}
                  </span>
                  <p className="text-sm">{n.content}</p>
                </div>
              ))
            )}
          </div>
        </>
      )}

      <details className="rounded-lg border border-border p-3">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <Timer className="h-4 w-4" /> Metronome
        </summary>
        <div className="mt-4 flex justify-center">
          <Metronome initialBpm={song.bpm ?? 80} />
        </div>
      </details>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">Mark this rehearsal</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {REHEARSAL_CHECK_STATUSES.map((s) => (
            <Button
              key={s.value}
              variant={activeStatus === s.value ? "primary" : "outline"}
              size="sm"
              disabled={!rehearsalId}
              onClick={async () => {
                if (!rehearsalId) return;
                setError(null);
                try {
                  await setRehearsalCheck(rehearsalId, s.value);
                  setActiveStatus(s.value);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Unable to save that status.");
                }
              }}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">Record Rehearsal Notes</h3>
        <Textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setSaved(false);
          }}
          placeholder={"One note per line, e.g.\nChorus was too loud.\nBass enters too early."}
          rows={4}
        />
        <Button
          size="sm"
          disabled={!rehearsalId || !notes.trim()}
          onClick={async () => {
            if (!rehearsalId) return;
            setError(null);
            try {
              await saveRehearsalNotes(rehearsalId, notes.split("\n"));
              setNotes("");
              setSaved(true);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Unable to save those notes.");
            }
          }}
        >
          <Save className="h-4 w-4" /> Save
        </Button>
        {saved && <p className="text-xs text-success">Saved to rehearsal history.</p>}
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    </div>
  );
}
