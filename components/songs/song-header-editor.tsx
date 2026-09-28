"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ENERGY_LEVELS } from "@/lib/songs/constants";
import { updateSong } from "@/lib/actions/songs";

type SongFields = {
  title: string;
  artist: string | null;
  key: string | null;
  bpm: number | null;
  timeSignature: string | null;
  energy: string | null;
  themeCategory: string | null;
  biblicalConnection: string | null;
};

export function SongHeaderEditor({ songId, song }: { songId: string; song: SongFields }) {
  const [fields, setFields] = useState({
    title: song.title,
    artist: song.artist ?? "",
    key: song.key ?? "",
    bpm: song.bpm?.toString() ?? "",
    timeSignature: song.timeSignature ?? "4/4",
    energy: song.energy ?? "medium",
    themeCategory: song.themeCategory ?? "",
    biblicalConnection: song.biblicalConnection ?? "",
  });

  function set<K extends keyof typeof fields>(key: K, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  async function save(patch: Record<string, unknown>) {
    await updateSong(songId, patch);
  }

  return (
    <div className="space-y-4">
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
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Theme category">
          <Input
            value={fields.themeCategory}
            onChange={(e) => set("themeCategory", e.target.value)}
            onBlur={() => save({ themeCategory: fields.themeCategory })}
            placeholder="God's Love"
          />
        </Field>
        <Field label="Biblical connection">
          <Input
            value={fields.biblicalConnection}
            onChange={(e) => set("biblicalConnection", e.target.value)}
            onBlur={() => save({ biblicalConnection: fields.biblicalConnection })}
            placeholder="1 John 4:19"
          />
        </Field>
      </div>
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
