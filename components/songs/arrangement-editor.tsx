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
import { GripVertical, Plus, Trash2, X, FileText, Copy, Settings2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { ROLES } from "@/lib/songs/constants";
import {
  addSection,
  deleteSection,
  duplicateSection,
  renameSection,
  reorderSections,
  updateSectionLyrics,
  updateSectionRepeatCount,
  upsertRoleNote,
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
  lyricsChords: string | null;
  roleNotes: RoleNote[];
};
type TeamMemberOption = { id: string; name: string; role: string };

export function ArrangementEditor({
  songId,
  initialSections,
  teamMembers,
}: {
  songId: string;
  initialSections: Section[];
  teamMembers: TeamMemberOption[];
}) {
  const [sections, setSections] = useState(initialSections);
  const [syncedSections, setSyncedSections] = useState(initialSections);
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

  return (
    <div className="space-y-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {sections.map((section) => (
              <SectionCard
                key={section.id}
                section={section}
                songId={songId}
                teamMembers={teamMembers}
                onDeleted={() => {
                  setSections((prev) => prev.filter((s) => s.id !== section.id));
                  router.refresh();
                }}
                onDuplicated={() => router.refresh()}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex gap-2">
        <Input
          value={newSectionLabel}
          onChange={(e) => setNewSectionLabel(e.target.value)}
          placeholder="Add section (e.g. Intro, Free Worship, Praise Break)"
        />
        <Button
          type="button"
          variant="secondary"
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
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

function SectionCard({
  section,
  songId,
  teamMembers,
  onDeleted,
  onDuplicated,
}: {
  section: Section;
  songId: string;
  teamMembers: TeamMemberOption[];
  onDeleted: () => void;
  onDuplicated: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });
  const [label, setLabel] = useState(section.label);
  const [repeatCount, setRepeatCount] = useState(section.repeatCount ?? 1);
  const [roleNotes, setRoleNotes] = useState(section.roleNotes);
  const [addingRole, setAddingRole] = useState(false);
  const [newRole, setNewRole] = useState<string>(ROLES[0]);
  const [error, setError] = useState<string | null>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const usedRoles = new Set(roleNotes.map((n) => n.role));
  const availableRoles = ROLES.filter((r) => !usedRoles.has(r));

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <button
            {...attributes}
            {...listeners}
            className="mt-1.5 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
            aria-label="Drag to reorder section"
          >
            <GripVertical className="h-5 w-5" />
          </button>
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  onBlur={async () => {
                    const result = await renameSection(section.id, label);
                    if (!result.ok) setError(result.error);
                  }}
                  className="h-8 max-w-[11rem] font-semibold"
                />
                <span className="text-xs text-muted-foreground">×</span>
                <Input
                  type="number"
                  min={1}
                  value={repeatCount}
                  onChange={(e) => setRepeatCount(Number(e.target.value) || 1)}
                  onBlur={async () => {
                    const result = await updateSectionRepeatCount(section.id, repeatCount);
                    if (!result.ok) setError(result.error);
                  }}
                  className="h-8 w-14 text-center"
                  aria-label="Repeat count"
                />
              </div>
              <div className="flex items-center gap-1">
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
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-muted"
                  aria-label="Duplicate section"
                >
                  <Copy className="h-4 w-4" />
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
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger"
                  aria-label="Delete section"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <LyricsChordsBlock
              sectionId={section.id}
              initialContent={section.lyricsChords ?? ""}
            />

            <div className="space-y-2">
              {roleNotes.map((note) => (
                <RoleNoteRow
                  key={note.role}
                  songId={songId}
                  sectionId={section.id}
                  role={note.role}
                  initialContent={note.content}
                  initialTeamMemberId={note.teamMemberId}
                  initialVisibility={note.visibility}
                  teamMembers={teamMembers}
                  onRemoved={() =>
                    setRoleNotes((prev) => prev.filter((n) => n.role !== note.role))
                  }
                />
              ))}
            </div>

            {addingRole ? (
              <div className="flex items-center gap-2">
                <Select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="h-8 w-40 text-sm"
                >
                  {availableRoles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setRoleNotes((prev) => [
                      ...prev,
                      { id: `new-${newRole}`, role: newRole, content: "", teamMemberId: null, visibility: "TEAM" },
                    ]);
                    setAddingRole(false);
                  }}
                >
                  Add
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setAddingRole(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              availableRoles.length > 0 && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setAddingRole(true)}>
                  <Plus className="h-3.5 w-3.5" /> Add direction
                </Button>
              )
            )}
            {error && <p className="text-sm text-danger">{error}</p>}
          </div>
        </div>
      </Card>
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

  if (!expanded) {
    return (
      <Button type="button" size="sm" variant="ghost" onClick={() => setExpanded(true)}>
        <FileText className="h-3.5 w-3.5" /> Add lyrics &amp; chords
      </Button>
    );
  }

  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <FileText className="h-3.5 w-3.5" /> Lyrics &amp; chords
      </label>
      <p className="text-xs text-muted-foreground">
        Put chords on their own line above the words they go with — the Chart page can then show
        lyrics-only (for singers), chords-only, or both, from this one field.
      </p>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={() => updateSectionLyrics(sectionId, content)}
        rows={Math.min(12, Math.max(3, content.split("\n").length))}
        className="font-mono text-xs leading-relaxed whitespace-pre"
        placeholder={"G           D\nAmazing grace, how sweet the sound"}
      />
    </div>
  );
}

function RoleNoteRow({
  songId,
  sectionId,
  role,
  initialContent,
  initialTeamMemberId,
  initialVisibility,
  teamMembers,
  onRemoved,
}: {
  songId: string;
  sectionId: string;
  role: string;
  initialContent: string;
  initialTeamMemberId: string | null;
  initialVisibility: "TEAM" | "ROLE" | "PERSON";
  teamMembers: TeamMemberOption[];
  onRemoved: () => void;
}) {
  const [content, setContent] = useState(initialContent);
  const [teamMemberId, setTeamMemberId] = useState(initialTeamMemberId ?? "");
  const [visibility, setVisibility] = useState(initialVisibility);
  const [expanded, setExpanded] = useState(false);

  async function save(overrides?: { teamMemberId?: string | null; visibility?: "TEAM" | "ROLE" | "PERSON" }) {
    await upsertRoleNote(sectionId, role, content, songId, {
      teamMemberId: overrides?.teamMemberId !== undefined ? overrides.teamMemberId : teamMemberId || null,
      visibility: overrides?.visibility ?? visibility,
    });
  }

  const assigneeName = teamMembers.find((m) => m.id === teamMemberId)?.name;

  return (
    <div className="rounded-lg bg-surface-muted p-2">
      <div className="flex items-start gap-2">
        <span className="mt-1.5 w-28 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {role}
        </span>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={() => save()}
          rows={1}
          className="min-h-0 py-1.5 text-sm"
          placeholder={`What should ${role} do in this section?`}
        />
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1.5 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Assignee and visibility"
        >
          <Settings2 className="h-4 w-4" />
        </button>
        <button
          onClick={async () => {
            await upsertRoleNote(sectionId, role, "", songId);
            onRemoved();
          }}
          className="mt-1.5 shrink-0 text-muted-foreground hover:text-danger"
          aria-label={`Remove ${role} instruction`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
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
