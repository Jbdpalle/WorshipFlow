"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Save, Timer, FlaskConical, Radio, Wind, Megaphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Metronome } from "@/components/metronome/metronome";
import { LyricsChordsView } from "@/components/songs/lyrics-chords-view";
import { LastTimeCallout } from "@/components/songs/last-time-callout";
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
  isLeaderView,
  viewerTeamMemberId,
  initialLiveSetSongId,
  initialLiveSectionId,
}: {
  setId: string;
  setTitle: string;
  songs: SetSongData[];
  isLeaderView: boolean;
  viewerTeamMemberId: string | null;
  initialLiveSetSongId: string | null;
  initialLiveSectionId: string | null;
}) {
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
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-accent">
            <Radio className="h-3.5 w-3.5" /> Directing live — the team follows your Prev/Next
          </p>
          <AnnounceControl setId={setId} />
        </div>
      ) : (
        <>
          {followBanner && (
            <p className="rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent">
              {followBanner}
            </p>
          )}
          {announcement && (
            <div className="flex items-start gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm">
              <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <p className="flex-1">{announcement}</p>
              <button
                onClick={() => setAnnouncement(null)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Dismiss announcement"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {songs.map((s, i) => (
          <button
            key={s.id}
            onClick={() => {
              setSongIndex(i);
              if (isLeaderView) {
                setLivePosition(setId, s.id, s.song.sections[0]?.id ?? null);
              }
            }}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium tap-target",
              i === songIndex
                ? "bg-accent text-accent-foreground"
                : "bg-surface-muted text-muted-foreground",
            )}
          >
            {String(i + 1).padStart(2, "0")}. {s.song.title}
          </button>
        ))}
      </div>

      <SongRehearsalPanel
        key={setSong.id}
        setId={setId}
        setTitle={setTitle}
        setSong={setSong}
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
  isLeaderView,
  viewerTeamMemberId,
  initialLiveSectionId,
}: {
  setId: string;
  setTitle: string;
  setSong: SetSongData;
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
  // everything already) or if this song has no per-song assignment for them.
  const myRole = !isLeaderView
    ? setSong.assignments.find((a) => a.teamMemberId === viewerTeamMemberId)?.role
    : undefined;
  const myPartNote = myRole && current ? selectRoleNoteForViewer(current.roleNotes, myRole, viewerTeamMemberId) : undefined;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{setTitle}</p>
          <h1 className="text-xl font-semibold">{song.title}</h1>
        </div>
        <div className="flex gap-1.5">
          {song.key && <Badge variant="outline">Key {song.key}</Badge>}
          {song.bpm && <Badge variant="outline">{song.bpm} BPM</Badge>}
        </div>
      </div>

      <LastTimeCallout lastRehearsal={song.rehearsals[0] ?? null} recentChanges={song.changeLogs} />

      {sections.length === 0 ? (
        <p className="text-muted-foreground">This song has no arrangement yet.</p>
      ) : (
        <>
          <div
            className={cn(
              "rounded-2xl p-5 text-center",
              current?.isFreeform
                ? "border border-dashed border-border bg-surface-muted"
                : "border-2 border-accent bg-accent/10",
            )}
          >
            <p
              className={cn(
                "flex items-center justify-center gap-1 text-xs font-semibold uppercase tracking-wide",
                current?.isFreeform ? "text-muted-foreground" : "text-accent",
              )}
            >
              {current?.isFreeform && <Wind className="h-3.5 w-3.5" />}
              {current?.isFreeform ? "Spontaneous — follow as led" : "Current Section"}
            </p>
            <h2 className="mt-1 text-3xl font-bold">
              {current?.label}
              {!current?.isFreeform && current?.repeatCount && current.repeatCount > 1 ? ` ×${current.repeatCount}` : ""}
            </h2>
            {current?.dynamics && (
              <Badge variant="outline" className="mt-1.5">
                {current.dynamics}
              </Badge>
            )}
            <div className="mt-4 flex justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={sectionIndex === 0}
                onClick={() => goTo(Math.max(0, sectionIndex - 1))}
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={sectionIndex >= sections.length - 1}
                onClick={() => goTo(Math.min(sections.length - 1, sectionIndex + 1))}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {current?.lyricsChords?.trim() && (
            <div className="space-y-1 rounded-lg bg-surface-muted p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Lyrics &amp; Chords
              </h3>
              <LyricsChordsView content={current.lyricsChords} size="sm" />
            </div>
          )}

          {!isLeaderView && myRole && (
            <div className="space-y-1 rounded-xl border-2 border-accent bg-accent/10 p-3">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
                My Part — {myRole}
              </h3>
              <p className="text-sm">
                {myPartNote?.content.trim() ? myPartNote.content : "Nothing specific for you here — play it as written."}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Current Directions</h3>
            {instructionsByRole.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No specific instructions for this section.
              </p>
            ) : (
              instructionsByRole.map((n) => (
                <div key={n.id} className="rounded-lg bg-surface-muted px-3 py-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {n.role}
                  </span>
                  <p className="text-sm">{n.content}</p>
                </div>
              ))
            )}
          </div>

          {next && (
            <div className="space-y-2 rounded-lg border border-dashed border-border p-3 opacity-80">
              <h3 className="text-sm font-semibold text-muted-foreground">
                Next: {next.label}
                {next.repeatCount && next.repeatCount > 1 ? ` ×${next.repeatCount}` : ""}
              </h3>
              {nextInstructionsByRole.length === 0 ? (
                <p className="text-xs text-muted-foreground">No specific instructions yet.</p>
              ) : (
                nextInstructionsByRole.map((n) => (
                  <div key={n.id} className="rounded-lg bg-surface-muted px-3 py-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {n.role}
                    </span>
                    <p className="text-xs">{n.content}</p>
                  </div>
                ))
              )}
            </div>
          )}

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
        </>
      )}

      <details className="rounded-lg border border-border p-3">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <Timer className="h-4 w-4" /> Metronome
        </summary>
        <div className="mt-4 flex justify-center">
          <Metronome initialBpm={song.bpm ?? 80} />
        </div>
      </details>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">Mark this rehearsal</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {REHEARSAL_CHECK_STATUSES.map((s) => (
            <Button
              key={s.value}
              variant={activeStatus === s.value ? "primary" : "outline"}
              size="sm"
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
        <h3 className="text-sm font-semibold text-muted-foreground">Record Rehearsal Notes</h3>
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
          size="sm"
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
        {saved && <p className="text-xs text-success">Saved to rehearsal history.</p>}
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    </div>
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
    <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
          <FlaskConical className="h-4 w-4" /> Try something different
        </h3>
        {!open && (
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(true)}>
            Propose a change
          </Button>
        )}
      </div>

      {changes.length > 0 && (
        <div className="space-y-2">
          {changes.map((c) => (
            <div key={c.id} className="rounded-lg bg-accent/10 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="accent">EXPERIMENT</Badge>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {c.role}
                </span>
              </div>
              <p className="mt-1 text-sm">{c.proposedContent}</p>
              {isLeaderView && (
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
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
                    size="sm"
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
            <Select value={role} onChange={(e) => setRole(e.target.value)} className="h-8 w-36 text-xs">
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
              size="sm"
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
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

// A leader-to-team immediate direction, not a chat — one line, one tap for
// the common ones. "Leader Signal" is deliberately vague (a catch-all for
// "look at me now") since the specific cue varies by church/team.
const QUICK_ANNOUNCEMENTS = ["Repeat", "Hold", "Stop", "Build", "Drop", "Wait", "Go Next", "Leader Signal"];

function AnnounceControl({ setId }: { setId: string }) {
  const [open, setOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
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
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <Megaphone className="h-3.5 w-3.5" /> Announce
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap items-center justify-end gap-1">
        {QUICK_ANNOUNCEMENTS.map((label) => (
          <button
            key={label}
            type="button"
            disabled={!!sending}
            onClick={() => send(label)}
            className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium hover:bg-surface-muted disabled:opacity-50"
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomOpen((v) => !v)}
          className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-surface-muted"
        >
          Custom…
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close announce"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {customOpen && (
        <div className="flex items-center gap-1.5">
          <input
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setSent(null);
            }}
            placeholder="e.g. Hold here, we're praying first"
            className="h-8 w-48 rounded-lg border border-border bg-surface px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent sm:w-64"
          />
          <Button
            type="button"
            size="sm"
            className="h-8 px-2 text-xs"
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
      {sent && !customOpen && <p className="text-xs text-success">Sent &quot;{sent}&quot;</p>}
    </div>
  );
}
