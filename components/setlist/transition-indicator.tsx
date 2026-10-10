"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, Pencil, X, Plus, Lock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import { ROLES, DIRECTION_GROUPS } from "@/lib/songs/constants";
import { upsertTransition, deleteTransition, upsertTransitionRoleNote } from "@/lib/actions/transitions";
import { cn } from "@/lib/utils/cn";

const TRANSITION_TYPES = [
  { value: "DIRECT", label: "Direct" },
  { value: "INSTRUMENTAL", label: "Instrumental" },
  { value: "PAD", label: "Pad" },
  { value: "SPOKEN", label: "Spoken" },
  { value: "PRAYER", label: "Prayer" },
  { value: "FREE_WORSHIP", label: "Free Worship" },
  { value: "COUNT_IN", label: "Count-in" },
  { value: "PAUSE", label: "Pause" },
  { value: "CUSTOM", label: "Custom" },
] as const;
type TransitionTypeValue = (typeof TRANSITION_TYPES)[number]["value"];

export type TransitionRoleNote = {
  id: string;
  role: string;
  content: string;
  teamMemberId: string | null;
  visibility: "TEAM" | "ROLE" | "PERSON";
};

export type TransitionData = {
  id: string;
  type: TransitionTypeValue;
  direction: string | null;
  roleNotes: TransitionRoleNote[];
} | null;

type TeamMemberOption = { id: string; name: string; role: string };

export function TransitionIndicator({
  setId,
  fromSetSongId,
  toSetSongId,
  transition,
  fromKey,
  toKey,
  teamMembers,
}: {
  setId: string;
  fromSetSongId: string;
  toSetSongId: string | null;
  transition: TransitionData;
  fromKey?: string | null;
  toKey?: string | null;
  teamMembers: TeamMemberOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TransitionTypeValue>(transition?.type ?? "DIRECT");
  const [direction, setDirection] = useState(transition?.direction ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typeLabel = TRANSITION_TYPES.find((t) => t.value === (transition?.type ?? "DIRECT"))?.label;
  // Only worth showing when the keys actually differ — a same-key
  // transition doesn't need the reminder, and "same instrument, no key
  // change" is exactly the case a key change could otherwise get lost in.
  const keyChange = fromKey && toKey && fromKey !== toKey ? `${fromKey} → ${toKey}` : null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex min-h-11 w-full items-center gap-3 rounded-lg px-1 text-left text-sm text-muted-foreground hover:bg-surface-muted"
      >
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
            transition ? "bg-musical-soft text-musical" : "bg-surface-muted text-muted-foreground",
          )}
          aria-hidden
        >
          <ArrowDown className="h-4 w-4" />
        </span>
        <span className={cn("font-semibold", transition ? "text-musical" : "text-muted-foreground")}>
          <span className="sr-only">Edit transition: </span>
          {typeLabel}
        </span>
        {transition?.direction && <span className="min-w-0 truncate">{transition.direction}</span>}
        {keyChange && (
          <span className="tnum ml-auto shrink-0 rounded-full bg-musical-soft px-2.5 py-0.5 text-xs font-bold text-musical">
            {keyChange}
          </span>
        )}
        <Pencil className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden />
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-border bg-surface-muted p-2.5">
      {keyChange && (
        <p className="flex items-center gap-1.5 text-sm font-semibold text-musical">
          Key change: <span className="tnum">{keyChange}</span>
        </p>
      )}
      <div className="flex items-center gap-2">
        <ArrowDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <Select
          value={type}
          onChange={(e) => setType(e.target.value as TransitionTypeValue)}
          aria-label="Transition type"
          className="h-10 w-40 text-sm"
        >
          {TRANSITION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close transition editor"
          className="tap-target ml-auto flex w-11 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <Textarea
        value={direction}
        onChange={(e) => setDirection(e.target.value)}
        rows={2}
        placeholder={
          toSetSongId
            ? "Hold the last chord. Keys continue pads into the next song."
            : "Hold the last chord and let it ring out."
        }
        className="text-xs"
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          className="h-10 px-3 text-sm"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            setError(null);
            const result = await upsertTransition({ setId, fromSetSongId, toSetSongId, type, direction });
            setSaving(false);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            // Stay open (don't auto-close) so the leader can immediately add
            // per-musician directions below — the saved shared direction
            // stays visible the whole time, never just a toast that vanishes.
            router.refresh();
          }}
        >
          Save
        </Button>
        {transition && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-10 px-3 text-sm text-danger"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              setError(null);
              const result = await deleteTransition(transition.id);
              setSaving(false);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setType("DIRECT");
              setDirection("");
              setOpen(false);
              router.refresh();
            }}
          >
            Remove
          </Button>
        )}
      </div>

      {transition && (
        <div className="space-y-2 border-t border-border pt-2">
          <p className="label-caps">Who does what in this transition</p>
          {transition.roleNotes.length > 0 && (
            <ul className="space-y-1.5">
              {transition.roleNotes.map((note) => (
                <TransitionRoleNoteRow
                  key={note.id}
                  note={note}
                  transitionId={transition.id}
                  setId={setId}
                  teamMembers={teamMembers}
                  onChanged={() => router.refresh()}
                />
              ))}
            </ul>
          )}
          <AddTransitionRoleNote transitionId={transition.id} setId={setId} teamMembers={teamMembers} onAdded={() => router.refresh()} />
        </div>
      )}
    </div>
  );
}

function scopeLabel(visibility: "TEAM" | "ROLE" | "PERSON", role: string, assigneeName?: string) {
  if (visibility === "PERSON") return `${assigneeName ?? "One person"} only`;
  if (visibility === "ROLE") return `${role} only`;
  return "Everyone";
}

// One musician's (or role's) piece of the transition — e.g. "Keys: change
// to pads during the wash" while the shared `direction` above covers the
// whole-band picture. Same SongRoleNote model and visibility rules as every
// section direction, just scoped to this transition instead of a section.
function TransitionRoleNoteRow({
  note,
  transitionId,
  setId,
  teamMembers,
  onChanged,
}: {
  note: TransitionRoleNote;
  transitionId: string;
  setId: string;
  teamMembers: TeamMemberOption[];
  onChanged: () => void;
}) {
  const [content, setContent] = useState(note.content);
  // Same render-time resync as RoleNoteRow (arrangement-editor.tsx) — this
  // row keeps the same key={note.id} across a router.refresh() even when
  // its own content changed server-side, so without this the field would
  // keep showing the pre-save text.
  const [syncedContent, setSyncedContent] = useState(note.content);
  if (note.content !== syncedContent) {
    setSyncedContent(note.content);
    setContent(note.content);
  }
  const [saving, setSaving] = useState(false);
  const assigneeName = teamMembers.find((m) => m.id === note.teamMemberId)?.name;

  async function save() {
    setSaving(true);
    await upsertTransitionRoleNote(transitionId, note.role, content, setId, {
      teamMemberId: note.teamMemberId,
      visibility: note.visibility,
    });
    setSaving(false);
    onChanged();
  }

  return (
    <li className="rounded-lg bg-surface p-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="shrink-0 text-xs font-bold text-foreground">{note.role}</span>
        <Badge variant="outline" className="gap-1 text-[0.65rem]">
          {note.visibility === "PERSON" ? <Lock className="h-3 w-3" aria-hidden /> : <Users className="h-3 w-3" aria-hidden />}
          {scopeLabel(note.visibility, note.role, assigneeName)}
        </Badge>
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={save}
          rows={1}
          className="min-h-9 flex-1 bg-surface-muted py-1.5 text-xs"
        />
        <IconButton
          label={`Remove ${note.role} transition direction`}
          tone="danger"
          onClick={async () => {
            await upsertTransitionRoleNote(transitionId, note.role, "", setId, { teamMemberId: note.teamMemberId });
            onChanged();
          }}
        >
          <X className="h-3.5 w-3.5" />
        </IconButton>
      </div>
      {saving && <span className="sr-only">Saving…</span>}
    </li>
  );
}

function AddTransitionRoleNote({
  transitionId,
  setId,
  teamMembers,
  onAdded,
}: {
  transitionId: string;
  setId: string;
  teamMembers: TeamMemberOption[];
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<string>(ROLES[0]);
  const [teamMemberId, setTeamMemberId] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const roleOptions: readonly string[] = [...ROLES, ...DIRECTION_GROUPS];

  if (!open) {
    return (
      <Button type="button" size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => setOpen(true)}>
        <Plus className="h-3 w-3" /> Add per-musician direction
      </Button>
    );
  }

  return (
    <div className="space-y-1.5 rounded-lg border border-dashed border-border p-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <Select value={role} onChange={(e) => setRole(e.target.value)} className="h-9 w-36 text-xs" aria-label="Role for this transition direction">
          {roleOptions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
        {teamMembers.length > 0 && (
          <Select
            value={teamMemberId}
            onChange={(e) => setTeamMemberId(e.target.value)}
            className="h-9 w-36 text-xs"
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
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={1}
        placeholder="e.g. Hold the pad, then change to the new key on the cue"
        className="min-h-9 text-xs"
      />
      <div className="flex gap-1.5">
        <Button
          type="button"
          size="sm"
          className="h-8 px-2 text-xs"
          loading={saving}
          disabled={saving || !content.trim()}
          onClick={async () => {
            setSaving(true);
            await upsertTransitionRoleNote(transitionId, role, content, setId, {
              teamMemberId: teamMemberId || null,
              visibility: teamMemberId ? "PERSON" : "TEAM",
            });
            setSaving(false);
            setOpen(false);
            setRole(ROLES[0]);
            setTeamMemberId("");
            setContent("");
            onAdded();
          }}
        >
          Add
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
