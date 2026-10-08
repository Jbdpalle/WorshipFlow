"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Save,
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
  saveRehearsalNotes,
  setRehearsalCheck,
  proposeArrangementChange,
  keepArrangementChange,
  discardArrangementChange,
  setLivePosition,
  getLivePosition,
  announceToTeam,
} from "@/lib/actions/rehearsal";
import { cn } from "@/lib/utils/cn";
import { pickEffectiveRole } from "@/lib/songs/assignment-resolver";

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
type SetSongData = {
  id: string;
  order: number;
  assignments: { teamMemberId: string | null; role: string }[];
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
  songs,
  setTeamMembers,
  isLeaderView,
  viewerTeamMemberId,
  initialLiveSetSongId,
  initialLiveSectionId,
}: {
  setId: string;
  setTitle: string;
  songs: SetSongData[];
  setTeamMembers: { teamMemberId: string; role: string }[];
  isLeaderView: boolean;
  viewerTeamMemberId: string | null;
  initialLiveSetSongId: string | null;
  initialLiveSectionId: string | null;
}) {
  // The default role(s) this viewer holds for the whole service — falls
  // back to here only when the current song has no per-song override (see
  // myRole in SongRehearsalPanel below). Never falls back to account role.
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

  // Non-leader clients poll the live position (and any announcement) and
  // jump to follow the leader — this is polling-based near-real-time, not
  // push/WebSocket (no realtime provider is configured in this
  // environment). See WORSHIPFLOW_SONG_FLOW_AUDIT.md section 5.
  const lastSeenRef = useRef<string | null>(null);
  const lastAnnouncementRef = useRef<string | null>(null);
  useEffect(() => {
    if (isLeaderView) return;
    const interval = setInterval(async () => {
      const result = await getLivePosition(setId);
      if (!result.ok) return;

      if (result.data.announcementAt && result.data.announcementAt !== lastAnnouncementRef.current) {
        lastAnnouncementRef.current = result.data.announcementAt;
        if (result.data.announcement) setAnnouncement(result.data.announcement);
      }

      if (!result.data.setSongId) return;
      if (result.data.updatedAt === lastSeenRef.current) return;
      lastSeenRef.current = result.data.updatedAt;

      const nextSongIndex = songs.findIndex((s) => s.id === result.data.setSongId);
      if (nextSongIndex === -1) return;
      setSongIndex((prev) => {
        if (prev !== nextSongIndex) {
          const title = songs[nextSongIndex]?.song.title;
          setFollowBanner(title ? `Leader moved to ${title}` : "Leader moved to a different song");
        }
        return nextSongIndex;
      });
      window.dispatchEvent(
        new CustomEvent("worshipflow:live-section", { detail: { sectionId: result.data.sectionId } }),
      );
    }, POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setId, isLeaderView]);

  if (!setSong) {
    return <p className="text-muted-foreground">This set has no songs yet.</p>;
  }

  return (
    <div className="space-y-5">
      {isLeaderView ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-primary px-4 py-2 text-primary-foreground">
          <p className="flex items-center gap-2 text-sm font-bold">
            <Radio className="h-4 w-4 animate-pulse" aria-hidden /> Director mode
          </p>
          <p className="text-sm font-medium">Everyone follows your position and cues.</p>
        </div>
      ) : (
        <>
          {followBanner && (
            <p role="status" className="rounded-lg bg-info/10 px-4 py-2 text-sm font-semibold text-info">
              {followBanner}
            </p>
          )}
          {announcement && (
            <div role="alert" className="flex items-center gap-3 rounded-xl bg-primary px-5 py-4 text-primary-foreground">
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
        </>
      )}

      <nav aria-label="Set order">
        <ol className="flex gap-2 overflow-x-auto pb-1">
          {songs.map((s, i) => (
            <li key={s.id} className="shrink-0">
              <button
                onClick={() => {
                  setSongIndex(i);
                  if (isLeaderView) {
                    setLivePosition(setId, s.id, s.song.sections[0]?.id ?? null);
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
        initialLiveSectionId={setSong.id === initialLiveSetSongId ? initialLiveSectionId : null}
      />
    </div>
  );
}

function SongRehearsalPanel({
  setId,
  setTitle,
  setSong,
  viewerDefaultRoles,
  isLeaderView,
  viewerTeamMemberId,
  initialLiveSectionId,
}: {
  setId: string;
  setTitle: string;
  setSong: SetSongData;
  viewerDefaultRoles: string[];
  isLeaderView: boolean;
  viewerTeamMemberId: string | null;
  initialLiveSectionId: string | null;
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
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    startRehearsal(song.id, setSong.id, song.bpm ?? undefined).then((result) => {
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
  }, [song.id, setSong.id]);

  // Follow the leader's section moves within the current song (the parent
  // dispatches this after each poll — see RehearsalMode above).
  useEffect(() => {
    if (isLeaderView) return;
    function onLiveSection(e: Event) {
      const sectionId = (e as CustomEvent<{ sectionId: string | null }>).detail?.sectionId;
      if (!sectionId) return;
      const idx = sections.findIndex((s) => s.id === sectionId);
      if (idx !== -1) setSectionIndex(idx);
    }
    window.addEventListener("worshipflow:live-section", onLiveSection);
    return () => window.removeEventListener("worshipflow:live-section", onLiveSection);
  }, [isLeaderView, sections]);

  function goTo(nextIndex: number) {
    setSectionIndex(nextIndex);
    if (isLeaderView) {
      setLivePosition(setId, setSong.id, sections[nextIndex]?.id ?? null);
    }
  }

  const current = sections[sectionIndex];
  const next = sections[sectionIndex + 1];

  const instructionsByRole = useMemo(
    () => resolveInstructionsForSection(current, isLeaderView, viewerTeamMemberId),
    [current, isLeaderView, viewerTeamMemberId],
  );
  const nextInstructionsByRole = useMemo(
    () => resolveInstructionsForSection(next, isLeaderView, viewerTeamMemberId),
    [next, isLeaderView, viewerTeamMemberId],
  );

  // The viewing musician's own part for this song, independent of the
  // generic "every role" list above — null for the leader (they see
  // everything already). A per-song override wins if one exists; otherwise
  // falls back to their default role(s) for the whole service — never to
  // account role, and never guessed when neither exists.
  const myRole = !isLeaderView
    ? pickEffectiveRole(
        setSong.assignments.find((a) => a.teamMemberId === viewerTeamMemberId)?.role,
        viewerDefaultRoles,
      )
    : undefined;
  const myPartNote = myRole && current ? selectRoleNoteForViewer(current.roleNotes, myRole, viewerTeamMemberId) : undefined;

  const nextMyPartNote =
    myRole && next ? selectRoleNoteForViewer(next.roleNotes, myRole, viewerTeamMemberId) : undefined;
  const isFreeform = !!current?.isFreeform;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="label-caps">{setTitle}</p>
          <h1 className="text-3xl font-extrabold tracking-tight">{song.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {song.key && (
            <Badge variant="musical" className="tnum px-3 py-1 text-sm">
              Key {song.key}
            </Badge>
          )}
          {song.bpm && (
            <Badge variant="musical" className="tnum px-3 py-1 text-sm">
              {song.bpm} BPM
            </Badge>
          )}
          <ThemeToggleButton showLabel className="w-auto px-3" />
        </div>
      </div>

      <LastTimeCallout lastRehearsal={song.rehearsals[0] ?? null} recentChanges={song.changeLogs} />

      {sections.length === 0 ? (
        <p className="text-muted-foreground">This song has no arrangement yet.</p>
      ) : (
        <>
          <SongFlowRibbon
            sections={sections}
            selectedId={current?.id ?? null}
            onSelect={(id) => {
              const i = sections.findIndex((x) => x.id === id);
              if (i !== -1) goTo(i);
            }}
          />

          {/* One screen, nothing to tap through. Phone: now, my part, next,
              then everything else. iPad landscape / laptop: now and my
              part on the left, next and tools on the right. */}
          <div className="grid gap-5 lg:grid-flow-dense lg:grid-cols-5 lg:items-start">
            <section
              aria-label="Current section"
              className={cn(
                "rounded-2xl p-6 sm:p-8 lg:col-span-3",
                isFreeform
                  ? "border border-dashed border-border bg-surface-muted"
                  : "border-2 border-primary bg-surface",
              )}
            >
              <p
                className={cn(
                  "flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.1em]",
                  isFreeform ? "text-muted-foreground" : "text-primary",
                )}
              >
                {isFreeform && <Wind className="h-3.5 w-3.5" aria-hidden />}
                {isFreeform ? "Spontaneous: follow as led" : isLeaderView ? "Current" : "Now"}
              </p>
              <h2 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">
                {current?.label}
                {!isFreeform && current?.repeatCount && current.repeatCount > 1 ? ` ×${current.repeatCount}` : ""}
              </h2>
              {current?.dynamics && <DynamicIndicator dynamics={current.dynamics} className="mt-4" />}
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  disabled={sectionIndex === 0}
                  onClick={() => goTo(Math.max(0, sectionIndex - 1))}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden /> Previous
                </Button>
                {!isLeaderView && (
                  <Button
                    variant="secondary"
                    disabled={sectionIndex >= sections.length - 1}
                    onClick={() => goTo(Math.min(sections.length - 1, sectionIndex + 1))}
                  >
                    Next <ChevronRight className="h-4 w-4" aria-hidden />
                  </Button>
                )}
              </div>
            </section>

            {isLeaderView && (
              <section aria-label="Announce" className="space-y-3 rounded-2xl border border-border bg-surface p-5 lg:col-span-3">
                <h3 className="label-caps">Announce to the team</h3>
                <AnnounceControl setId={setId} panel />
              </section>
            )}

            {!isLeaderView && myRole && (
              <section aria-label="My part" className="rounded-2xl border border-border bg-musical-soft p-5 sm:p-6 lg:col-span-3">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-musical">My part · {myRole}</p>
                <p className="mt-2 text-xl font-semibold leading-snug sm:text-2xl">
                  {myPartNote?.content.trim() ? myPartNote.content : "Nothing specific for you here. Play it as written."}
                </p>
              </section>
            )}

            <section
              aria-label="Next section"
              className="rounded-2xl border border-border bg-surface-muted/60 p-5 sm:p-6 lg:col-span-2 lg:col-start-4 lg:row-start-1"
            >
              <p className="label-caps">Next</p>
              {next ? (
                <>
                  <h3 className="mt-1 text-2xl font-extrabold tracking-tight">
                    {next.label}
                    {next.repeatCount && next.repeatCount > 1 ? ` ×${next.repeatCount}` : ""}
                  </h3>
                  {next.dynamics && <DynamicIndicator dynamics={next.dynamics} className="mt-2" />}
                  {!isLeaderView && myRole && (
                    <p className="mt-3 text-base">
                      <span className="font-bold text-musical">Me: </span>
                      {nextMyPartNote?.content.trim() ? nextMyPartNote.content : "Nothing specific. Play it as written."}
                    </p>
                  )}
                  {next.lyricsChords?.trim() && (
                    <div className="mt-3 rounded-lg bg-surface p-2">
                      <LyricsChordsView content={next.lyricsChords} size="sm" />
                    </div>
                  )}
                  <div className="mt-4 space-y-2">
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
                </>
              ) : (
                <p className="mt-1 text-lg font-semibold">End of the song.</p>
              )}
            </section>

            <section aria-label="Directions" className="space-y-2 lg:col-span-3">
              <h3 className="label-caps">{isLeaderView ? "Directions for every role" : "Directions for everyone"}</h3>
              {instructionsByRole.length === 0 ? (
                <p className="text-sm text-muted-foreground">No specific instructions for this section.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {instructionsByRole.map((n) => (
                    <div key={n.id} className="rounded-xl border border-border bg-surface px-4 py-3">
                      <span className="label-caps">{n.role}</span>
                      <p className="mt-0.5 text-base">{n.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {current?.lyricsChords?.trim() && (
              <section aria-label="Lyrics and chords" className="space-y-1 rounded-xl bg-surface-muted p-4 lg:col-span-3">
                <h3 className="label-caps">Lyrics &amp; chords</h3>
                <LyricsChordsView content={current.lyricsChords} size="sm" />
              </section>
            )}

            <div className="space-y-5 lg:col-span-2 lg:col-start-4">
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
              <details className="rounded-xl border border-border bg-surface p-4">
                <summary className="tap-target flex cursor-pointer items-center gap-2 text-sm font-semibold">
                  <Timer className="h-4 w-4" /> Metronome
                </summary>
                <div className="mt-4 flex justify-center">
                  <Metronome initialBpm={song.bpm ?? 80} />
                </div>
              </details>

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
                        const result = await setRehearsalCheck(rehearsalId, s.value);
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
              </div>

              <div className="space-y-2">
                <h3 className="label-caps">Record rehearsal notes</h3>
                <Textarea
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    setSaved(false);
                  }}
                  placeholder={"One note per line, e.g.\nChorus was too loud.\nBass enters too early."}
                  rows={4}
                />
                <Button
                  disabled={!rehearsalId || !notes.trim()}
                  onClick={async () => {
                    if (!rehearsalId) return;
                    setError(null);
                    const result = await saveRehearsalNotes(rehearsalId, notes.split("\n"));
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    setNotes("");
                    setSaved(true);
                  }}
                >
                  <Save className="h-4 w-4" /> Save
                </Button>
                {saved && <p role="status" className="text-sm text-success">Saved to rehearsal history.</p>}
                {error && <p role="alert" className="text-sm text-danger">{error}</p>}
              </div>
            </div>

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
      <span className="text-[11px] font-normal opacity-80">{sublabel}</span>
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
                      const result = await keepArrangementChange(c.id);
                      setBusy(false);
                      if (!result.ok) setError(result.error);
                      else onChanged();
                    }}
                  >
                    Keep Change
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
const QUICK_ANNOUNCEMENTS = ["Repeat", "Stop", "Drop", "Wait", "Leader Signal"];

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
