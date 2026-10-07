"use client";

import { useState } from "react";
import { Save, PlayCircle, Music2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SaveStatus, type SaveState } from "@/components/ui/save-status";
import { MediaLinkField } from "@/components/ui/media-link-field";
import { ThemeCategoryPicker } from "@/components/songs/theme-category-picker";
import { ENERGY_LEVELS, WORSHIP_TYPES } from "@/lib/songs/constants";
import { updateSong } from "@/lib/actions/songs";

type SongFields = {
  title: string;
  artist: string | null;
  key: string | null;
  bpm: number | null;
  timeSignature: string | null;
  energy: string | null;
  worshipType: string | null;
  biblicalConnection: string | null;
  youtubeUrl: string | null;
  spotifyUrl: string | null;
};

export function SongHeaderEditor({
  songId,
  song,
  themeCategories,
}: {
  songId: string;
  song: SongFields;
  themeCategories: string[];
}) {
  const [fields, setFields] = useState({
    title: song.title,
    artist: song.artist ?? "",
    key: song.key ?? "",
    bpm: song.bpm?.toString() ?? "",
    timeSignature: song.timeSignature ?? "4/4",
    energy: song.energy ?? "medium",
    worshipType: song.worshipType ?? "",
    biblicalConnection: song.biblicalConnection ?? "",
    youtubeUrl: song.youtubeUrl ?? "",
    spotifyUrl: song.spotifyUrl ?? "",
  });

  const [status, setStatus] = useState<SaveState>("idle");

  function set<K extends keyof typeof fields>(key: K, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  async function save(patch: Record<string, unknown>) {
    setStatus("saving");
    const result = await updateSong(songId, patch);
    setStatus(result.ok ? "saved" : "error");
    if (result.ok) setTimeout(() => setStatus("idle"), 1800);
  }

  function saveAll() {
    save({
      title: fields.title,
      artist: fields.artist,
      key: fields.key,
      bpm: fields.bpm ? Number(fields.bpm) : null,
      timeSignature: fields.timeSignature,
      energy: fields.energy,
      worshipType: fields.worshipType,
      biblicalConnection: fields.biblicalConnection,
      youtubeUrl: fields.youtubeUrl,
      spotifyUrl: fields.spotifyUrl,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Fields save as you tab away — use Save if you&apos;re not sure it caught your last edit.
        </p>
        <div className="flex items-center gap-2">
          <SaveStatus state={status} />
          <Button type="button" variant="secondary" size="sm" onClick={saveAll}>
            <Save className="h-3.5 w-3.5" /> Save
          </Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title">
          <Input
            value={fields.title}
            onChange={(e) => set("title", e.target.value)}
            onBlur={() => save({ title: fields.title })}
          />
        </Field>
        <Field label="Artist">
          <Input
            value={fields.artist}
            onChange={(e) => set("artist", e.target.value)}
            onBlur={() => save({ artist: fields.artist })}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Key">
          <Input
            value={fields.key}
            onChange={(e) => set("key", e.target.value)}
            onBlur={() => save({ key: fields.key })}
            placeholder="G"
          />
        </Field>
        <Field label="BPM">
          <Input
            type="number"
            value={fields.bpm}
            onChange={(e) => set("bpm", e.target.value)}
            onBlur={() => save({ bpm: fields.bpm ? Number(fields.bpm) : null })}
            placeholder="72"
          />
        </Field>
        <Field label="Time Sig.">
          <Input
            value={fields.timeSignature}
            onChange={(e) => set("timeSignature", e.target.value)}
            onBlur={() => save({ timeSignature: fields.timeSignature })}
          />
        </Field>
        <Field label="Energy">
          <Select
            value={fields.energy}
            onChange={(e) => {
              set("energy", e.target.value);
              save({ energy: e.target.value });
            }}
          >
            {ENERGY_LEVELS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <ThemeCategoryPicker songId={songId} initialLabels={themeCategories} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Biblical connection">
          <Input
            value={fields.biblicalConnection}
            onChange={(e) => set("biblicalConnection", e.target.value)}
            onBlur={() => save({ biblicalConnection: fields.biblicalConnection })}
            placeholder="1 John 4:19"
          />
        </Field>
        <Field label="Praise / Worship type">
          <Select
            value={fields.worshipType}
            onChange={(e) => {
              set("worshipType", e.target.value);
              save({ worshipType: e.target.value });
            }}
          >
            <option value="">Not set</option>
            {WORSHIP_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <MediaLinkField
          id="song-youtube-url"
          label="YouTube link"
          icon={<PlayCircle className="h-3.5 w-3.5" />}
          value={fields.youtubeUrl}
          onChange={(v) => set("youtubeUrl", v)}
          onBlur={() => save({ youtubeUrl: fields.youtubeUrl })}
          placeholder="https://youtube.com/watch?v=..."
        />
        <MediaLinkField
          id="song-spotify-url"
          label="Spotify link"
          icon={<Music2 className="h-3.5 w-3.5" />}
          value={fields.spotifyUrl}
          onChange={(v) => set("spotifyUrl", v)}
          onBlur={() => save({ spotifyUrl: fields.spotifyUrl })}
          placeholder="https://open.spotify.com/track/..."
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Share the exact version you want the team to listen to — this plays no audio itself, it just links out.
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
