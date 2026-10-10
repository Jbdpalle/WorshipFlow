"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { LyricsChordsView, type LyricsChordsMode } from "@/components/songs/lyrics-chords-view";

type Section = {
  id: string;
  label: string;
  repeatCount: number | null;
  lyricsChords: string | null;
};

// Song Flow breaks a song into sections on purpose — that's what makes
// per-section direction-giving possible — but reading the whole song
// straight through, with or without chords, is still a real need. This
// stays simple on purpose: a Lyrics/Chords toggle, no transpose or text
// size — that fuller, stand-ready chart lives at /songs/[id]/chart.
export function FullLyricsView({
  songId,
  sections,
  isLeader,
}: {
  songId: string;
  sections: Section[];
  isLeader: boolean;
}) {
  const [mode, setMode] = useState<LyricsChordsMode>("lyrics");
  const sectionsWithLyrics = sections.filter((s) => s.lyricsChords?.trim());

  if (sectionsWithLyrics.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No lyrics yet"
        description="Add lyrics to a section in Song Flow, or import a chord-chart PDF from the Songs library."
        action={<ButtonLink href={`/songs/${songId}/chart`} variant="outline">Open chart</ButtonLink>}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          label="Show"
          value={mode as "lyrics" | "all"}
          onChange={setMode}
          options={[
            { value: "lyrics", label: "Lyrics" },
            { value: "all", label: "Lyrics + Chords" },
          ]}
        />
        <ButtonLink href={`/songs/${songId}/chart`} variant="outline">
          Transpose or resize? Open chart
        </ButtonLink>
      </div>
      {sectionsWithLyrics.map((section) => (
        <div key={section.id}>
          <h2 className="mb-1 label-caps">
            {section.label}
            {section.repeatCount && section.repeatCount > 1 ? ` ×${section.repeatCount}` : ""}
          </h2>
          <LyricsChordsView
            content={section.lyricsChords!}
            mode={mode}
            editable={isLeader}
            songId={songId}
            sectionId={section.id}
            sectionLabel={section.label}
          />
        </div>
      ))}
    </div>
  );
}
