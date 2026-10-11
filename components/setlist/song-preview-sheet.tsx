"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AddSongButton } from "@/components/setlist/add-song-button";
import { getSongPreview, type SongPreview } from "@/lib/actions/songs";

// A tap-anywhere (never hover-only) quick look at a matched song's lyrics
// and chords, so a leader can judge fit without leaving the planning page
// or opening the full song editor. Sheet gives the exact presentation the
// build spec asked for: a drawer on desktop/iPad, a bottom sheet on phones
// (see components/ui/sheet.tsx's own doc comment).
export function SongPreviewButton({ setId, songId, songTitle }: { setId: string; songId: string; songTitle: string }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<SongPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Derived, not its own state — avoids a synchronous setState(true) at the
  // top of the effect below (every setState there happens inside the async
  // callback instead, once the fetch actually resolves).
  const loading = open && !preview && !error;

  useEffect(() => {
    if (!open || preview || error) return;
    let cancelled = false;
    getSongPreview(songId).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPreview(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [open, songId, preview, error]);

  const sectionsWithContent = preview?.sections.filter((s) => s.lyricsChords?.trim()) ?? [];

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={`Preview ${songTitle}`}
      >
        <Eye className="h-3.5 w-3.5" /> Preview
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={preview?.title ?? songTitle}>
        <div className="space-y-4">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {error && <p className="text-sm text-danger">{error}</p>}

          {preview && (
            <>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {preview.artist && <span>{preview.artist}</span>}
                {preview.key && <span>Key {preview.key}</span>}
                {preview.bpm && <span>{preview.bpm} BPM</span>}
              </div>

              {preview.lyricsSummary?.trim() ? (
                <p className="text-sm">{preview.lyricsSummary}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No lyric summary saved for this song yet.</p>
              )}

              {sectionsWithContent.length > 0 ? (
                <div className="space-y-3 border-t border-border pt-3">
                  {sectionsWithContent.map((section) => (
                    <div key={section.id}>
                      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {section.label}
                      </h3>
                      <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">
                        {section.lyricsChords}
                      </pre>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="border-t border-border pt-3 text-sm text-muted-foreground">
                  No chords or lyrics saved for these sections yet.
                </p>
              )}

              <div className="border-t border-border pt-4">
                <AddSongButton setId={setId} songId={preview.id} />
              </div>
            </>
          )}
        </div>
      </Sheet>
    </>
  );
}
