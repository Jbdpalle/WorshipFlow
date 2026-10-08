import { FileText } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LyricsChordsView } from "@/components/songs/lyrics-chords-view";

type Section = {
  id: string;
  label: string;
  repeatCount: number | null;
  lyricsChords: string | null;
};

// Song Flow breaks a song into sections on purpose — that's what makes
// per-section direction-giving possible — but reading the whole song as
// one continuous piece is still a real need. This is lyrics only (no
// chords, no transpose/size controls): that fuller, stand-ready chart
// already lives at /songs/[id]/chart for whoever's playing.
export function FullLyricsView({ songId, sections }: { songId: string; sections: Section[] }) {
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
      <div className="flex justify-end">
        <ButtonLink href={`/songs/${songId}/chart`} variant="outline">
          Need chords? Open chart
        </ButtonLink>
      </div>
      {sectionsWithLyrics.map((section) => (
        <div key={section.id}>
          <h2 className="mb-1 label-caps">
            {section.label}
            {section.repeatCount && section.repeatCount > 1 ? ` ×${section.repeatCount}` : ""}
          </h2>
          <LyricsChordsView content={section.lyricsChords!} mode="lyrics" />
        </div>
      ))}
    </div>
  );
}
