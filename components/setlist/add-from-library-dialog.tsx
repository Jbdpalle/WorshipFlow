"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddSongButton } from "@/components/setlist/add-song-button";
import { createSong } from "@/lib/actions/songs";
import { addSongToSet } from "@/lib/actions/sets";

type LibrarySong = {
  id: string;
  title: string;
  artist: string | null;
  key: string | null;
  bpm: number | null;
};

export function AddFromLibraryDialog({
  setId,
  librarySongs,
}: {
  setId: string;
  librarySongs: LibrarySong[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return librarySongs;
    return librarySongs.filter(
      (s) => s.title.toLowerCase().includes(q) || s.artist?.toLowerCase().includes(q),
    );
  }, [librarySongs, query]);

  async function handleQuickCreate() {
    if (!newTitle.trim()) return;
    setCreating(true);
    setError(null);
    const created = await createSong({ title: newTitle.trim() });
    if (!created.ok) {
      setError(created.error);
      setCreating(false);
      return;
    }
    const added = await addSongToSet(setId, created.data.id);
    if (!added.ok) {
      setError(added.error);
      setCreating(false);
      return;
    }
    setNewTitle("");
    router.refresh();
    setCreating(false);
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add Song
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Add a song to the set">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your library…"
              className="pl-9"
            />
          </div>

          <div className="max-h-64 space-y-2 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No matching songs.
              </p>
            )}
            {filtered.map((song) => (
              <div
                key={song.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-surface-muted px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{song.title}</div>
                  {song.artist && (
                    <div className="truncate text-xs text-muted-foreground">{song.artist}</div>
                  )}
                </div>
                <AddSongButton setId={setId} songId={song.id} />
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <Label htmlFor="quick-create">Or add a new song manually</Label>
            <div className="flex gap-2">
              <Input
                id="quick-create"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Song title"
              />
              <Button type="button" onClick={handleQuickCreate} disabled={creating}>
                {creating ? "Adding…" : "Add"}
              </Button>
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
          </div>
        </div>
      </Dialog>
    </>
  );
}
