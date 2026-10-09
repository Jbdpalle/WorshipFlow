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
import { GripVertical, X, Trash2, Music2, BookOpenText, Star, ChevronDown, CheckCircle2, AlertCircle, Circle, PlayCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip } from "@/components/ui/tooltip";
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
    youtubeUrl: string | null;
    spotifyUrl: string | null;
  };
  songFlowStatus: SongFlowStatus;
  assignments: { id: string; role: string; teamMember: { id: string; name: string } }[];
  transitionFrom: TransitionData;
};

type TeamMemberOption = { id: string; name: string; role: string };

const FLOW_STATUS: Record<SongFlowStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  ready: { label: "Song Flow ready", icon: CheckCircle2, className: "text-success" },
  needs_work: { label: "Song Flow needs work", icon: AlertCircle, className: "text-warning" },
  not_started: { label: "Song Flow not started", icon: Circle, className: "text-muted-foreground" },
};

export function SetlistBoard({
  setId,
  initialSongs,
  teamMembers,
  anchorSongId,
  isLeader,
}: {
  setId: string;
  initialSongs: SetSongData[];
  teamMembers: TeamMemberOption[];
  anchorSongId: string | null;
  isLeader: boolean;
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
    if (!isLeader) return;
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
    <DndContext id="setlist-songs" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
                isLeader={isLeader}
                onRemoved={() => {
                  setItems((prev) => prev.filter((i) => i.id !== item.id));
                  router.refresh();
                }}
              />
              <div className="px-2">
                <TransitionIndicator
                  setId={setId}
                  fromSetSongId={item.id}
                  toSetSongId={items[index + 1]?.id ?? null}
                  transition={item.transitionFrom}
                  fromKey={item.overrideKey ?? item.song.key}
                  toKey={items[index + 1] ? (items[index + 1].overrideKey ?? items[index + 1].song.key) : null}
                />
              </div>
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
  isLeader,
  onRemoved,
}: {
  setId: string;
  item: SetSongData;
  index: number;
  teamMembers: TeamMemberOption[];
  isAnchor: boolean;
  isLeader: boolean;
  onRemoved: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const [overrideKey, setOverrideKey] = useState(item.overrideKey);
  const [assignRole, setAssignRole] = useState<string>(ROLES[0]);
  // Never pre-select a person — assignMemberToSetSong below already no-ops
  // on an empty value, but that guard only protects against a silent wrong
  // assignment if the dropdown actually starts empty, not pre-filled with
  // whoever sorts first in teamMembers.
  const [assignMember, setAssignMember] = useState("");
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
          {isLeader ? (
            <button
              {...attributes}
              {...listeners}
              className="flex h-11 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground active:cursor-grabbing"
              aria-label="Drag to reorder"
            >
              <GripVertical className="h-5 w-5" />
            </button>
          ) : (
            <span className="mt-1 w-5 shrink-0" aria-hidden />
          )}

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <Link href={`/songs/${item.song.id}`} className="inline-flex min-h-11 items-center font-semibold hover:text-primary hover:underline">
                    {item.song.title}
                  </Link>
                  {isLeader ? (
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
                        "flex h-9 w-9 items-center justify-center rounded-md",
                        isAnchor ? "text-musical" : "text-muted-foreground hover:text-musical",
                      )}
                    >
                      <Tooltip content="The anchor song sets the theme suggestions for the rest of the set">
                        <Star className="h-4 w-4" fill={isAnchor ? "currentColor" : "none"} />
                      </Tooltip>
                    </button>
                  ) : (
                    isAnchor && (
                      <Tooltip content="This service's anchor song">
                        <Star className="h-4 w-4 text-musical" fill="currentColor" />
                      </Tooltip>
                    )
                  )}
                </div>
                {item.song.artist && (
                  <p className="text-xs text-muted-foreground">{item.song.artist}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {item.song.key && isLeader && (
                  <div className="flex items-center gap-1">
                    <Tooltip content="Key for this service only — the song's own key elsewhere is unchanged">
                      <Select
                        value={overrideKey ?? item.song.key}
                        onChange={(e) =>
                          startTransition(async () => {
                            const next = e.target.value === item.song.key ? null : e.target.value;
                            setOverrideKey(next);
                            showErrorIfAny(await updateSetSongDetails(item.id, { overrideKey: next }));
                          })
                        }
                        className="h-10 w-20 text-sm"
                        aria-label="Key for this service"
                      >
                        {CHROMATIC_KEYS.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </Select>
                    </Tooltip>
                  </div>
                )}
                {item.song.key && !isLeader && (
                  <Badge variant="outline">Key {overrideKey ?? item.song.key}</Badge>
                )}
                {item.song.bpm && <Badge variant="outline">{item.song.bpm} BPM</Badge>}
                {item.song.youtubeUrl && (
                  <a
                    href={item.song.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-muted"
                    aria-label="Listen on YouTube"
                  >
                    <Tooltip content="Listen to the reference version on YouTube">
                      <PlayCircle className="h-4 w-4" />
                    </Tooltip>
                  </a>
                )}
                {item.song.spotifyUrl && (
                  <a
                    href={item.song.spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted"
                    aria-label="Listen on Spotify"
                  >
                    <Tooltip content="Listen to the reference version on Spotify">
                      <Music2 className="h-4 w-4" />
                    </Tooltip>
                  </a>
                )}
                <Link
                  href={`/songs/${item.song.id}/chart?setSongId=${item.id}`}
                  className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted"
                  aria-label="View chart"
                >
                  <Tooltip content="Open the musician's chart — lyrics and chords, large text">
                    <BookOpenText className="h-4 w-4" />
                  </Tooltip>
                </Link>
                {isLeader && (
                  <button
                    onClick={async () => {
                      const result = await removeSongFromSet(item.id);
                      if (showErrorIfAny(result)) onRemoved();
                    }}
                    className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-danger/10 hover:text-danger"
                    aria-label="Remove from set"
                  >
                    <Tooltip content="Remove this song from the set">
                      <Trash2 className="h-4 w-4" />
                    </Tooltip>
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/songs/${item.song.id}`}
                className={cn("flex min-h-11 items-center gap-1.5 text-sm font-semibold hover:underline", flow.className)}
              >
                <FlowIcon className="h-3.5 w-3.5" /> {flow.label}
              </Link>
              <button
                type="button"
                onClick={() => setDetailsOpen((o) => !o)}
                className="flex min-h-11 items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
                aria-expanded={detailsOpen}
              >
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", detailsOpen && "rotate-180")} />
                Details
              </button>
            </div>

            {detailsOpen && (
              <div className="space-y-3 border-t border-border pt-3">
                <div className="space-y-2">
                  <p className="label-caps">Per-song assignment override</p>
                  <p className="text-sm text-muted-foreground">
                    Optional. The set&apos;s team covers most cases.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {item.assignments.map((a) =>
                      isLeader ? (
                        <div
                          key={a.id}
                          className="flex min-h-11 max-w-full flex-wrap items-center gap-2 rounded-lg border border-border bg-surface pl-3 pr-1"
                        >
                          <span className="text-sm font-bold">{a.teamMember.name}</span>
                          <select
                            value={a.role}
                            aria-label={`Change ${a.teamMember.name}'s role for this song`}
                            title="Wrong instrument? Change it here instead of removing and re-adding."
                            className="h-9 rounded-md bg-surface-muted px-2 text-sm font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                            onChange={async (e) => {
                              const newRole = e.target.value;
                              if (newRole === a.role) return;
                              if (showErrorIfAny(await assignMemberToSetSong(item.id, a.teamMember.id, newRole))) {
                                router.refresh();
                              }
                            }}
                          >
                            {!ROLES.includes(a.role as (typeof ROLES)[number]) && (
                              <option value={a.role}>{a.role}</option>
                            )}
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                          <IconButton
                            label={`Remove ${a.teamMember.name} from this song`}
                            tone="danger"
                            onClick={async () => {
                              if (showErrorIfAny(await removeAssignment(a.id))) router.refresh();
                            }}
                          >
                            <X className="h-4 w-4" />
                          </IconButton>
                        </div>
                      ) : (
                        <Badge key={a.id} variant="outline">
                          {a.role}: {a.teamMember.name}
                        </Badge>
                      ),
                    )}
                    {isLeader && teamMembers.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <Select
                          value={assignRole}
                          onChange={(e) => setAssignRole(e.target.value)}
                          aria-label="Role for this song"
                          className="h-11 w-44 text-sm"
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
                          aria-label="Person for this song"
                          className="h-11 w-44 text-sm"
                        >
                          <option value="" disabled>
                            Select…
                          </option>
                          {teamMembers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </Select>
                        <Button
                          type="button"
                          variant="secondary"
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
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
