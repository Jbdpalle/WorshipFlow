"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SaveStatus, type SaveState } from "@/components/ui/save-status";
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
      themeCategory: fields.themeCategory,
      biblicalConnection: fields.biblicalConnection,
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
