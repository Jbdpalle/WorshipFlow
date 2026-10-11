import { analyzeTheme, matchSongsToTheme } from "@/lib/songs/theme-engine";
import { CardDescription } from "@/components/ui/card";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Badge } from "@/components/ui/badge";
import { AddSongButton } from "@/components/setlist/add-song-button";
import { SongPreviewButton } from "@/components/setlist/song-preview-sheet";

type LibrarySong = {
  id: string;
  title: string;
  artist: string | null;
  key: string | null;
  bpm: number | null;
  themeCategory: string | null;
  biblicalConnection: string | null;
  tags: { label: string }[];
};

export function ThemeSuggestions({
  setId,
  theme,
  keywords,
  librarySongs,
  alreadyInSetIds,
}: {
  setId: string;
  theme: string | null;
  keywords: string | null;
  librarySongs: LibrarySong[];
  alreadyInSetIds: Set<string>;
}) {
  if (!theme && !keywords) return null;

  const analysis = analyzeTheme({
    theme: theme ?? "",
    keywords: (keywords ?? "").split(",").map((k) => k.trim()).filter(Boolean),
    verses: [],
  });

  const available = librarySongs.filter((s) => !alreadyInSetIds.has(s.id));
  const matches = matchSongsToTheme(available, analysis);

  const byCategory = new Map<string, typeof matches>();
  for (const m of matches) {
    const list = byCategory.get(m.category) ?? [];
    list.push(m);
    byCategory.set(m.category, list);
  }
  const distinctSongCount = new Set(matches.map((m) => m.song.id)).size;
  const summary = distinctSongCount > 0 ? `${distinctSongCount} song${distinctSongCount === 1 ? "" : "s"}` : "No matches";

  return (
    <CollapsibleCard title="Theme Matches" summary={summary} defaultOpen>
      <div className="space-y-4">
        <CardDescription>
          Songs from your library tagged with a matching theme — a keyword match, not a
          recommendation. Use the library search below for anything else.
        </CardDescription>

        {analysis.suggestedFlow.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Suggested flow:</span>
            {analysis.suggestedFlow.map((step, i) => (
              <span key={step} className="flex items-center gap-1.5">
                {i > 0 && <span>→</span>}
                <Badge variant="outline">{step}</Badge>
              </span>
            ))}
          </div>
        )}

        {byCategory.size === 0 ? (
          <p className="text-sm text-muted-foreground">
            No songs in your library match this theme yet. Add songs to your library and tag
            them to see suggestions here.
          </p>
        ) : (
          Array.from(byCategory.entries()).map(([category, songs]) => (
            <div key={category} className="space-y-2">
              <h3 className="text-sm font-semibold">{category}</h3>
              <div className="space-y-2">
                {songs.map(({ song }) => (
                  <div
                    key={song.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{song.title}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {[song.key && `Key ${song.key}`, song.bpm && `${song.bpm} BPM`]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <SongPreviewButton setId={setId} songId={song.id} songTitle={song.title} />
                      <AddSongButton setId={setId} songId={song.id} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </CollapsibleCard>
  );
}
