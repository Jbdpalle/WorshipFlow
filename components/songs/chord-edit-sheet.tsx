"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SaveStatus, type SaveState } from "@/components/ui/save-status";
import { replaceToken } from "@/lib/songs/chord-edit";
import { callOffline } from "@/lib/offline/outbox";

export function ChordEditSheet({
  open,
  onClose,
  sectionId,
  songId,
  sectionLabel,
  initialValue,
  fullContent,
  lineIndex,
  partIndex,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  sectionId: string;
  songId: string;
  sectionLabel: string;
  initialValue: string;
  fullContent: string;
  lineIndex: number;
  partIndex: number;
  onSaved: (newContent: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [status, setStatus] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (saving) return; // guards against a double-tap firing two saves
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Enter a chord, or Cancel to leave it as it was.");
      return;
    }
    setSaving(true);
    setStatus("saving");
    setError(null);
    const newContent = replaceToken(fullContent, lineIndex, partIndex, trimmed);
    // Offline (or a network failure mid-call) queues this through the
    // outbox instead of failing — see lib/offline/outbox.ts. The sheet
    // closes immediately either way; `onSaved` already applies the new
    // content locally so the chart reflects the edit right away, synced
    // for real once there's a connection.
    const result = await callOffline("updateSectionLyrics", [sectionId, newContent], `Chord edit — ${sectionLabel}`);
    setSaving(false);
    if (!result.ok) {
      setStatus("error");
      setError(result.error);
      return; // input and sheet stay open — nothing is lost
    }
    setStatus("saved");
    onSaved(newContent);
    onClose();
  }

  void songId; // kept for context/future use (e.g. analytics); not needed for the save itself

  return (
    <Sheet open={open} onClose={onClose} title={`Edit chord — ${sectionLabel}`}>
      <div className="space-y-3">
        <label htmlFor="chord-edit-value" className="text-sm font-semibold text-muted-foreground">
          Chord
        </label>
        <Input
          id="chord-edit-value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          className="font-mono text-lg"
          placeholder="e.g. D/F#"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
        />
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex items-center gap-2">
          <Button type="button" loading={saving} disabled={saving} onClick={handleSave}>
            Save
          </Button>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <SaveStatus state={status} />
        </div>
      </div>
    </Sheet>
  );
}
