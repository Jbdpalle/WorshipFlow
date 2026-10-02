"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { generatePrepareMeSummary } from "@/lib/actions/prepare";
import { selectRoleNoteForViewer } from "@/lib/songs/role-notes";

type ChangeEntry = { id: string; field: string; fromValue: string | null; toValue: string | null };
type RoleNote = {
  id: string;
  role: string;
  content: string;
  teamMemberId: string | null;
  visibility: "TEAM" | "ROLE" | "PERSON";
};
type Section = { id: string; label: string; roleNotes: RoleNote[] };
type PrepareAssignment = {
  id: string;
  role: string;
  setSong: {
    song: {
      id: string;
      title: string;
      key: string | null;
      bpm: number | null;
      sections: Section[];
      changeLogs: ChangeEntry[];
    };
  };
};

export function PrepareMeCard({
  memberId,
  memberName,
  setId,
  setTitle,
  setDate,
  assignments,
}: {
  memberId: string;
  memberName: string;
  setId: string;
  setTitle: string;
  setDate: Date | null;
  assignments: PrepareAssignment[];
}) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="border-accent/30 bg-accent/5">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Prepare Me — {setTitle}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {setDate
              ? new Date(setDate).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
              : "No date set"}{" "}
            · Everything {memberName} needs before this one.
          </p>
        </div>
        <Link href={`/rehearsal/${setId}`}>
          <Button size="sm" variant="secondary">
            Rehearse
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {assignments.map((a) => {
          const song = a.setSong.song;
          const notes = song.sections
            .map((s) => {
              // Same priority rule as My Part's main list: a note aimed at
              // this specific person wins over a shared one, and is never
              // shown to someone else who merely shares the same role.
              const note = selectRoleNoteForViewer(s.roleNotes, a.role, memberId);
              return note ? { label: s.label, content: note.content } : null;
            })
            .filter((n): n is { label: string; content: string } => n !== null);

          return (
            <div key={a.id} className="rounded-lg bg-surface p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/songs/${song.id}`} className="font-medium hover:text-accent">
                  {song.title}
                </Link>
                <div className="flex gap-1.5">
                  <Badge variant="accent">{a.role}</Badge>
                  {song.key && <Badge variant="outline">Key {song.key}</Badge>}
                  {song.bpm && <Badge variant="outline">{song.bpm} BPM</Badge>}
                </div>
              </div>
              {notes.length > 0 ? (
                <ul className="mt-1.5 space-y-0.5 text-sm text-muted-foreground">
                  {notes.map((n, i) => (
                    <li key={i}>
                      <span className="font-medium text-foreground">{n.label}:</span> {n.content}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-sm text-muted-foreground">Play it as written.</p>
              )}
              {song.changeLogs.length > 0 && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Changed recently: {song.changeLogs.map((c) => c.field).join(", ")}
                </p>
              )}
            </div>
          );
        })}

        <div className="space-y-2 border-t border-border pt-3">
          {summary ? (
            <p className="rounded-lg bg-surface px-3 py-2 text-sm">{summary}</p>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                setError(null);
                const result = await generatePrepareMeSummary(memberId, setId);
                if (result.ok) {
                  setSummary(result.summary);
                } else {
                  setError(result.error);
                }
                setLoading(false);
              }}
            >
              <Sparkles className="h-3.5 w-3.5" /> {loading ? "Generating…" : "AI Summary"}
            </Button>
          )}
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
