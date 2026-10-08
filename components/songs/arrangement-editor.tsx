"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Plus,
  Trash2,
  X,
  FileText,
  Copy,
  Settings2,
  Wind,
  Compass,
  SlidersHorizontal,
  Save,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { SaveStatus, type SaveState } from "@/components/ui/save-status";
import { Tooltip } from "@/components/ui/tooltip";
import { DynamicIndicator } from "@/components/songs/dynamic-indicator";
import { SongFlowRibbon } from "@/components/songs/song-flow-ribbon";
import { QuickDirectionPicker } from "@/components/songs/quick-direction-picker";
import { SECTION_INTENT_CHIPS } from "@/lib/songs/quick-direction-vocab";
import { ROLES, DYNAMICS_LEVELS, DIRECTION_GROUPS } from "@/lib/songs/constants";
import { cn } from "@/lib/utils/cn";
import {
  addSection,
  deleteSection,
  duplicateSection,
  renameSection,
  reorderSections,
  updateSectionDynamics,
  setSectionFreeform,
  updateSectionLyrics,
  updateSectionRepeatCount,
  upsertRoleNote,
  changeRoleNoteRole,
  copyRoleNotes,
  updateSong,
} from "@/lib/actions/songs";

type RoleNote = {
  id: string;
  role: string;
  content: string;
  teamMemberId: string | null;
  visibility: "TEAM" | "ROLE" | "PERSON";
};
type Section = {
  id: string;
  label: string;
  order: number;
  repeatCount: number | null;
  dynamics: string | null;
  isFreeform: boolean;
  lyricsChords: string | null;
  roleNotes: RoleNote[];
};
type TeamMemberOption = { id: string; name: string; role: string };

// Sentinel values that switch the Select to a free-text input — the typed
// value is saved as a plain string on just this section/song (SongRoleNote
// has no fixed-vocabulary constraint), never added to the app-wide ROLES or
// DYNAMICS_LEVELS lists, so it never shows up in Team or Set role pickers.
const CUSTOM_ROLE_VALUE = "__custom_role__";
const CUSTOM_DYNAMICS_VALUE = "__custom_dynamics__";

export function ArrangementEditor({
  songId,
  initialSections,
  initialVisionNote,
  teamMembers,
}: {
  songId: string;
  initialSections: Section[];
  initialVisionNote: string;
  teamMembers: TeamMemberOption[];
}) {
  const [sections, setSections] = useState(initialSections);
  const [syncedSections, setSyncedSections] = useState(initialSections);
  const [selectedId, setSelectedId] = useState<string | null>(initialSections[0]?.id ?? null);
  const [newSectionLabel, setNewSectionLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Adjust local state during render when the server gives us fresh data
  // (e.g. after adding a section), instead of in an effect — see
  // https://react.dev/learn/you-might-not-need-an-effect
  if (initialSections !== syncedSections) {
    setSyncedSections(initialSections);
    setSections(initialSections);
    if (!initialSections.some((s) => s.id === selectedId)) {
      setSelectedId(initialSections[0]?.id ?? null);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSections((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === active.id);
      const newIndex = prev.findIndex((s) => s.id === over.id);
      const next = arrayMove(prev, oldIndex, newIndex);
      reorderSections(songId, next.map((s) => s.id));
      return next;
    });
  }

  const selectedIndex = sections.findIndex((s) => s.id === selectedId);
  const selected = sections[selectedIndex];

  return (
    <div className="space-y-5">
      <SongVisionGroup songId={songId} initialVision={initialVisionNote} />

      <SongFlowRibbon
        sections={sections}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      <div className="grid gap-4 lg:grid-cols-[16rem_1fr] lg:items-start">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="flex gap-2 overflow-x-auto pb-1 lg:sticky lg:top-4 lg:flex-col lg:overflow-visible lg:pb-0">
              {sections.map((section, i) => (
                <SectionOutlineRow
                  key={section.id}
                  section={section}
                  index={i}
                  active={section.id === selectedId}
                  onSelect={() => setSelectedId(section.id)}
                />
              ))}
              <div className="flex shrink-0 gap-2 lg:shrink lg:flex-col">
                <Input
                  value={newSectionLabel}
                  onChange={(e) => setNewSectionLabel(e.target.value)}
                  placeholder="New section…"
                  className="h-9 w-32 text-xs lg:w-full"
                  onKeyDown={async (e) => {
                    if (e.key !== "Enter" || !newSectionLabel.trim()) return;
                    const result = await addSection(songId, newSectionLabel.trim());
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    setNewSectionLabel("");
                    router.refresh();
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="shrink-0"
                  onClick={async () => {
                    if (!newSectionLabel.trim()) return;
                    setError(null);
                    const result = await addSection(songId, newSectionLabel.trim());
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    setNewSectionLabel("");
                    router.refresh();
                  }}
                >
                  <Plus className="h-4 w-4" />
                  <span className="lg:hidden">Add</span>
                </Button>
              </div>
            </div>
          </SortableContext>
        </DndContext>

        {selected ? (
          <FocusedSectionEditor
            key={selected.id}
            songId={songId}
            section={selected}
            sectionNumber={selectedIndex + 1}
            sectionCount={sections.length}
            teamMembers={teamMembers}
            onDeleted={() => {
              setSections((prev) => prev.filter((s) => s.id !== selected.id));
              router.refresh();
            }}
            onDuplicated={() => router.refresh()}
            onDirectionAdded={() => router.refresh()}
            hasPreviousSection={selectedIndex > 0}
            onCopyFromPrevious={async () => {
              const previous = sections[selectedIndex - 1];
              if (!previous) return;
              const result = await copyRoleNotes(previous.id, selected.id, songId);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              router.refresh();
            }}
          />
        ) : (
          <Card className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <p>No sections yet — add Intro, Verse 1, Chorus, or whatever this song starts with.</p>
          </Card>
        )}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

function SectionOutlineRow({
  section,
  index,
  active,
  onSelect,
}: {
  section: Section;
  index: number;
  active: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid="section-outline-item"
      className={cn(
        "flex w-44 shrink-0 items-center gap-1 rounded-lg border px-1.5 py-1 lg:w-full",
        active
          ? "border-primary bg-primary/10"
          : "border-border bg-surface hover:bg-surface-muted",
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="flex h-9 w-7 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground active:cursor-grabbing"
        aria-label={`Drag to reorder ${section.label}`}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        aria-current={active ? "true" : undefined}
      >
        <span
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
            active ? "bg-primary text-primary-foreground" : "bg-surface-muted text-muted-foreground",
          )}
        >
          {index + 1}
        </span>
        <span className={cn("truncate text-sm", active ? "font-semibold text-foreground" : "text-foreground")}>
          {section.label}
          {section.isFreeform && <Wind className="ml-1 inline h-3 w-3 text-musical" aria-label="Freeform" />}
        </span>
        <DynamicIndicator dynamics={section.dynamics} showLabel={false} className="ml-auto shrink-0" />
      </button>
    </div>
  );
}

function FocusedSectionEditor({
  songId,
  section,
  sectionNumber,
  sectionCount,
  teamMembers,
  onDeleted,
  onDuplicated,
  onDirectionAdded,
  onCopyFromPrevious,
  hasPreviousSection,
}: {
  songId: string;
  section: Section;
  sectionNumber: number;
  sectionCount: number;
  teamMembers: TeamMemberOption[];
  onDeleted: () => void;
  onDuplicated: () => void;
  onDirectionAdded: () => void;
  onCopyFromPrevious: () => void;
  hasPreviousSection: boolean;
}) {
  const [label, setLabel] = useState(section.label);
  const [repeatCount, setRepeatCount] = useState(section.repeatCount ?? 1);
  const [dynamics, setDynamics] = useState(section.dynamics ?? "");
  const [isFreeform, setIsFreeform] = useState(section.isFreeform);
  const [roleNotes, setRoleNotes] = useState(section.roleNotes);
  const [copyingPrevious, setCopyingPrevious] = useState(false);
  const dynamicsIsCustomInitially = Boolean(dynamics) && !(DYNAMICS_LEVELS as readonly string[]).includes(dynamics);
  const [dynamicsIsCustom, setDynamicsIsCustom] = useState(dynamicsIsCustomInitially);
  const [customDynamics, setCustomDynamics] = useState(dynamicsIsCustomInitially ? dynamics : "");
  const [headerSave, setHeaderSave] = useState<SaveState>("idle");
  const [dynamicsSave, setDynamicsSave] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function flash(setStatus: (s: SaveState) => void, run: () => Promise<{ ok: boolean; error?: string }>) {
    setStatus("saving");
    const result = await run();
    if (!result.ok) {
      setStatus("error");
      setError(result.error ?? "Couldn't save.");
      return;
    }
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 1800);
  }

  return (
    <Card className="space-y-5 p-4 sm:p-5">
      {/* Section name and order */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={() => flash(setHeaderSave, () => renameSection(section.id, label))}
            className="h-9 max-w-[14rem] text-lg font-semibold"
            aria-label="Section name"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => flash(setHeaderSave, () => renameSection(section.id, label))}
          >
            <Save className="h-3.5 w-3.5" /> Save
          </Button>
          <span className="text-xs text-muted-foreground">
            Section {sectionNumber} of {sectionCount}
          </span>
          <SaveStatus state={headerSave} />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={async () => {
              setError(null);
              const next = !isFreeform;
              setIsFreeform(next);
              const result = await setSectionFreeform(section.id, next);
              if (!result.ok) {
                setError(result.error);
                setIsFreeform(!next);
              }
            }}
            className={cn(
              "rounded-md p-2.5 text-muted-foreground hover:bg-surface-muted",
              isFreeform && "bg-musical-soft text-musical hover:bg-musical-soft",
            )}
            aria-label="Toggle spontaneous / freeform section"
          >
            <Tooltip content="Spontaneous / freeform section (e.g. Free Worship) — fewer required fields">
              <Wind className="h-4 w-4" />
            </Tooltip>
          </button>
          <button
            onClick={async () => {
              setError(null);
              const result = await duplicateSection(section.id);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              onDuplicated();
            }}
            className="rounded-md p-2.5 text-muted-foreground hover:bg-surface-muted"
            aria-label="Duplicate section"
          >
            <Tooltip content="Duplicate this section, with all its dynamics and directions">
              <Copy className="h-4 w-4" />
            </Tooltip>
          </button>
          <button
            onClick={async () => {
              setError(null);
              const result = await deleteSection(section.id);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              onDeleted();
            }}
            className="rounded-md p-2.5 text-muted-foreground hover:bg-danger/10 hover:text-danger"
            aria-label="Delete section"
          >
            <Tooltip content="Delete this section — can't be undone">
              <Trash2 className="h-4 w-4" />
            </Tooltip>
          </button>
        </div>
      </div>

      {/* Dynamics and repeat count */}
      <div className="rounded-lg bg-surface-muted p-3">
        <h3 className="flex items-center gap-1.5 label-caps">
          <SlidersHorizontal className="h-3.5 w-3.5" /> Dynamics
        </h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SECTION_INTENT_CHIPS.map((chip) => (
            <Tooltip key={chip} content={`Set this section's dynamics to "${chip}" — one tap, no typing`}>
              <button
                type="button"
                onClick={async () => {
                  setDynamicsIsCustom(false);
                  setDynamics(chip);
                  setDynamicsSave("saving");
                  const result = await updateSectionDynamics(section.id, chip);
                  if (!result.ok) {
                    setError(result.error);
                    setDynamicsSave("error");
                    return;
                  }
                  setDynamicsSave("saved");
                  setTimeout(() => setDynamicsSave("idle"), 1800);
                }}
                className={cn(
                  "min-h-9 rounded-full border px-3.5 text-sm font-semibold transition-colors",
                  dynamics === chip
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface text-foreground hover:bg-surface-muted",
                )}
              >
                {chip}
              </button>
            </Tooltip>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {dynamicsIsCustom ? (
            <div className="flex items-center gap-1">
              <Input
                autoFocus
                value={customDynamics}
                onChange={(e) => setCustomDynamics(e.target.value)}
                placeholder="e.g. Driving, Hushed, Explosive"
                className="h-8 w-40 text-xs"
                aria-label="Custom dynamics label"
              />
              <button
                type="button"
                onClick={() => {
                  setDynamicsIsCustom(false);
                  setCustomDynamics("");
                }}
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Use preset
              </button>
            </div>
          ) : (
            <Select
              value={dynamics}
              onChange={async (e) => {
                const next = e.target.value;
                if (next === CUSTOM_DYNAMICS_VALUE) {
                  setDynamicsIsCustom(true);
                  return;
                }
                setDynamics(next);
                setDynamicsSave("saving");
                const result = await updateSectionDynamics(section.id, next || null);
                if (!result.ok) {
                  setError(result.error);
                  setDynamicsSave("error");
                  return;
                }
                setDynamicsSave("saved");
                setTimeout(() => setDynamicsSave("idle"), 1800);
              }}
              className="h-8 w-32 text-xs"
              aria-label="Dynamics level"
            >
              <option value="">Not set</option>
              {DYNAMICS_LEVELS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
              <option value={CUSTOM_DYNAMICS_VALUE}>Custom…</option>
            </Select>
          )}
          {!isFreeform && (
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Repeat
              <Input
                type="number"
                min={1}
                value={repeatCount}
                onChange={(e) => setRepeatCount(Number(e.target.value) || 1)}
                onBlur={async () => {
                  setDynamicsSave("saving");
                  const result = await updateSectionRepeatCount(section.id, repeatCount);
                  if (!result.ok) {
                    setError(result.error);
                    setDynamicsSave("error");
                    return;
                  }
                  setDynamicsSave("saved");
                  setTimeout(() => setDynamicsSave("idle"), 1800);
                }}
                className="h-8 w-14 text-center"
                aria-label="Repeat count"
              />
              ×
            </label>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8"
            disabled={dynamicsIsCustom && !customDynamics.trim()}
            onClick={async () => {
              setDynamicsSave("saving");
              const dynamicsValue = dynamicsIsCustom ? customDynamics.trim() : dynamics;
              const [dynResult, repeatResult] = await Promise.all([
                updateSectionDynamics(section.id, dynamicsValue || null),
                isFreeform ? Promise.resolve({ ok: true as const }) : updateSectionRepeatCount(section.id, repeatCount),
              ]);
              if (!dynResult.ok || !repeatResult.ok) {
                setError(!dynResult.ok ? dynResult.error : (repeatResult as { ok: false; error: string }).error);
                setDynamicsSave("error");
                return;
              }
              if (dynamicsIsCustom) setDynamics(dynamicsValue);
              setDynamicsSave("saved");
              setTimeout(() => setDynamicsSave("idle"), 1800);
            }}
          >
            <Save className="h-3.5 w-3.5" /> Save
          </Button>
          <SaveStatus state={dynamicsSave} />
        </div>
      </div>

      {/* Lyrics and chords */}
      <LyricsChordsBlock sectionId={section.id} initialContent={section.lyricsChords ?? ""} />

      {/* Role-specific and group directions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="label-caps">
            Role Directions
          </h3>
          {hasPreviousSection && (
            <Tooltip content="Copy every direction from the previous section onto this one, then just change what's different">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={copyingPrevious}
                onClick={async () => {
                  setCopyingPrevious(true);
                  await onCopyFromPrevious();
                  setCopyingPrevious(false);
                }}
              >
                <Copy className="h-3.5 w-3.5" /> {copyingPrevious ? "Copying…" : "Copy from previous section"}
              </Button>
            </Tooltip>
          )}
        </div>
        {roleNotes.map((note) => (
          <RoleNoteRow
            key={note.id}
            noteId={note.id}
            songId={songId}
            sectionId={section.id}
            role={note.role}
            initialContent={note.content}
            initialTeamMemberId={note.teamMemberId}
            initialVisibility={note.visibility}
            teamMembers={teamMembers}
            onRemoved={() => setRoleNotes((prev) => prev.filter((n) => n.id !== note.id))}
            onRoleChanged={(newRole) =>
              setRoleNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, role: newRole } : n)))
            }
          />
        ))}

        <QuickDirectionPicker
          songId={songId}
          sectionId={section.id}
          teamMembers={teamMembers}
          onAdded={onDirectionAdded}
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </Card>
  );
}

function SongVisionGroup({ songId, initialVision }: { songId: string; initialVision: string }) {
  const [value, setValue] = useState(initialVision);
  const [status, setStatus] = useState<SaveState>("idle");

  async function save() {
    setStatus("saving");
    const result = await updateSong(songId, { visionNote: value });
    setStatus(result.ok ? "saved" : "error");
    if (result.ok) setTimeout(() => setStatus("idle"), 1800);
  }

  return (
    <div className="rounded-lg bg-surface-muted p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 label-caps">
          <Compass className="h-3.5 w-3.5" /> Song Vision
        </h3>
        <SaveStatus state={status} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Where this song is going as a whole — applies across every section, not just this one.
      </p>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        rows={2}
        className="mt-2 bg-surface"
        placeholder="Start intimate. Keep Verse 1 open. Build through the bridge and leave room for spontaneous worship."
      />
      <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={save}>
        <Save className="h-3.5 w-3.5" /> Save
      </Button>
    </div>
  );
}

function LyricsChordsBlock({
  sectionId,
  initialContent,
}: {
  sectionId: string;
  initialContent: string;
}) {
  const [content, setContent] = useState(initialContent);
  const [expanded, setExpanded] = useState(initialContent.trim().length > 0);
  const [status, setStatus] = useState<SaveState>("idle");

  async function save() {
    setStatus("saving");
    const result = await updateSectionLyrics(sectionId, content);
    setStatus(result.ok ? "saved" : "error");
    if (result.ok) setTimeout(() => setStatus("idle"), 1800);
  }

  if (!expanded) {
    return (
      <Button type="button" size="sm" variant="ghost" onClick={() => setExpanded(true)}>
        <FileText className="h-3.5 w-3.5" /> Add lyrics &amp; chords
      </Button>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 label-caps">
          <FileText className="h-3.5 w-3.5" /> Lyrics &amp; Chords
        </label>
        <SaveStatus state={status} />
      </div>
      <p className="text-xs text-muted-foreground">
        Put chords on their own line above the words they go with — the Chart page can then show
        lyrics-only (for singers), chords-only, or both, from this one field.
      </p>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={save}
        rows={Math.min(12, Math.max(3, content.split("\n").length))}
        className="font-mono text-xs leading-relaxed whitespace-pre"
        placeholder={"G           D\nAmazing grace, how sweet the sound"}
      />
      <Button type="button" variant="secondary" size="sm" onClick={save}>
        <Save className="h-3.5 w-3.5" /> Save
      </Button>
    </div>
  );
}

function directionPlaceholder(role: string) {
  if (role === "Rest of the Band") {
    return "What should the rest of the band do here? (e.g. rest, hold, come in quietly)";
  }
  if (role === "Rest of the Vocals") {
    return "What should the rest of the vocals do here? (e.g. rest, hum, join on the chorus)";
  }
  return `What should ${role} do in this section?`;
}

function RoleNoteRow({
  noteId,
  songId,
  sectionId,
  role,
  initialContent,
  initialTeamMemberId,
  initialVisibility,
  teamMembers,
  onRemoved,
  onRoleChanged,
}: {
  noteId: string;
  songId: string;
  sectionId: string;
  role: string;
  initialContent: string;
  initialTeamMemberId: string | null;
  initialVisibility: "TEAM" | "ROLE" | "PERSON";
  teamMembers: TeamMemberOption[];
  onRemoved: () => void;
  onRoleChanged: (newRole: string) => void;
}) {
  const [content, setContent] = useState(initialContent);
  const [teamMemberId, setTeamMemberId] = useState(initialTeamMemberId ?? "");
  const [visibility, setVisibility] = useState(initialVisibility);
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<SaveState>("idle");
  const [roleError, setRoleError] = useState<string | null>(null);
  const [changingRole, setChangingRole] = useState(false);
  // A freshly-added-but-not-yet-saved row (see the "Add direction" flow
  // above) has a client-side temp id and nothing in the database yet —
  // reassigning its role doesn't need a server round trip, just remove and
  // re-add it with the right role instead.
  const isPersisted = !noteId.startsWith("new-");

  async function save(overrides?: { teamMemberId?: string | null; visibility?: "TEAM" | "ROLE" | "PERSON" }) {
    setStatus("saving");
    const result = await upsertRoleNote(sectionId, role, content, songId, {
      teamMemberId: overrides?.teamMemberId !== undefined ? overrides.teamMemberId : teamMemberId || null,
      visibility: overrides?.visibility ?? visibility,
    });
    setStatus(result.ok ? "saved" : "error");
    if (result.ok) setTimeout(() => setStatus("idle"), 1800);
  }

  async function changeRole(newRole: string) {
    if (!newRole || newRole === role) return;
    setRoleError(null);
    setChangingRole(true);
    const result = await changeRoleNoteRole(noteId, newRole, songId);
    setChangingRole(false);
    if (!result.ok) {
      setRoleError(result.error);
      return;
    }
    onRoleChanged(newRole);
  }

  const assigneeName = teamMembers.find((m) => m.id === teamMemberId)?.name;
  const roleChangeOptions: readonly string[] = [...ROLES, ...DIRECTION_GROUPS];

  return (
    <div className="rounded-lg bg-surface-muted p-2">
      <div className="flex items-start gap-2">
        {isPersisted ? (
          <Tooltip content="Wrong instrument or role? Change it here — the direction text stays the same.">
            <Select
              value={roleChangeOptions.includes(role) ? role : CUSTOM_ROLE_VALUE}
              onChange={(e) => {
                if (e.target.value === CUSTOM_ROLE_VALUE) return;
                changeRole(e.target.value);
              }}
              disabled={changingRole}
              className="mt-0.5 h-7 w-28 shrink-0 text-[11px] font-semibold uppercase tracking-wide"
              aria-label={`Change role from ${role}`}
            >
              {!roleChangeOptions.includes(role) && <option value={CUSTOM_ROLE_VALUE}>{role}</option>}
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
            </Select>
          </Tooltip>
        ) : (
          <span className="mt-1.5 w-28 shrink-0 label-caps">
            {role}
          </span>
        )}
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={() => save()}
          rows={1}
          className="min-h-0 bg-surface py-1.5 text-sm"
          placeholder={directionPlaceholder(role)}
        />
        <button
          type="button"
          onClick={() => save()}
          className="mt-1.5 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={`Save ${role} instruction`}
        >
          <Tooltip content="Save this direction">
            <Save className="h-4 w-4" />
          </Tooltip>
        </button>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1.5 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Assignee and visibility"
        >
          <Tooltip content="Aim this at one specific person, and choose who can see it">
            <Settings2 className="h-4 w-4" />
          </Tooltip>
        </button>
        <button
          onClick={async () => {
            await upsertRoleNote(sectionId, role, "", songId, { teamMemberId: teamMemberId || null });
            onRemoved();
          }}
          className="mt-1.5 shrink-0 text-muted-foreground hover:text-danger"
          aria-label={`Remove ${role} instruction`}
        >
          <Tooltip content="Remove this direction">
            <X className="h-4 w-4" />
          </Tooltip>
        </button>
      </div>
      <SaveStatus state={status} className="ml-[7.5rem] mt-1" />
      {roleError && <p className="ml-[7.5rem] mt-1 text-xs text-danger">{roleError}</p>}
      {expanded && (
        <div className="mt-2 flex flex-wrap items-center gap-2 pl-[7.5rem] text-xs">
          <span className="text-muted-foreground">For:</span>
          <Select
            value={teamMemberId}
            onChange={(e) => {
              const next = e.target.value;
              setTeamMemberId(next);
              save({ teamMemberId: next || null });
            }}
            className="h-7 w-32 text-xs"
          >
            <option value="">Anyone in {role}</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
          <span className="text-muted-foreground">Visible to:</span>
          <Select
            value={visibility}
            onChange={(e) => {
              const next = e.target.value as "TEAM" | "ROLE" | "PERSON";
              setVisibility(next);
              save({ visibility: next });
            }}
            className="h-7 w-28 text-xs"
          >
            <option value="TEAM">Everyone</option>
            <option value="ROLE">{role} only</option>
            <option value="PERSON">{assigneeName ?? "Assignee"} only</option>
          </Select>
        </div>
      )}
    </div>
  );
}
