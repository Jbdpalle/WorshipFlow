"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { GripVertical, X, Trash2, Music2, BookOpenText, Star, ChevronDown, CheckCircle2, AlertCircle, Circle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ROLES, CHROMATIC_KEYS } from "@/lib/songs/constants";
import type { SongFlowStatus } from "@/lib/songs/readiness";
import {
  reorderSetSongs,
  removeSongFromSet,
  updateSetSongDetails,
  assignMemberToSetSong,
  removeAssignment,
  updateSetMeta,
} from "@/lib/actions/sets";
import { cn } from "@/lib/utils/cn";
import { TransitionIndicator, type TransitionData } from "@/components/setlist/transition-indicator";

export type SetSongData = {
  id: string;
  order: number;
  overrideKey: string | null;
  song: {
    id: string;
    title: string;
    artist: string | null;
    key: string | null;
    bpm: number | null;
    energy: string | null;
  };
  songFlowStatus: SongFlowStatus;
  assignments: { id: string; role: string; teamMember: { id: string; name: string } }[];
  transitionFrom: TransitionData;
};

type TeamMemberOption = { id: string; name: string; role: string };

const FLOW_STATUS: Record<SongFlowStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  ready: { label: "Song Flow ready", icon: CheckCircle2, className: "text-success" },
  needs_work: { label: "Song Flow needs work", icon: AlertCircle, className: "text-accent" },
  not_started: { label: "Song Flow not started", icon: Circle, className: "text-muted-foreground" },
};

export function SetlistBoard({
  setId,
  initialSongs,
  teamMembers,
  anchorSongId,
}: {
  setId: string;
  initialSongs: SetSongData[];
  teamMembers: TeamMemberOption[];
  anchorSongId: string | null;
}) {
  const [items, setItems] = useState(initialSongs);
  const [syncedSongs, setSyncedSongs] = useState(initialSongs);
  const router = useRouter();

  // Adjust local state during render when the server gives us fresh data,
  // instead of in an effect (see https://react.dev/learn/you-might-not-need-an-effect).
  if (initialSongs !== syncedSongs) {
    setSyncedSongs(initialSongs);
    setItems(initialSongs);
  }
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.findIndex((i) => i.id === active.id);
      const newIndex = prev.findIndex((i) => i.id === over.id);
      const next = arrayMove(prev, oldIndex, newIndex);
      reorderSetSongs(setId, next.map((s) => s.id));
      return next;
    });
  }

  if (items.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
        <Music2 className="h-8 w-8" />
        <p>No songs in this set yet. Add songs from the suggestions or your library below.</p>
      </Card>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {items.map((item, index) => (
            <div key={item.id} className="space-y-1">
              <SetSongCard
                setId={setId}
                item={item}
                index={index}
                teamMembers={teamMembers}
                isAnchor={anchorSongId === item.song.id}
                onRemoved={() => {
                  setItems((prev) => prev.filter((i) => i.id !== item.id));
                  router.refresh();
                }}
              />
              {index < items.length - 1 && (
                <div className="px-2">
                  <TransitionIndicator
                    setId={setId}
                    fromSetSongId={item.id}
                    toSetSongId={items[index + 1].id}
                    transition={item.transitionFrom}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SetSongCard({
  setId,
  item,
  index,
  teamMembers,
  isAnchor,
  onRemoved,
}: {
  setId: string;
  item: SetSongData;
  index: number;
  teamMembers: TeamMemberOption[];
  isAnchor: boolean;
  onRemoved: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const [overrideKey, setOverrideKey] = useState(item.overrideKey);
  const [assignRole, setAssignRole] = useState<string>(ROLES[0]);
  const [assignMember, setAssignMember] = useState(teamMembers[0]?.id ?? "");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function showErrorIfAny(result: { ok: boolean; error?: string }) {
    if (!result.ok) setError(result.error ?? "Something went wrong.");
    return result.ok;
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const flow = FLOW_STATUS[item.songFlowStatus];
  const FlowIcon = flow.icon;

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <button
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-5 w-5" />
          </button>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <Link href={`/songs/${item.song.id}`} className="font-semibold hover:text-accent">
                    {item.song.title}
                  </Link>
                  <button
                    onClick={async () => {
                      setError(null);
                      showErrorIfAny(
                        await updateSetMeta(setId, { anchorSongId: isAnchor ? null : item.song.id }),
                      );
                      router.refresh();
                    }}
                    aria-label={isAnchor ? "Remove as anchor song" : "Mark as anchor song"}
                    className={cn(
                      "rounded-md p-0.5",
                      isAnchor ? "text-accent" : "text-muted-foreground/40 hover:text-accent",
                    )}
                  >
                    <Star className="h-4 w-4" fill={isAnchor ? "currentColor" : "none"} />
                  </button>
                </div>
                {item.song.artist && (
                  <p className="text-xs text-muted-foreground">{item.song.artist}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {item.song.key && (
                  <div className="flex items-center gap-1">
                    <Select
                      value={overrideKey ?? item.song.key}
                      onChange={(e) =>
                        startTransition(async () => {
                          const next = e.target.value === item.song.key ? null : e.target.value;
                          setOverrideKey(next);
                          showErrorIfAny(await updateSetSongDetails(item.id, { overrideKey: next }));
                        })
                      }
                      className="h-7 w-16 text-xs"
                    >
                      {CHROMATIC_KEYS.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
                {item.song.bpm && <Badge variant="outline">{item.song.bpm} BPM</Badge>}
                <Link
                  href={`/songs/${item.song.id}/chart?setSongId=${item.id}`}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-muted"
                  aria-label="View chart"
                >
                  <BookOpenText className="h-4 w-4" />
                </Link>
                <button
                  onClick={async () => {
                    const result = await removeSongFromSet(item.id);
                    if (showErrorIfAny(result)) onRemoved();
                  }}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger"
                  aria-label="Remove from set"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/songs/${item.song.id}`}
                className={cn("flex items-center gap-1.5 text-xs font-medium hover:underline", flow.className)}
              >
                <FlowIcon className="h-3.5 w-3.5" /> {flow.label}
              </Link>
              <button
                type="button"
                onClick={() => setDetailsOpen((o) => !o)}
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", detailsOpen && "rotate-180")} />
                Details
              </button>
            </div>

            {detailsOpen && (
              <div className="space-y-3 border-t border-border pt-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Per-song assignment override (optional — the set&apos;s team covers most cases)
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.assignments.map((a) => (
                      <Badge key={a.id} variant="outline" className="gap-1 pr-1">
                        {a.role}: {a.teamMember.name}
                        <button
                          onClick={async () => {
                            if (showErrorIfAny(await removeAssignment(a.id))) router.refresh();
                          }}
                          className="ml-1 rounded-full hover:bg-danger/20"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {teamMembers.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Select
                          value={assignRole}
                          onChange={(e) => setAssignRole(e.target.value)}
                          className="h-7 w-32 text-xs"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </Select>
                        <Select
                          value={assignMember}
                          onChange={(e) => setAssignMember(e.target.value)}
                          className="h-7 w-28 text-xs"
                        >
                          {teamMembers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </Select>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-7 px-2 text-xs"
                          onClick={async () => {
                            if (!assignMember) return;
                            if (showErrorIfAny(await assignMemberToSetSong(item.id, assignMember, assignRole))) {
                              router.refresh();
                            }
                          }}
                        >
                          Assign
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {error && <p className="text-sm text-danger">{error}</p>}
          </div>
        </div>
      </Card>
    </div>
  );
}
