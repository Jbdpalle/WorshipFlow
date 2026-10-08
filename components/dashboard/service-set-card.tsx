import { ListMusic } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TextLink } from "@/components/ui/text-link";
import type { DashboardSet } from "@/lib/dashboard/data";

// "What are we playing?" — the next service's songs in order, with key and
// tempo as musical tags.
export function ServiceSetCard({
  set,
  isLeaderView,
}: {
  set: DashboardSet;
  isLeaderView: boolean;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex items-center justify-between gap-2 py-2">
        <CardTitle className="text-base">The set</CardTitle>
        <TextLink href={`/sets/${set.id}`}>Open set</TextLink>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {set.songs.length === 0 ? (
          <div className="flex flex-col items-start gap-2 p-4">
            <ListMusic className="h-5 w-5 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">
              No songs yet. The set is where the worship flow begins.
            </p>
            {isLeaderView && <TextLink href={`/sets/${set.id}`}>Build the setlist →</TextLink>}
          </div>
        ) : (
          <ol>
            {set.songs.map((song, i) => (
              <li
                key={song.id}
                className="flex items-center gap-3 border-t border-border px-4 py-3 first:border-t-0"
              >
                <span className="tnum w-5 shrink-0 text-sm font-semibold text-musical">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-semibold text-foreground">
                  {song.title}
                </span>
                {(song.key || song.bpm) && (
                  <Badge variant="musical" className="tnum shrink-0">
                    {[song.key, song.bpm].filter(Boolean).join(" · ")}
                  </Badge>
                )}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
