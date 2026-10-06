"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ROLES, DIRECTION_GROUPS } from "@/lib/songs/constants";
import { vocabForRole } from "@/lib/songs/quick-direction-vocab";
import { upsertRoleNote } from "@/lib/actions/songs";
import { cn } from "@/lib/utils/cn";

const CUSTOM_ROLE_VALUE = "__custom_role__";

type TeamMemberOption = { id: string; name: string; role: string };

// Replaces "pick a role, then type a full sentence" with WHO → WHAT
// (chips, adapted to whichever role is picked) → optional intensity/note.
// Saves straight through the existing upsertRoleNote — the composed phrase
// is just this row's `content`, so My Part and Rehearsal Mode render it
// exactly as they would a hand-typed direction, no changes needed there.
export function QuickDirectionPicker({
  songId,
  sectionId,
  teamMembers,
  onAdded,
}: {
  songId: string;
  sectionId: string;
  teamMembers: TeamMemberOption[];
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<string>(ROLES[0]);
  const [customRole, setCustomRole] = useState("");
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [customWhat, setCustomWhat] = useState("");
  const [showExtra, setShowExtra] = useState(false);
  const [intensity, setIntensity] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [teamMemberId, setTeamMemberId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveRole = role === CUSTOM_ROLE_VALUE ? customRole.trim() : role;
  const vocab = vocabForRole(effectiveRole || role);

  function toggleChip(chip: string) {
    setSelectedChips((prev) => (prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]));
  }

  function reset() {
    setOpen(false);
    setRole(ROLES[0]);
    setCustomRole("");
    setSelectedChips([]);
    setCustomWhat("");
    setShowExtra(false);
    setIntensity(null);
    setNote("");
    setTeamMemberId("");
    setError(null);
  }

  function composeContent(): string {
    const parts = [...selectedChips];
    if (customWhat.trim()) parts.push(customWhat.trim());
    let content = parts.join(" · ");
    if (intensity !== null) content += `${content ? " — " : ""}Intensity ${intensity}/5`;
    if (note.trim()) content += `${content ? " — " : ""}"${note.trim()}"`;
    return content;
  }

  const content = composeContent();
  const canSubmit = !!effectiveRole && !!content;

  async function handleAdd() {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    const result = await upsertRoleNote(sectionId, effectiveRole, content, songId, {
      teamMemberId: teamMemberId || null,
      visibility: teamMemberId ? "PERSON" : "TEAM",
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    reset();
    onAdded();
  }

  if (!open) {
    return (
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" /> Add direction
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Quick Direction
        </h4>
        <button type="button" onClick={reset} className="text-muted-foreground hover:text-foreground" aria-label="Cancel">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Who</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {role === CUSTOM_ROLE_VALUE ? (
            <Input
              autoFocus
              value={customRole}
              onChange={(e) => setCustomRole(e.target.value)}
              placeholder="e.g. Percussion"
              className="h-8 w-44 text-sm"
            />
          ) : (
            <Select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setSelectedChips([]);
              }}
              className="h-8 w-44 text-sm"
              aria-label="Who is this direction for"
            >
              <optgroup label="Individual role">
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Group direction">
                {DIRECTION_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </optgroup>
              <optgroup label="This song only">
                <option value={CUSTOM_ROLE_VALUE}>Custom…</option>
              </optgroup>
            </Select>
          )}
          {teamMembers.length > 0 && (
            <Select
              value={teamMemberId}
              onChange={(e) => setTeamMemberId(e.target.value)}
              className="h-8 w-36 text-xs"
              aria-label="Aim at one specific person"
            >
              <option value="">Anyone in this role</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">What</p>
        <div className="flex flex-wrap gap-1.5">
          {vocab.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => toggleChip(chip)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                selectedChips.includes(chip)
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-surface text-foreground hover:bg-surface-muted",
              )}
            >
              {chip}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowExtra((v) => !v)}
            className={cn(
              "rounded-full border border-dashed px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-surface-muted",
              showExtra && "border-accent text-accent",
            )}
          >
            More…
          </button>
        </div>
      </div>

      {showExtra && (
        <div className="grid gap-2 border-t border-border pt-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Custom (optional)</label>
            <Input
              value={customWhat}
              onChange={(e) => setCustomWhat(e.target.value)}
              placeholder="e.g. Walking bassline"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Intensity (optional)</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setIntensity(intensity === n ? null : n)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold",
                    intensity !== null && n <= intensity
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border bg-surface text-muted-foreground hover:bg-surface-muted",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Note (optional)</label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Stay underneath the vocal"
              className="h-8 text-sm"
            />
          </div>
        </div>
      )}

      {content && <p className="text-xs text-muted-foreground">Preview: &ldquo;{content}&rdquo;</p>}
      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={!canSubmit || saving} onClick={handleAdd}>
          {saving ? "Adding…" : "Add Direction"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={reset}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
