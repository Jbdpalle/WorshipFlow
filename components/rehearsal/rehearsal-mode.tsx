"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Timer,
  FlaskConical,
  Radio,
  Wind,
  Megaphone,
  X,
  Pause,
  BarChart3,
  PlayCircle,
  MoreHorizontal,
  CheckCircle2,
  WifiOff,
  ArrowDown,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Metronome } from "@/components/metronome/metronome";
import { LyricsChordsView } from "@/components/songs/lyrics-chords-view";
import { LastTimeCallout } from "@/components/songs/last-time-callout";
import { DynamicIndicator } from "@/components/songs/dynamic-indicator";
import { SongFlowRibbon } from "@/components/songs/song-flow-ribbon";
import { ThemeToggleButton } from "@/components/layout/theme-toggle";
import { ROLES, REHEARSAL_CHECK_STATUSES } from "@/lib/songs/constants";
import { selectRoleNoteForViewer } from "@/lib/songs/role-notes";
import {
  startRehearsal,
  proposeArrangementChange,
  keepArrangementChange,
  discardArrangementChange,
  setLivePosition,
  getLivePosition,
  announceToTeam,
  recordSectionVisit,
} from "@/lib/actions/rehearsal";
import type { ActionResult } from "@/lib/actions/action-result";
import { finishPracticeSession, type PracticeSessionSummary } from "@/lib/actions/practice-sessions";
import { finishLiveSet } from "@/lib/actions/live-set";
import { cn } from "@/lib/utils/cn";
import { pickEffectiveRoles } from "@/lib/songs/assignment-resolver";
import { useAutoScrollIntoView } from "@/hooks/use-auto-scroll-into-view";
import { useDirectorShortcuts, loadShortcutMap, type DirectorAction } from "@/hooks/use-director-shortcuts";
import { ShortcutsPanel } from "@/components/rehearsal/shortcuts-panel";
import { shouldAutoFollow, computeConnectionState, type LiveCursor, type ConnectionState } from "@/lib/songs/live-follow";
import { partTagsForRoles } from "@/lib/songs/arrangement-lanes";
import { QuickNote } from "@/components/rehearsal/quick-note";
import { NotesReview } from "@/components/rehearsal/notes-review";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { callOffline } from "@/lib/offline/outbox";
import { useSyncDownSnapshot } from "@/lib/offline/use-offline-sync";

type RoleNote = {
  id: string;
  role: string;
  content: string;
  teamMemberId: string | null;
  visibility: "TEAM" | "ROLE" | "PERSON";
};
type ArrangementChange = {
  id: string;
  role: string;
  proposedContent: string;
  previousContent: string | null;
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
  arrangementChanges: ArrangementChange[];
};
type ChangeEntry = { id: string; field: string; fromValue: string | null; toValue: string | null };
export type SetSongData = {
  id: string;
  order: number;
  purpose: string | null;
  overrideKey: string | null;
  assignments: { teamMemberId: string | null; role: string }[];
  // The transition LEAVING this song, toward whatever song is next in the
  // set — null if none was configured in the Setlist Builder. Reused as-is
  // here; this is not a second transition model.
  transitionFrom: { id: string; type: string; direction: string | null; roleNotes: RoleNote[] } | null;
  song: {
    id: string;
    title: string;
    key: string | null;
    bpm: number | null;
    sections: Section[];
    rehearsals: { occurredAt: Date; notes: { id: string; content: string }[] }[];
    changeLogs: ChangeEntry[];
  };
};

const POLL_MS = 3500;

// Leader sees every role's every note (including everyone's individual
// PERSON-scoped ones) — a non-leader sees one row per role: their own
// PERSON-scoped note if they have one, else the shared one (which now
// includes the "Rest of the Band"/"Rest of the Vocals" catch-all when they
// have no note of their own — see selectRoleNoteForViewer), never both
// stacked for the same role.
function resolveInstructionsForSection(
  section: Section | undefined,
  isLeaderView: boolean,
  viewerTeamMemberId: string | null,
): RoleNote[] {
  if (!section) return [];
  if (isLeaderView) return section.roleNotes.filter((n) => n.content.trim());
  const roles = Array.from(new Set(section.roleNotes.map((n) => n.role)));
  return roles
    .map((role) => selectRoleNoteForViewer(section.roleNotes, role, viewerTeamMemberId))
    .filter((n): n is RoleNote => !!n && n.content.trim().length > 0);
}

export function RehearsalMode({
  setId,
  setTitle,
  setVision,
  songs,
  setTeamMembers,
  isLeaderView,
  viewerTeamMemberId,
  initialLiveSetSongId,
  initialLiveSectionId,
  mode,
  practiceSessionId,
  onFinished,
}: {
  setId: string;
  setTitle: string;
  // The set's overall vision (WorshipSet.notes), shown as a collapsed
  // "why this set" line so the team sees the purpose, not just the chart.
  setVision?: string | null;
  songs: SetSongData[];
  setTeamMembers: { teamMemberId: string; role: string }[];
  isLeaderView: boolean;
  viewerTeamMemberId: string | null;
  initialLiveSetSongId: string | null;
  initialLiveSectionId: string | null;
  // Undefined = the original, undecorated Director Mode (/rehearsal/[setId])
  // — no Finish control, behavior exactly as before. "practice"/"live" add
  // the matching Finish control, reusing this same engine rather than a
  // second one.
  mode?: "practice" | "live";
  practiceSessionId?: string | null;
  // Called after a successful Finish — the page decides where that goes
  // (e.g. the practice summary screen vs. back to the Live Set overview).
  onFinished?: (summary?: PracticeSessionSummary) => void;
}) {
  const router = useRouter();
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  // The default role(s) this viewer holds for the whole service — falls
  // back to here only when the current song has no per-song override (see
  // myRoles in SongRehearsalPanel below). Never falls back to account role.
  const viewerDefaultRoles = viewerTeamMemberId
    ? setTeamMembers.filter((m) => m.teamMemberId === viewerTeamMemberId).map((m) => m.role)
    : [];
  const initialSongIndex = Math.max(
    0,
    songs.findIndex((s) => s.id === initialLiveSetSongId),
  );
  const [songIndex, setSongIndex] = useState(initialSongIndex);
  const [followBanner, setFollowBanner] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const setSong = songs[songIndex];
  const activeSongRef = useRef<HTMLLIElement | null>(null);
  useAutoScrollIntoView(activeSongRef, setSong?.id ?? null);

  // Where the leader/MD last confirmed the live position is, and where THIS
  // viewer is reading. When they differ the viewer has deliberately browsed
  // away (a musician checking ahead) — we then show a "back to live" prompt
  // instead of yanking them mid-read. `focus` is the section a freshly
  // mounted song panel should open on (a follow or jump that also changed
  // song), since the panel for the new song doesn't exist yet to receive it.
  const [livePos, setLivePos] = useState<LiveCursor | null>(
    initialLiveSetSongId ? { setSongId: initialLiveSetSongId, sectionId: initialLiveSectionId } : null,
  );
  const [viewerSectionId, setViewerSectionId] = useState<string | null>(initialLiveSectionId);
  const [focus, setFocus] = useState<LiveCursor | null>(null);
  const viewerRef = useRef<LiveCursor>({ setSongId: setSong?.id ?? null, sectionId: initialLiveSectionId });
  useEffect(() => {
    viewerRef.current = { setSongId: setSong?.id ?? null, sectionId: viewerSectionId };
  }, [setSong?.id, viewerSectionId]);
  const livePosRef = useRef(livePos);
  useEffect(() => {
    livePosRef.current = livePos;
  }, [livePos]);

  // Hands-free reading: don't let the screen sleep while following.
  useWakeLock(true);

  // Mirrors the songs/directions/assignments this screen was just given
  // into IndexedDB, so a later offline visit to this exact set has
  // something real to fall back to (see lib/offline/). Only ever writes
  // when the data we have is actually fresh (i.e. we're online) — never
  // overwrites a good cached copy with something read from a stale,
  // service-worker-served page.
  useSyncDownSnapshot(`rehearsal:${setId}`, {
    setId,
    setTitle,
    songs,
    setTeamMembers,
    isLeaderView,
    viewerTeamMemberId,
  });

  // Every leader/MD cue (song switch, section move) goes through this so the
  // controller always knows whether it actually reached the shared state —
  // never a fire-and-forget call that leaves them believing it landed when
  // it didn't (see WORSHIPFLOW build spec §10: no false "synced" claims).
  //
  // Commands are serialized: while one is in flight the newest target is
  // remembered and sent once it lands, so rapid or duplicate taps can't
  // race each other or leave the shared position on an older tap. Each
  // write carries the position version this screen last saw, so if another
  // controller moved things first the server refuses it and this screen
  // adopts their position instead of overwriting it.
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "error" | "conflict">("synced");
  const lastTargetRef = useRef<{ setSongId: string; sectionId: string | null } | null>(null);
  const inFlightRef = useRef(false);
  const pendingRef = useRef<{ setSongId: string; sectionId: string | null } | null>(null);
  const versionRef = useRef<string | null | undefined>(undefined);
  const lastSeenRef = useRef<string | null>(null);
  // Who most recently moved the live position — visibility only, not a
  // lock (see lib/actions/rehearsal.ts's liveControllerName comment). Lets
  // everyone see who's currently directing when more than one leader-tier
  // account might be in Director Mode at once.
  const [controllerName, setControllerName] = useState<string | null>(null);
  // This device's own read of whether it's still actually receiving poll
  // updates — distinct from syncStatus above, which only reflects this
  // device's own last WRITE. See computeConnectionState's own comment.
  const [connectionState, setConnectionState] = useState<ConnectionState>("live");
  const lastPollSuccessAtRef = useRef<number | null>(null);

  const adoptPosition = useCallback(
    (position: { setSongId: string | null; sectionId: string | null }, forceFollow: boolean) => {
      if (!position.setSongId) return;
      const previous = livePosRef.current;
      const next = { setSongId: position.setSongId, sectionId: position.sectionId };
      livePosRef.current = next;
      setLivePos(next);
      const nextSongIndex = songs.findIndex((s) => s.id === next.setSongId);
      if (nextSongIndex === -1) return;
      if (!forceFollow && !shouldAutoFollow(isLeaderView, viewerRef.current, previous)) return;
      setFocus(next);
      setSongIndex((prev) => {
        // Only a viewer who ISN'T themselves the one who just wrote this
        // position needs the "moved" banner — the active controller's own
        // screen already changed synchronously and doesn't need telling.
        if (prev !== nextSongIndex && !isLeaderView) {
          const title = songs[nextSongIndex]?.song.title;
          setFollowBanner(title ? `Leader moved to ${title}` : "Leader moved to a different song");
        }
        return nextSongIndex;
      });
      window.dispatchEvent(new CustomEvent("worshipflow:live-section", { detail: { sectionId: next.sectionId } }));
    },
    [songs, isLeaderView],
  );

  const syncPosition = useCallback(
    async (nextSetSongId: string, sectionId: string | null): Promise<ActionResult> => {
      lastTargetRef.current = { setSongId: nextSetSongId, sectionId };
      if (inFlightRef.current) {
        pendingRef.current = { setSongId: nextSetSongId, sectionId };
        return { ok: true };
      }
      inFlightRef.current = true;
      setSyncStatus("syncing");
      let target: { setSongId: string; sectionId: string | null } | null = { setSongId: nextSetSongId, sectionId };
      let last: ActionResult = { ok: true };
      while (target) {
        const result = await setLivePosition(setId, target.setSongId, target.sectionId, versionRef.current);
        if (result.ok) {
          versionRef.current = result.data.updatedAt;
          lastSeenRef.current = result.data.updatedAt;
          const next = { setSongId: target.setSongId, sectionId: target.sectionId };
          livePosRef.current = next;
          setLivePos(next);
          setSyncStatus("synced");
          last = { ok: true };
        } else if (result.current) {
          // Another controller got there first — follow them.
          versionRef.current = result.current.updatedAt;
          lastSeenRef.current = result.current.updatedAt;
          adoptPosition(result.current, true);
          setControllerName(result.current.controllerName);
          setSyncStatus("conflict");
          pendingRef.current = null;
          last = { ok: false, error: result.error };
        } else {
          setSyncStatus("error");
          last = { ok: false, error: result.error };
        }
        target = pendingRef.current;
        pendingRef.current = null;
      }
      inFlightRef.current = false;
      return last;
    },
    [setId, adoptPosition],
  );
  const retrySync = useCallback(() => {
    if (!lastTargetRef.current) return;
    syncPosition(lastTargetRef.current.setSongId, lastTargetRef.current.sectionId);
  }, [syncPosition]);

  // Loaded lazily on first client render only — loadShortcutMap falls back
  // to defaults by itself when localStorage isn't available (SSR pass).
  const [shortcutMap, setShortcutMap] = useState(loadShortcutMap);

  // Every viewer polls the live position (and any announcement) and follows
  // it — this is polling-based near-real-time, not push/WebSocket (no
  // realtime provider is configured in this environment). See
  // WORSHIPFLOW_SONG_FLOW_AUDIT.md section 5.
  //
  // Polling only reads. The position changes solely when a leader-role user
  // writes it (setLivePosition) — never because time passed — so repeated
  // choruses, holds and spontaneous worship stay under the leader's control.
  //
  // This includes leader-role viewers too, not just plain members: with a
  // second authorized controller (an MD driving from their own device), the
  // worship leader's OWN mounted screen must still follow along even though
  // it isn't the one issuing commands right now.
  const lastAnnouncementRef = useRef<string | null>(null);
  useEffect(() => {
    if (lastPollSuccessAtRef.current === null) lastPollSuccessAtRef.current = Date.now();
    async function pollOnce() {
      if (document.visibilityState === "hidden") return;
      // A dropped connection fails the fetch itself, not just the action's
      // own { ok: false } result (e.g. offline, DNS failure, timeout) — both
      // cases must count toward connectionState, or a real network outage
      // would throw here and silently stop updating the banner at all.
      let result: Awaited<ReturnType<typeof getLivePosition>>;
      try {
        result = await getLivePosition(setId);
      } catch {
        result = { ok: false, error: "Network request failed." };
      }
      if (!result.ok) {
        const since = lastPollSuccessAtRef.current ?? Date.now();
        setConnectionState(computeConnectionState(Date.now() - since, POLL_MS));
        return;
      }
      lastPollSuccessAtRef.current = Date.now();
      setConnectionState("live");
      setControllerName(result.data.controllerName);

      if (result.data.announcementAt && result.data.announcementAt !== lastAnnouncementRef.current) {
        lastAnnouncementRef.current = result.data.announcementAt;
        if (result.data.announcement) setAnnouncement(result.data.announcement);
      }

      // Track the latest version even before anyone has moved, so this
      // screen's first write is checked against what it actually saw.
      if (!inFlightRef.current) versionRef.current = result.data.updatedAt;
      if (!result.data.setSongId) return;
      if (result.data.updatedAt === lastSeenRef.current) return;
      lastSeenRef.current = result.data.updatedAt;
      adoptPosition(result.data, false);
    }
    const interval = setInterval(pollOnce, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") pollOnce();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [setId, adoptPosition]);

  if (!setSong) {
    return <p className="text-muted-foreground">This set has no songs yet.</p>;
  }

  const liveSongIndex = livePos?.setSongId ? songs.findIndex((s) => s.id === livePos.setSongId) : -1;
  const liveSong = liveSongIndex >= 0 ? songs[liveSongIndex] : null;
  const liveSection = liveSong?.song.sections.find((s) => s.id === livePos?.sectionId);
  const offLive =
    !isLeaderView &&
    !!liveSong &&
    (setSong.id !== liveSong.id || (!!livePos?.sectionId && viewerSectionId !== livePos.sectionId));

  function jumpToLive() {
    if (!livePos?.setSongId) return;
    const idx = songs.findIndex((s) => s.id === livePos.setSongId);
    if (idx === -1) return;
    setFocus(livePos);
    setSongIndex(idx);
    setFollowBanner(null);
    window.dispatchEvent(new CustomEvent("worshipflow:live-section", { detail: { sectionId: livePos.sectionId } }));
  }

  return (
    <div className="space-y-3">
      {isLeaderView ? (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl bg-primary px-3 py-1.5 text-primary-foreground">
          <p className="flex items-center gap-2 text-sm font-bold">
            <Radio className="h-4 w-4 animate-pulse" aria-hidden />
            {mode === "live" ? "Live" : mode === "practice" ? "Practice" : "Director mode"}
          </p>
          <p className="hidden text-sm font-medium lg:block">Everyone follows your position and cues.</p>
          {connectionState === "live" && controllerName && (
            <p className="text-xs font-medium opacity-80">Directed by {controllerName}</p>
          )}
          <SyncIndicator status={syncStatus} onRetry={retrySync} />
          <ShortcutsPanel map={shortcutMap} onChange={setShortcutMap} />
          {mode && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={finishing}
              disabled={finishing}
              onClick={async () => {
                setFinishing(true);
                setFinishError(null);
                if (mode === "practice" && practiceSessionId) {
                  const result = await finishPracticeSession(practiceSessionId);
                  setFinishing(false);
                  if (!result.ok) {
                    setFinishError(result.error);
                    return;
                  }
                  onFinished?.(result.data);
                } else {
                  const result = await finishLiveSet(setId);
                  setFinishing(false);
                  if (!result.ok) {
                    setFinishError(result.error);
                    return;
                  }
                  onFinished?.();
                }
                router.refresh();
              }}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              {mode === "practice" ? "Finish Practice" : "Finish Live Set"}
            </Button>
          )}
        </div>
      ) : null}
      {finishError && (
        <p role="alert" className="text-sm text-danger">
          {finishError}
        </p>
      )}
      {connectionState !== "live" && (
        <p
          role="status"
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
            connectionState === "disconnected" ? "bg-danger/15 text-danger" : "bg-warning/15 text-warning",
          )}
        >
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
          {connectionState === "disconnected"
            ? "Disconnected — this screen may be showing an outdated position. Reconnecting…"
            : "Catching up…"}
        </p>
      )}
      {!isLeaderView && (
        <>
          {announcement && (
            <div role="alert" className="flex items-center gap-3 rounded-xl bg-primary px-4 py-3 text-primary-foreground">
              <Megaphone className="h-6 w-6 shrink-0" aria-hidden />
              <p className="flex-1 text-xl font-extrabold">{announcement}</p>
              <button
                onClick={() => setAnnouncement(null)}
                className="tap-target flex w-11 shrink-0 items-center justify-center rounded-lg hover:bg-black/10"
                aria-label="Dismiss announcement"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
          {offLive ? (
            <button
              type="button"
              onClick={jumpToLive}
              className="tap-target sticky top-2 z-20 flex w-full items-center justify-between gap-2 rounded-xl border border-info bg-surface-elevated px-4 py-2 text-left text-sm font-semibold text-info shadow-md hover:bg-info/10"
            >
              <span className="min-w-0 truncate">
                Leader is on {liveSong?.song.title}
                {liveSection ? ` · ${liveSection.label}` : ""}
              </span>
              <span className="shrink-0 whitespace-nowrap">Back to live →</span>
            </button>
          ) : (
            <p role="status" className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
              {followBanner ?? "Following the leader — no need to tap"}
              {connectionState === "live" && controllerName && ` · Directed by ${controllerName}`}
            </p>
          )}
        </>
      )}

      {setVision?.trim() && (
        <details className="rounded-xl border border-border bg-surface px-3 py-1.5">
          <summary className="tap-target flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-muted-foreground">
            <Compass className="h-4 w-4" aria-hidden /> Why this set
          </summary>
          <p className="whitespace-pre-line pb-2 text-sm">{setVision}</p>
        </details>
      )}

      <nav aria-label="Set order">
        <ol className="flex gap-2 overflow-x-auto pb-1">
          {songs.map((s, i) => (
            <li key={s.id} ref={i === songIndex ? activeSongRef : undefined} className="shrink-0">
              <button
                onClick={() => {
                  setSongIndex(i);
                  setFocus(null);
                  if (isLeaderView) {
                    const firstSectionId = s.song.sections[0]?.id ?? null;
                    syncPosition(s.id, firstSectionId);
                    // Tapping the song you're already on restarts it from the
                    // top; the panel isn't remounted, so tell it to follow.
                    window.dispatchEvent(
                      new CustomEvent("worshipflow:live-section", { detail: { sectionId: firstSectionId } }),
                    );
                  }
                }}
                aria-current={i === songIndex ? "true" : undefined}
                className={cn(
                  "tap-target rounded-full px-4 text-sm font-semibold transition-colors duration-[var(--duration-fast)]",
                  i === songIndex
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-muted text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="tnum">{String(i + 1).padStart(2, "0")}</span> {s.song.title}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <SongRehearsalPanel
        key={setSong.id}
        setId={setId}
        setTitle={setTitle}
        setSong={setSong}
        viewerDefaultRoles={viewerDefaultRoles}
        isLeaderView={isLeaderView}
        viewerTeamMemberId={viewerTeamMemberId}
        initialLiveSectionId={
          focus?.setSongId === setSong.id
            ? focus.sectionId
            : setSong.id === initialLiveSetSongId
              ? initialLiveSectionId
              : null
        }
        practiceSessionId={practiceSessionId ?? null}
        onPositionChange={syncPosition}
        onViewerSection={setViewerSectionId}
        nextSong={songs[songIndex + 1] ?? null}
        shortcutMap={shortcutMap}
      />
    </div>
  );
}

function SongRehearsalPanel({
  setId,
  setTitle,
  setSong,
  nextSong,
  viewerDefaultRoles,
  isLeaderView,
  viewerTeamMemberId,
  initialLiveSectionId,
  practiceSessionId,
  onPositionChange,
  onViewerSection,
  shortcutMap,
}: {
  setId: string;
  setTitle: string;
  setSong: SetSongData;
  nextSong: SetSongData | null;
  viewerDefaultRoles: string[];
  isLeaderView: boolean;
  viewerTeamMemberId: string | null;
  initialLiveSectionId: string | null;
  practiceSessionId: string | null;
  onPositionChange: (setSongId: string, sectionId: string | null) => Promise<ActionResult>;
  onViewerSection: (sectionId: string | null) => void;
  shortcutMap: Record<DirectorAction, string>;
}) {
  const router = useRouter();
  const song = setSong.song;
  const sections = song.sections;

  const initialSectionIndex = Math.max(
    0,
    sections.findIndex((s) => s.id === initialLiveSectionId),
  );
  const [sectionIndex, setSectionIndex] = useState(initialSectionIndex);
  const [rehearsalId, setRehearsalId] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [notesRefresh, setNotesRefresh] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    startRehearsal(song.id, setSong.id, song.bpm ?? undefined, practiceSessionId).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setRehearsalId(result.data.id);
      } else {
        setError(result.error);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song.id, setSong.id, practiceSessionId]);

  // Follow section moves within the current song. The parent only dispatches
  // this when this viewer was already on the live position (or asked to jump
  // back to it), so a musician who is reading another section isn't pulled
  // away. Runs for every viewer, leader-role included, so a second
  // controller's moves reach the primary leader's screen too.
  useEffect(() => {
    function onLiveSection(e: Event) {
      const sectionId = (e as CustomEvent<{ sectionId: string | null }>).detail?.sectionId;
      if (!sectionId) return;
      const idx = sections.findIndex((s) => s.id === sectionId);
      if (idx !== -1) setSectionIndex(idx);
    }
    window.addEventListener("worshipflow:live-section", onLiveSection);
    return () => window.removeEventListener("worshipflow:live-section", onLiveSection);
  }, [sections]);

  async function goTo(nextIndex: number) {
    setSectionIndex(nextIndex);
    if (isLeaderView) {
      const sectionId = sections[nextIndex]?.id ?? null;
      await onPositionChange(setSong.id, sectionId);
      if (practiceSessionId && rehearsalId && sectionId) {
        recordSectionVisit(rehearsalId, sectionId);
      }
    }
  }

  const current = sections[sectionIndex];
  const next = sections[sectionIndex + 1];

  useEffect(() => {
    onViewerSection(current?.id ?? null);
  }, [current?.id, onViewerSection]);

  useDirectorShortcuts(
    isLeaderView,
    shortcutMap,
    useMemo(
      () => ({
        goNext: () => goTo(Math.min(sections.length - 1, sectionIndex + 1)),
        previous: () => goTo(Math.max(0, sectionIndex - 1)),
        repeat: () => announceToTeam(setId, "Repeat"),
        hold: () => announceToTeam(setId, "Hold"),
        build: () => announceToTeam(setId, "Build"),
        drop: () => announceToTeam(setId, "Drop"),
        wait: () => announceToTeam(setId, "Wait"),
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [setId, sectionIndex, sections.length],
    ),
  );

  // goTo() only fires on a move — the section already current when this
  // song's Rehearsal row is created (the very first one, or wherever a
  // resumed session left off) needs recording too.
  useEffect(() => {
    if (isLeaderView && practiceSessionId && rehearsalId && current?.id) {
      recordSectionVisit(rehearsalId, current.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLeaderView, practiceSessionId, rehearsalId]);

  const instructionsByRole = useMemo(
    () => resolveInstructionsForSection(current, isLeaderView, viewerTeamMemberId),
    [current, isLeaderView, viewerTeamMemberId],
  );
  const nextInstructionsByRole = useMemo(
    () => resolveInstructionsForSection(next, isLeaderView, viewerTeamMemberId),
    [next, isLeaderView, viewerTeamMemberId],
  );

  // The viewing musician's own part(s) for this song, independent of the
  // generic "every role" list above — computed for every viewer, leader
  // included, since church-account tier (isLeaderView) and musical
  // assignment are different things: a Worship Leader who's also the
  // guitarist still has a guitar part to see. A per-song override wins if
  // one exists; otherwise falls back to their default role(s) for the
  // whole service — never to account role, and never guessed when neither
  // exists. A viewer can hold more than one role at once (e.g. Acoustic
  // Guitar + Lead Vocal), so this is a list, not a single value.
  const myRoles = pickEffectiveRoles(
    setSong.assignments.find((a) => a.teamMemberId === viewerTeamMemberId)?.role,
    viewerDefaultRoles,
  );
  const myPartNotes = current
    ? myRoles
        .map((role) => ({ role, note: selectRoleNoteForViewer(current.roleNotes, role, viewerTeamMemberId) }))
        .filter(({ note }) => note?.content.trim())
    : [];
  const nextMyPartNotes = next
    ? myRoles
        .map((role) => ({ role, note: selectRoleNoteForViewer(next.roleNotes, role, viewerTeamMemberId) }))
        .filter(({ note }) => note?.content.trim())
    : [];
  const isFreeform = !!current?.isFreeform;

  // When this musician comes in, drops out, or returns across the song —
  // shown on the flow ribbon so "when do I enter" is visible at a glance.
  const myPartTags = myRoles.length > 0 ? partTagsForRoles(sections, myRoles) : undefined;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <p className="label-caps truncate">{setTitle}</p>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{song.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(setSong.overrideKey ?? song.key) && (
            <Badge variant="musical" className="tnum px-3 py-1 text-sm">
              Key {setSong.overrideKey ?? song.key}
            </Badge>
          )}
          {song.bpm && (
            <Badge variant="musical" className="tnum px-3 py-1 text-sm">
              {song.bpm} BPM
            </Badge>
          )}
          <ThemeToggleButton />
        </div>
      </div>
      {setSong.purpose?.trim() && (
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Role in the set:</span> {setSong.purpose}
        </p>
      )}

      <details className="rounded-xl border border-border bg-musical-soft px-3 py-1">
        <summary className="tap-target flex cursor-pointer items-center text-sm font-semibold text-musical">
          Last time &amp; recent changes
        </summary>
        <div className="pb-2">
          <LastTimeCallout lastRehearsal={song.rehearsals[0] ?? null} recentChanges={song.changeLogs} />
        </div>
      </details>

      {sections.length === 0 ? (
        <p className="text-muted-foreground">This song has no arrangement yet.</p>
      ) : (
        <>
          <SongFlowRibbon
            sections={sections}
            selectedId={current?.id ?? null}
            partTags={myPartTags}
            onSelect={(id) => {
              const i = sections.findIndex((x) => x.id === id);
              if (i !== -1) goTo(i);
            }}
          />

          {/* Phone: now, my part, quick note, chart, next, then the rest.
              iPad landscape / laptop: now, part and chart on the left,
              next and tools on the right. */}
          <div className="grid gap-3 lg:grid-flow-dense lg:grid-cols-5 lg:items-start lg:gap-5">
            <section
              aria-label="Current section"
              className={cn(
                "rounded-2xl p-4 sm:p-6 lg:col-span-3",
                isFreeform
                  ? "border border-dashed border-border bg-surface-muted"
                  : "border-2 border-primary bg-surface",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.1em]",
                    isFreeform ? "text-muted-foreground" : "text-primary",
                  )}
                >
                  {isFreeform && <Wind className="h-3.5 w-3.5" aria-hidden />}
                  {isFreeform ? "Spontaneous: follow as led" : isLeaderView ? "Current" : "Now"}
                </p>
                {current?.dynamics && <DynamicIndicator dynamics={current.dynamics} />}
              </div>
              <h2 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-5xl">
                {current?.label}
                {!isFreeform && current?.repeatCount && current.repeatCount > 1 ? ` ×${current.repeatCount}` : ""}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant={isLeaderView ? "secondary" : "ghost"}
                  size="sm"
                  disabled={sectionIndex === 0}
                  onClick={() => goTo(Math.max(0, sectionIndex - 1))}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden /> {isLeaderView ? "Previous" : "Look back"}
                </Button>
                {!isLeaderView && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={sectionIndex >= sections.length - 1}
                    onClick={() => goTo(Math.min(sections.length - 1, sectionIndex + 1))}
                  >
                    Look ahead <ChevronRight className="h-4 w-4" aria-hidden />
                  </Button>
                )}
              </div>
            </section>

            {myRoles.length > 0 && (
              <section aria-label="My part" className="rounded-2xl border border-border bg-musical-soft p-4 sm:p-5 lg:col-span-3">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-musical">
                  My part · {myRoles.join(" + ")}
                </p>
                {myPartNotes.length > 0 ? (
                  <div className="mt-1 space-y-1.5">
                    {myPartNotes.map(({ role, note }) => (
                      <p key={role} className="text-xl font-semibold leading-snug sm:text-2xl">
                        {myRoles.length > 1 && <span className="text-musical">{role}: </span>}
                        {note?.content}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-xl font-semibold leading-snug sm:text-2xl">
                    Nothing specific for you here. Play it as written.
                  </p>
                )}
              </section>
            )}

            <div className="lg:col-span-3">
              <QuickNote
                rehearsalId={rehearsalId}
                sectionId={current?.id ?? null}
                sectionLabel={current?.label ?? null}
              />
            </div>

            {current?.lyricsChords?.trim() && (
              <section aria-label="Lyrics and chords" className="space-y-1 rounded-xl bg-surface-muted p-4 lg:col-span-3">
                <h3 className="label-caps">Lyrics &amp; chords</h3>
                <LyricsChordsView content={current.lyricsChords} size="md" />
              </section>
            )}

            <section
              aria-label="Next section"
              className="rounded-2xl border border-border bg-surface-muted/60 p-4 sm:p-5 lg:col-span-2 lg:col-start-4 lg:row-start-1"
            >
              <p className="label-caps">Next</p>
              {next ? (
                <>
                  <h3 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">
                    {next.label}
                    {next.repeatCount && next.repeatCount > 1 ? ` ×${next.repeatCount}` : ""}
                  </h3>
                  {next.dynamics && <DynamicIndicator dynamics={next.dynamics} className="mt-2" />}
                  {myRoles.length > 0 && (
                    <p className="mt-2 text-base">
                      <span className="font-bold text-musical">Me: </span>
                      {nextMyPartNotes.length > 0
                        ? nextMyPartNotes.map(({ role, note }) => (myRoles.length > 1 ? `${role}: ${note?.content}` : note?.content)).join(" · ")
                        : "Nothing specific. Play it as written."}
                    </p>
                  )}
                  {next.lyricsChords?.trim() && (
                    <details className="mt-2 rounded-lg bg-surface p-2">
                      <summary className="tap-target flex cursor-pointer items-center text-sm font-semibold">
                        Preview next chart
                      </summary>
                      <LyricsChordsView content={next.lyricsChords} size="sm" />
                    </details>
                  )}
                  {isLeaderView && (
                    <div className="mt-3 space-y-2">
                      <h4 className="label-caps">Directions (next)</h4>
                      {nextInstructionsByRole.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No specific instructions yet.</p>
                      ) : (
                        nextInstructionsByRole.map((n) => (
                          <div key={n.id} className="rounded-lg bg-surface px-3 py-2">
                            <span className="label-caps">{n.role}</span>
                            <p className="text-sm">{n.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              ) : nextSong ? (
                <>
                  <h3 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">{nextSong.song.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Next song</p>
                  {(() => {
                    // A musician (any viewer with a musical part, leader
                    // included) sees their own piece of the transition if
                    // one was written for one of their roles, else falls
                    // back to the shared text.
                    const myTransitionText = myRoles
                      .map(
                        (role) =>
                          selectRoleNoteForViewer(setSong.transitionFrom?.roleNotes ?? [], role, viewerTeamMemberId)
                            ?.content,
                      )
                      .find((content) => content?.trim());
                    const text = myTransitionText ?? setSong.transitionFrom?.direction;
                    if (!text?.trim()) return null;
                    return (
                      <div className="mt-3 flex items-start gap-2 rounded-lg bg-surface p-3">
                        <ArrowDown className="mt-0.5 h-4 w-4 shrink-0 text-musical" aria-hidden />
                        <p className="text-sm font-semibold text-musical">{text}</p>
                      </div>
                    );
                  })()}
                </>
              ) : (
                <p className="mt-1 text-lg font-semibold">End of the set.</p>
              )}
            </section>

            <section aria-label="Directions" className="lg:col-span-3">
              {isLeaderView ? (
                <div className="space-y-2">
                  <h3 className="label-caps">Directions for every role</h3>
                  <DirectionList notes={instructionsByRole} />
                </div>
              ) : (
                <details className="rounded-xl border border-border bg-surface px-3 py-1">
                  <summary className="tap-target flex cursor-pointer items-center text-sm font-semibold text-muted-foreground">
                    What everyone else is playing ({instructionsByRole.length})
                  </summary>
                  <div className="pb-2">
                    <DirectionList notes={instructionsByRole} />
                  </div>
                </details>
              )}
            </section>

            {isLeaderView && (
              <div className="space-y-3 lg:col-span-3">
                <NotesReview
                  setId={setId}
                  refreshKey={notesRefresh}
                  onArrangementChanged={() => {
                    setNotesRefresh((n) => n + 1);
                    router.refresh();
                  }}
                />
                <details className="rounded-xl border border-border bg-surface p-3">
                  <summary className="tap-target flex cursor-pointer items-center gap-2 text-sm font-semibold">
                    <MoreHorizontal className="h-4 w-4" aria-hidden /> More cues &amp; announcements
                  </summary>
                  <div className="mt-3">
                    <AnnounceControl setId={setId} panel />
                  </div>
                </details>
              </div>
            )}

            <details className="rounded-xl border border-border bg-surface p-3 lg:col-span-2 lg:col-start-4">
              <summary className="tap-target flex cursor-pointer items-center gap-2 text-sm font-semibold">
                <FlaskConical className="h-4 w-4" aria-hidden /> Try, metronome &amp; rehearsal check
              </summary>
              <div className="mt-3 space-y-4">
                {current && (
                  <ExperimentPanel
                    key={current.id}
                    sectionId={current.id}
                    rehearsalId={rehearsalId}
                    changes={current.arrangementChanges}
                    isLeaderView={isLeaderView}
                    onChanged={() => router.refresh()}
                  />
                )}
                <div className="space-y-2">
                  <h3 className="flex items-center gap-1.5 label-caps">
                    <Timer className="h-3.5 w-3.5" aria-hidden /> Metronome
                  </h3>
                  <div className="flex justify-center">
                    <Metronome initialBpm={song.bpm ?? 80} />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="label-caps">Mark this rehearsal</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {REHEARSAL_CHECK_STATUSES.map((s) => (
                      <Button
                        key={s.value}
                        variant={activeStatus === s.value ? "primary" : "outline"}
                        disabled={!rehearsalId}
                        onClick={async () => {
                          if (!rehearsalId) return;
                          setError(null);
                          const result = await callOffline("setRehearsalCheck", [rehearsalId, s.value], `Rehearsal check — ${s.label}`);
                          if (!result.ok) {
                            setError(result.error);
                            return;
                          }
                          setActiveStatus(s.value);
                        }}
                      >
                        {s.label}
                      </Button>
                    ))}
                  </div>
                  {error && <p role="alert" className="text-sm text-danger">{error}</p>}
                </div>
              </div>
            </details>

            {isLeaderView && (
              <div role="group" aria-label="Signal" className="sticky bottom-20 z-10 grid grid-cols-3 gap-2 rounded-xl border border-border bg-surface-elevated p-2 shadow-lg md:bottom-3 lg:col-span-5">
                <LeaderCueButton
                  icon={Pause}
                  label="Hold"
                  sublabel="Stay on this section"
                  variant="secondary"
                  onClick={() => announceToTeam(setId, "Hold")}
                />
                <LeaderCueButton
                  icon={BarChart3}
                  label="Build"
                  sublabel="Increase intensity"
                  variant="outline"
                  onClick={() => announceToTeam(setId, "Build")}
                />
                <LeaderCueButton
                  icon={PlayCircle}
                  label="Go Next"
                  sublabel={next ? `Jump to ${next.label}` : "End of set"}
                  variant="primary"
                  disabled={sectionIndex >= sections.length - 1}
                  onClick={() => goTo(Math.min(sections.length - 1, sectionIndex + 1))}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function DirectionList({ notes }: { notes: RoleNote[] }) {
  if (notes.length === 0) {
    return <p className="text-sm text-muted-foreground">No specific instructions for this section.</p>;
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {notes.map((n) => (
        <div key={n.id} className="rounded-xl border border-border bg-surface px-4 py-3">
          <span className="label-caps">{n.role}</span>
          <p className="mt-0.5 text-base">{n.content}</p>
        </div>
      ))}
    </div>
  );
}

// A small, always-visible confirmation that the leader/MD's last position
// change actually reached the shared state — never lets a command look like
// it succeeded when the server hasn't confirmed it (build spec §10).
function SyncIndicator({
  status,
  onRetry,
}: {
  status: "synced" | "syncing" | "error" | "conflict";
  onRetry: () => void;
}) {
  if (status === "conflict") {
    return (
      <span role="status" className="flex items-center gap-1.5 text-xs font-bold">
        <WifiOff className="h-3.5 w-3.5" aria-hidden /> Another controller moved first — following them
      </span>
    );
  }
  if (status === "error") {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="tap-target flex items-center gap-1.5 rounded-full bg-danger px-3 text-xs font-bold text-danger-foreground hover:bg-danger/90"
      >
        <WifiOff className="h-3.5 w-3.5" aria-hidden /> Sync failed — tap to retry
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold opacity-80">
      <span className={cn("h-1.5 w-1.5 rounded-full bg-current", status === "syncing" && "animate-pulse")} aria-hidden />
      {status === "syncing" ? "Syncing…" : "Synced"}
    </span>
  );
}

// The leader's three large directing controls — Hold/Build send a real
// announcement the team's poll picks up (see POLL_MS above); Go Next is the
// same real section-advance as the Prev/Next pair, just promoted to a big
// primary button since it's the leader's most common action mid-rehearsal.
function LeaderCueButton({
  icon: Icon,
  label,
  sublabel,
  variant,
  disabled,
  onClick,
}: {
  icon: typeof Pause;
  label: string;
  sublabel: string;
  variant: "primary" | "secondary" | "outline";
  disabled?: boolean;
  onClick: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant={variant}
      disabled={disabled || busy}
      className="h-auto min-h-14 flex-col gap-0.5 py-2.5"
      onClick={async () => {
        setBusy(true);
        await onClick();
        setBusy(false);
      }}
    >
      <span className="flex items-center gap-1.5 text-sm font-semibold">
        <Icon className="h-4 w-4" /> {label}
      </span>
      <span className="text-xs font-normal opacity-80">{sublabel}</span>
    </Button>
  );
}

function ExperimentPanel({
  sectionId,
  rehearsalId,
  changes,
  isLeaderView,
  onChanged,
}: {
  sectionId: string;
  rehearsalId: string | null;
  changes: ArrangementChange[];
  isLeaderView: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<string>(ROLES[0]);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [staleId, setStaleId] = useState<string | null>(null);

  return (
    <div className="space-y-2 rounded-xl border border-dashed border-border p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
          <FlaskConical className="h-4 w-4" /> Try something different
        </h3>
        {!open && (
          <Button type="button" variant="ghost" onClick={() => setOpen(true)}>
            Propose a change
          </Button>
        )}
      </div>

      {changes.length > 0 && (
        <div className="space-y-2">
          {changes.map((c) => (
            <div key={c.id} className="rounded-lg bg-musical-soft p-3">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="musical">Experiment</Badge>
                <span className="label-caps">
                  {c.role}
                </span>
              </div>
              <p className="mt-1 text-sm">{c.proposedContent}</p>
              {isLeaderView && (
                <div className="mt-2 flex gap-2">
                  <Button
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      setError(null);
                      const result = await keepArrangementChange(c.id, { force: staleId === c.id });
                      setBusy(false);
                      if (!result.ok) {
                        setError(result.error);
                        // The direction changed since this was proposed — a
                        // second tap is the leader's explicit overwrite.
                        if (result.error.startsWith("This direction was edited")) setStaleId(c.id);
                      } else {
                        setStaleId(null);
                        onChanged();
                      }
                    }}
                  >
                    {staleId === c.id ? "Keep anyway" : "Keep Change"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      const result = await discardArrangementChange(c.id);
                      setBusy(false);
                      if (!result.ok) setError(result.error);
                      else onChanged();
                    }}
                  >
                    Discard
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Select value={role} onChange={(e) => setRole(e.target.value)} className="h-11 w-44 text-sm">
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </div>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            placeholder="Drums enter second half of this section instead."
          />
          <div className="flex gap-2">
            <Button
              disabled={busy || !content.trim()}
              onClick={async () => {
                setBusy(true);
                setError(null);
                const result = await proposeArrangementChange({
                  sectionId,
                  role,
                  proposedContent: content,
                  rehearsalId: rehearsalId ?? undefined,
                });
                setBusy(false);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setContent("");
                setOpen(false);
                onChanged();
              }}
            >
              Propose (Experiment)
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}

// A leader-to-team immediate direction, not a chat — one line, one tap for
// the common ones. Hold/Build/Go Next are now the large dedicated buttons
// below the current section, so this popover covers the rest. "Leader
// Signal" is deliberately vague (a catch-all for "look at me now") since the
// specific cue varies by church/team.
const QUICK_ANNOUNCEMENTS = ["Repeat", "Resume", "Drop", "Wait", "Return to plan", "Stop", "Leader Signal"];

function AnnounceControl({ setId, panel = false }: { setId: string; panel?: boolean }) {
  const [open, setOpen] = useState(panel);
  const [customOpen, setCustomOpen] = useState(panel);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  async function send(text: string) {
    setSending(text);
    setSent(null);
    const result = await announceToTeam(setId, text);
    setSending(null);
    if (result.ok) setSent(text);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap-target flex items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-primary-foreground hover:bg-black/10"
      >
        <MoreHorizontal className="h-4 w-4" /> More cues
      </button>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", panel ? "items-stretch" : "items-end")}>
      <div className={cn("flex flex-wrap items-center gap-2", panel ? "justify-start" : "justify-end")}>
        {QUICK_ANNOUNCEMENTS.map((label) => (
          <button
            key={label}
            type="button"
            disabled={!!sending}
            onClick={() => send(label)}
            className="min-h-11 rounded-full border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:bg-surface-muted disabled:opacity-50"
          >
            {label}
          </button>
        ))}
        {!panel && (
        <button
          type="button"
          onClick={() => setCustomOpen((v) => !v)}
          className="min-h-11 rounded-full border border-dashed border-border bg-surface px-4 text-sm font-semibold text-muted-foreground hover:bg-surface-muted"
        >
          Custom…
        </button>
        )}
        {!panel && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="tap-target flex w-11 items-center justify-center rounded-lg text-primary-foreground hover:bg-black/10"
          aria-label="Close announce"
        >
          <X className="h-4 w-4" />
        </button>
        )}
      </div>
      {customOpen && (
        <div className="flex items-center gap-2">
          <input
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setSent(null);
            }}
            placeholder="e.g. Hold here, we're praying first"
            className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-md"
          />
          <Button
            type="button"
            size="sm"
            disabled={!!sending || !message.trim()}
            onClick={async () => {
              await send(message);
              setMessage("");
            }}
          >
            {sending === message ? "…" : sent === message ? "Sent" : "Send"}
          </Button>
        </div>
      )}
      {sent && (panel || !customOpen) && <p role="status" className={cn("text-sm font-semibold", panel ? "text-success" : "text-primary-foreground")}>Sent &quot;{sent}&quot;</p>}
    </div>
  );
}
