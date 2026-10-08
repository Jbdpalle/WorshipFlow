"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { generatePrepareMeSummary } from "@/lib/actions/prepare";

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
  const changed = assignments
    .map((a) => ({
      id: a.id,
      songId: a.setSong.song.id,
      title: a.setSong.song.title,
      fields: a.setSong.song.changeLogs.map((c) => c.field),
    }))
    .filter((c) => c.fields.length > 0);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Get ready: {setTitle}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {setDate
              ? new Date(setDate).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
              : "No date set"}{" "}
            · Everything {memberName} needs before this one.
          </p>
        </div>
        <Link href={`/rehearsal/${setId}`}>
          <Button>
            Rehearse
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {changed.length > 0 ? (
          <div>
            <p className="label-caps">What changed since last time</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {changed.map((c) => (
                <li key={c.id} className="flex flex-wrap items-baseline gap-x-2">
                  <Link href={`/songs/${c.songId}`} className="font-semibold text-foreground hover:underline">
                    {c.title}
                  </Link>
                  <span className="text-muted-foreground">{c.fields.join(", ")}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nothing has changed in your songs recently.</p>
        )}

        <div className="space-y-2 border-t border-border pt-3">
          {summary ? (
            <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm">{summary}</p>
          ) : (
            <Button
              type="button"
              variant="outline"
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
