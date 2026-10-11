"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getRehearsalNotesForSet,
  resolveRehearsalNote,
  convertRehearsalNoteToChange,
  type RehearsalNoteRow,
} from "@/lib/actions/rehearsal";
import { canConvertNote, REHEARSAL_NOTE_CATEGORIES } from "@/lib/songs/rehearsal-notes";
import { ROLES, DIRECTION_GROUPS } from "@/lib/songs/constants";

const ROLE_OPTIONS = [...ROLES, ...DIRECTION_GROUPS];

// The leader's decision point: what was observed in rehearsal is NOT yet part
// of the arrangement. Each open note can be kept as a rehearsal note, thrown
// away, or — for a note attached to a section — applied as an agreed change
// to that section's shared direction. Only the last one touches the song.
export function NotesReview({
  setId,
  refreshKey = 0,
  onArrangementChanged,
}: {
  setId: string;
  refreshKey?: number;
  onArrangementChanged?: () => void;
}) {
  const [notes, setNotes] = useState<RehearsalNoteRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [role, setRole] = useState<string>(ROLE_OPTIONS[0]);
  const [draft, setDraft] = useState("");

  const load = useCallback(async () => {
    const result = await getRehearsalNotesForSet(setId);
    if (result.ok) setNotes(result.data);
    else setError(result.error);
  }, [setId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, refreshKey]);

  async function decide(id: string, decision: "KEPT" | "DISCARDED") {
    setBusyId(id);
    setError(null);
    const result = await resolveRehearsalNote(id, decision);
    setBusyId(null);
    if (!result.ok) setError(result.error);
    await load();
  }

  async function apply(id: string) {
    setBusyId(id);
    setError(null);
    const result = await convertRehearsalNoteToChange(id, { role, content: draft });
    setBusyId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setApplyingId(null);
    await load();
    onArrangementChanged?.();
  }

  const count = notes?.length ?? 0;

  return (
    <details className="rounded-xl border border-border bg-surface p-3">
      <summary className="tap-target flex cursor-pointer items-center gap-2 text-sm font-semibold">
        <ClipboardCheck className="h-4 w-4" aria-hidden /> Notes to review
        <span
          className={count > 0 ? "rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground" : "text-xs text-muted-foreground"}
          aria-label={`${count} open`}
        >
          {notes === null ? "…" : count}
        </span>
      </summary>
      <div className="mt-3 space-y-2">
        {notes !== null && count === 0 && (
          <p className="text-sm text-muted-foreground">Nothing waiting. Notes from rehearsal show up here.</p>
        )}
        {notes?.map((n) => {
          const cat = REHEARSAL_NOTE_CATEGORIES.find((c) => c.value === n.category);
          return (
            <div key={n.id} className="space-y-2 rounded-lg bg-surface-muted p-3">
              <p className="text-xs font-semibold text-muted-foreground">
                {cat ? `${cat.label} · ` : ""}
                {n.songTitle}
                {n.sectionLabel ? ` · ${n.sectionLabel}` : ""}
              </p>
              <p className="text-sm">{n.content}</p>
              {applyingId === n.id ? (
                <div className="space-y-2">
                  <Select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Direction is for" className="h-11 text-sm">
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={2}
                    aria-label="Direction to apply"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" disabled={busyId === n.id || !draft.trim()} onClick={() => apply(n.id)}>
                      Apply to arrangement
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setApplyingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {canConvertNote({ sectionId: n.sectionId, category: n.category, status: n.status }) && (
                    <Button
                      size="sm"
                      disabled={busyId === n.id}
                      onClick={() => {
                        setApplyingId(n.id);
                        setDraft(n.content);
                      }}
                    >
                      Make it a direction
                    </Button>
                  )}
                  <Button size="sm" variant="outline" disabled={busyId === n.id} onClick={() => decide(n.id, "KEPT")}>
                    Keep as note
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busyId === n.id} onClick={() => decide(n.id, "DISCARDED")}>
                    Discard
                  </Button>
                </div>
              )}
            </div>
          );
        })}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </details>
  );
}
