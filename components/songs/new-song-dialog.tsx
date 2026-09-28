"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ENERGY_LEVELS } from "@/lib/songs/constants";
import { createSong } from "@/lib/actions/songs";

export function NewSongDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    artist: "",
    key: "",
    bpm: "",
    energy: "medium",
    themeCategory: "",
  });
  const [error, setError] = useState<string | null>(null);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    setError(null);
    const result = await createSong({
      title: form.title,
      artist: form.artist,
      key: form.key,
      bpm: form.bpm ? Number(form.bpm) : undefined,
      energy: form.energy,
      themeCategory: form.themeCategory,
    });
    if (!result.ok) {
      setError(result.error);
      setSaving(false);
      return;
    }
    setOpen(false);
    router.push(`/songs/${result.data.id}`);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add Song
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Add a song to your library">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="s-title">Title *</Label>
            <Input id="s-title" required value={form.title} onChange={update("title")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="s-artist">Artist</Label>
            <Input id="s-artist" value={form.artist} onChange={update("artist")} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label htmlFor="s-key">Key</Label>
              <Input id="s-key" value={form.key} onChange={update("key")} placeholder="G" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="s-bpm">BPM</Label>
              <Input id="s-bpm" type="number" value={form.bpm} onChange={update("bpm")} placeholder="72" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="s-energy">Energy</Label>
              <Select id="s-energy" value={form.energy} onChange={update("energy")}>
                {ENERGY_LEVELS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="s-theme">Theme category</Label>
            <Input
              id="s-theme"
              value={form.themeCategory}
              onChange={update("themeCategory")}
              placeholder="God's Love"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Adding…" : "Add to library"}
          </Button>
        </form>
      </Dialog>
    </>
  );
}
