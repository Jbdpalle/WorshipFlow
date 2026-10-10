"use client";

import { useState } from "react";
import { isChordLine } from "@/lib/songs/chord-line";
import { transposeLineToNashville } from "@/lib/songs/nashville-numbers";
import { getSemitoneShift, transposeLine } from "@/lib/songs/transpose";
import { isChordTapEditable, splitPreservingWhitespace } from "@/lib/songs/chord-edit";
import { ChordEditSheet } from "@/components/songs/chord-edit-sheet";
import { cn } from "@/lib/utils/cn";

export type LyricsChordsMode = "all" | "lyrics" | "chords" | "numbers";

type EditTarget = { lineIndex: number; partIndex: number; value: string } | null;

export function LyricsChordsView({
  content,
  size = "md",
  mode = "all",
  songKey,
  transposeToKey,
  editable,
  songId,
  sectionId,
  sectionLabel,
}: {
  content: string;
  size?: "sm" | "md" | "lg" | "xl";
  mode?: LyricsChordsMode;
  songKey?: string | null;
  // A different key to display chords in than the song's own key — e.g. a
  // set that needs this song a step lower. Numbers mode is unaffected: a
  // Nashville number is the same number in every key, so there's nothing
  // to transpose there.
  transposeToKey?: string | null;
  // Tap-to-edit a chord in place. Only offered when the caller has already
  // confirmed the viewer is a leader AND the view isn't showing a
  // transposed/derived display (editing always writes to the canonical,
  // untransposed text — see ChordEditSheet/replaceToken) — this prop alone
  // doesn't skip either check, the caller computes `editable` accordingly.
  editable?: boolean;
  songId?: string;
  sectionId?: string;
  sectionLabel?: string;
}) {
  // Local, render-time-synced copy of the canonical text — same pattern
  // used elsewhere in this codebase (ArrangementEditor's sections,
  // RoleNoteRow's content) for "stay in sync with a fresh server prop,
  // but let a just-saved local edit show immediately without waiting for
  // a round trip." A save here updates this directly; a genuinely new
  // `content` prop (e.g. after navigating back to this song) resyncs it.
  const [liveContent, setLiveContent] = useState(content);
  const [syncedContent, setSyncedContent] = useState(content);
  if (content !== syncedContent) {
    setSyncedContent(content);
    setLiveContent(content);
  }
  const [editTarget, setEditTarget] = useState<EditTarget>(null);

  const allLines = liveContent.split("\n");
  const shift =
    songKey && transposeToKey && transposeToKey !== songKey ? getSemitoneShift(songKey, transposeToKey) : null;
  // Editing always targets the canonical, untransposed text — so it's only
  // offered when nothing here is actually being transformed for display.
  const tappable = isChordTapEditable({ editable: !!editable, hasSectionId: !!sectionId, mode, shift });

  const visibleIndices = allLines
    .map((_, i) => i)
    .filter((i) => {
      const line = allLines[i];
      if (mode === "lyrics") return !isChordLine(line);
      if (mode === "chords" || mode === "numbers") return isChordLine(line) || !line.trim();
      return true;
    });

  const sizeClass = { sm: "text-sm", md: "text-base", lg: "text-xl", xl: "text-2xl" }[size];

  function displayFor(line: string): string {
    if (mode === "numbers" && songKey) return transposeLineToNashville(line, songKey);
    if (shift) return transposeLine(line, shift, transposeToKey!);
    return line;
  }

  return (
    <div className={cn("font-mono leading-relaxed whitespace-pre-wrap", sizeClass)}>
      {visibleIndices.map((lineIndex) => {
        const original = allLines[lineIndex];
        const isChord = isChordLine(original);
        const display = displayFor(original);
        if (!isChord) {
          return (
            <div key={lineIndex} className="text-foreground">
              {display || " "}
            </div>
          );
        }
        return (
          <div key={lineIndex} className="font-bold text-musical">
            {tappable ? (
              <ChordLineTokens
                text={original}
                onTapToken={(partIndex, value) => setEditTarget({ lineIndex, partIndex, value })}
              />
            ) : (
              display || " "
            )}
          </div>
        );
      })}

      {sectionId && songId && (
        <ChordEditSheet
          key={editTarget ? `${editTarget.lineIndex}-${editTarget.partIndex}` : "closed"}
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          sectionId={sectionId}
          songId={songId}
          sectionLabel={sectionLabel ?? ""}
          initialValue={editTarget?.value ?? ""}
          fullContent={liveContent}
          lineIndex={editTarget?.lineIndex ?? 0}
          partIndex={editTarget?.partIndex ?? 0}
          onSaved={(newContent) => {
            setLiveContent(newContent);
            setSyncedContent(newContent);
          }}
        />
      )}
    </div>
  );
}

// Splits a chord line into whitespace-preserving parts and renders each
// non-whitespace token as its own tap target — whitespace parts render as
// plain text so the monospace column alignment with the lyric line below
// never shifts. The hit area is widened with padding offset by an equal
// negative margin, so the glyph position (and therefore the alignment)
// doesn't move even though the tappable area is bigger than the character.
function ChordLineTokens({ text, onTapToken }: { text: string; onTapToken: (partIndex: number, value: string) => void }) {
  const parts = splitPreservingWhitespace(text);
  return (
    <>
      {parts.map((part, i) =>
        part === "" || /^\s+$/.test(part) ? (
          <span key={i}>{part}</span>
        ) : (
          <button
            key={i}
            type="button"
            onClick={() => onTapToken(i, part)}
            className="-mx-0.5 -my-0.5 rounded px-0.5 py-0.5 transition-colors hover:bg-musical-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-musical-soft"
            aria-label={`Edit chord ${part}`}
          >
            {part}
          </button>
        ),
      )}
    </>
  );
}
