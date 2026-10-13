"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  listTeamSongsForReuse,
  getSongSectionsForReuse,
  copyRoleNotesAcrossSections,
  listDirectionPatterns,
  getDirectionPattern,
  saveDirectionPattern,
  deleteDirectionPattern,
  applyDirectionPatternItems,
  type DirectionPatternItemInput,
} from "@/lib/actions/songs";

type Mode = "copy-song" | "apply-pattern" | "save-pattern";

type SectionOption = { id: string; label: string };

export function ReuseDirectionsDialog({
  open,
  onClose,
  songId,
  currentSectionId,
  currentSectionLabel,
  sections,
  onApplied,
}: {
  open: boolean;
  onClose: () => void;
  songId: string;
  currentSectionId: string;
  currentSectionLabel: string;
  sections: SectionOption[];
  onApplied: () => void;
}) {
  const [mode, setMode] = useState<Mode>("copy-song");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  // Reset per-open so a previous run's result/error doesn't linger.
  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setError(null);
      setResult(null);
    });
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} title="Reuse directions" className="max-w-xl">
      <div role="tablist" aria-label="Reuse mode" className="mb-4 flex gap-1 rounded-lg bg-surface-muted p-1">
        {(
          [
            ["copy-song", "From another song"],
            ["apply-pattern", "Apply a pattern"],
            ["save-pattern", "Save as a pattern"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={mode === key}
            onClick={() => {
              setMode(key);
              setError(null);
              setResult(null);
            }}
            className={`tap-target flex-1 rounded-md px-2 text-sm font-semibold ${
              mode === key ? "bg-surface-elevated shadow-sm" : "text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mb-3 text-sm text-danger">
          {error}
        </p>
      )}
      {result && (
        <p role="status" className="mb-3 text-sm font-semibold text-success">
          {result}
        </p>
      )}

      {mode === "copy-song" && (
        <CopyFromSongPanel
          songId={songId}
          sections={sections}
          currentSectionId={currentSectionId}
          setError={setError}
          setResult={setResult}
          onApplied={onApplied}
        />
      )}
      {mode === "apply-pattern" && (
        <ApplyPatternPanel
          songId={songId}
          sections={sections}
          currentSectionId={currentSectionId}
          setError={setError}
          setResult={setResult}
          onApplied={onApplied}
        />
      )}
      {mode === "save-pattern" && (
        <SavePatternPanel
          sectionId={currentSectionId}
          sectionLabel={currentSectionLabel}
          setError={setError}
          setResult={setResult}
        />
      )}
    </Dialog>
  );
}

function SectionTargetPicker({
  sections,
  defaultSectionId,
  selected,
  onChange,
}: {
  sections: SectionOption[];
  defaultSectionId: string;
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  return (
    <div>
      <p className="label-caps mb-1">Apply to</p>
      <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
        {sections.map((s) => (
          <label key={s.id} className="flex items-center gap-2 py-1 text-sm">
            <Checkbox
              checked={selected.has(s.id)}
              onChange={(e) => {
                const next = new Set(selected);
                if (e.target.checked) next.add(s.id);
                else next.delete(s.id);
                onChange(next);
              }}
            />
            {s.label}
            {s.id === defaultSectionId && <span className="text-xs text-muted-foreground">(current)</span>}
          </label>
        ))}
      </div>
    </div>
  );
}

function CopyFromSongPanel({
  songId,
  sections,
  currentSectionId,
  setError,
  setResult,
  onApplied,
}: {
  songId: string;
  sections: SectionOption[];
  currentSectionId: string;
  setError: (e: string | null) => void;
  setResult: (r: string | null) => void;
  onApplied: () => void;
}) {
  const [songs, setSongs] = useState<{ id: string; title: string }[] | null>(null);
  const [sourceSongId, setSourceSongId] = useState("");
  const [sourceSections, setSourceSections] = useState<
    { id: string; label: string; roleNotes: { role: string; content: string }[] }[] | null
  >(null);
  const [sourceSectionId, setSourceSectionId] = useState("");
  const [targets, setTargets] = useState<Set<string>>(new Set([currentSectionId]));
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    listTeamSongsForReuse().then((r) => {
      if (r.ok) setSongs(r.data.filter((s) => s.id !== songId));
    });
  }, [songId]);

  useEffect(() => {
    if (!sourceSongId) {
      queueMicrotask(() => setSourceSections(null));
      return;
    }
    getSongSectionsForReuse(sourceSongId).then((r) => {
      if (r.ok) {
        setSourceSections(r.data);
        setSourceSectionId(r.data[0]?.id ?? "");
      } else {
        setError(r.error);
      }
    });
  }, [sourceSongId, setError]);

  const sourceSection = sourceSections?.find((s) => s.id === sourceSectionId);

  return (
    <div className="space-y-3">
      <div>
        <p className="label-caps mb-1">Source song</p>
        <Select value={sourceSongId} onChange={(e) => setSourceSongId(e.target.value)}>
          <option value="">Choose a song…</option>
          {songs?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </Select>
      </div>

      {sourceSections && sourceSections.length > 0 && (
        <div>
          <p className="label-caps mb-1">Source section</p>
          <Select value={sourceSectionId} onChange={(e) => setSourceSectionId(e.target.value)}>
            {sourceSections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} ({s.roleNotes.length} direction{s.roleNotes.length === 1 ? "" : "s"})
              </option>
            ))}
          </Select>
        </div>
      )}

      {sourceSection && sourceSection.roleNotes.length > 0 && (
        <div>
          <p className="label-caps mb-1">Preview</p>
          <div className="space-y-1 rounded-lg bg-surface-muted p-2">
            {sourceSection.roleNotes.map((n, i) => (
              <p key={i} className="text-sm">
                <span className="font-semibold">{n.role}:</span> {n.content}
              </p>
            ))}
          </div>
        </div>
      )}

      <SectionTargetPicker
        sections={sections}
        defaultSectionId={currentSectionId}
        selected={targets}
        onChange={setTargets}
      />

      <Button
        type="button"
        loading={applying}
        disabled={applying || !sourceSectionId || targets.size === 0}
        onClick={async () => {
          setApplying(true);
          setError(null);
          const r = await copyRoleNotesAcrossSections(sourceSectionId, Array.from(targets), songId);
          setApplying(false);
          if (!r.ok) {
            setError(r.error);
            return;
          }
          setResult(`Copied ${r.data.copied}, skipped ${r.data.skipped} (already had a direction for that role).`);
          onApplied();
        }}
      >
        Copy directions
      </Button>
    </div>
  );
}

function ApplyPatternPanel({
  songId,
  sections,
  currentSectionId,
  setError,
  setResult,
  onApplied,
}: {
  songId: string;
  sections: SectionOption[];
  currentSectionId: string;
  setError: (e: string | null) => void;
  setResult: (r: string | null) => void;
  onApplied: () => void;
}) {
  const [patterns, setPatterns] = useState<{ id: string; name: string; itemCount: number }[] | null>(null);
  const [patternId, setPatternId] = useState("");
  const [items, setItems] = useState<DirectionPatternItemInput[]>([]);
  const [targets, setTargets] = useState<Set<string>>(new Set([currentSectionId]));
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    listDirectionPatterns().then((r) => {
      if (r.ok) setPatterns(r.data);
    });
  }, []);

  useEffect(() => {
    if (!patternId) {
      queueMicrotask(() => setItems([]));
      return;
    }
    getDirectionPattern(patternId).then((r) => {
      if (r.ok) setItems(r.data.items);
      else setError(r.error);
    });
  }, [patternId, setError]);

  if (patterns?.length === 0) {
    return <p className="text-sm text-muted-foreground">No saved patterns yet — save one from a section&apos;s directions first.</p>;
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="label-caps mb-1">Pattern</p>
        <Select value={patternId} onChange={(e) => setPatternId(e.target.value)}>
          <option value="">Choose a pattern…</option>
          {patterns?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.itemCount})
            </option>
          ))}
        </Select>
      </div>

      {items.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="label-caps">Preview — edit before applying</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={async () => {
                if (!patternId) return;
                const r = await deleteDirectionPattern(patternId);
                if (r.ok) {
                  setPatterns((prev) => prev?.filter((p) => p.id !== patternId) ?? null);
                  setPatternId("");
                  setItems([]);
                } else {
                  setError(r.error);
                }
              }}
            >
              Delete pattern
            </Button>
          </div>
          {items.map((item, i) => (
            <div key={i} className="flex gap-2 rounded-lg bg-surface-muted p-2">
              <span className="w-28 shrink-0 self-center text-xs font-semibold text-muted-foreground">
                {item.role}
              </span>
              <Textarea
                value={item.content}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...item, content: e.target.value };
                  setItems(next);
                }}
                rows={1}
                className="flex-1 text-sm"
              />
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <SectionTargetPicker
          sections={sections}
          defaultSectionId={currentSectionId}
          selected={targets}
          onChange={setTargets}
        />
      )}

      <Button
        type="button"
        loading={applying}
        disabled={applying || items.length === 0 || targets.size === 0}
        onClick={async () => {
          setApplying(true);
          setError(null);
          const r = await applyDirectionPatternItems(items, Array.from(targets), songId);
          setApplying(false);
          if (!r.ok) {
            setError(r.error);
            return;
          }
          setResult(`Applied ${r.data.applied}, skipped ${r.data.skipped} (already had a direction for that role).`);
          onApplied();
        }}
      >
        Apply pattern
      </Button>
    </div>
  );
}

function SavePatternPanel({
  sectionId,
  sectionLabel,
  setError,
  setResult,
}: {
  sectionId: string;
  sectionLabel: string;
  setError: (e: string | null) => void;
  setResult: (r: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Saves every shared direction currently in <span className="font-semibold">{sectionLabel}</span> as a
        reusable pattern you can apply to any section, in any song, later.
      </p>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Guitar build into the chorus"
        aria-label="Pattern name"
      />
      <Button
        type="button"
        loading={saving}
        disabled={saving || !name.trim()}
        onClick={async () => {
          setSaving(true);
          setError(null);
          const r = await saveDirectionPattern(sectionId, name.trim());
          setSaving(false);
          if (!r.ok) {
            setError(r.error);
            return;
          }
          setResult(`Saved "${name.trim()}" with ${r.data.itemCount} direction${r.data.itemCount === 1 ? "" : "s"}.`);
          setName("");
        }}
      >
        Save pattern
      </Button>
    </div>
  );
}
