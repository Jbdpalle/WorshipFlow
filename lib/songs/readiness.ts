// Workflow readiness only — not analytics. Three simple states, per
// WORSHIPFLOW_SONG_FLOW_AUDIT.md section 6/19.

export type SongFlowStatus = "ready" | "needs_work" | "not_started";

export function getSongFlowStatus(song: {
  visionNote?: string | null;
  sections: { roleNotes: { content: string }[] }[];
}): SongFlowStatus {
  if (song.sections.length === 0) return "not_started";
  const hasDirection = song.sections.some((s) =>
    s.roleNotes.some((n) => n.content.trim().length > 0),
  );
  const hasVision = Boolean(song.visionNote?.trim());
  return hasDirection && hasVision ? "ready" : "needs_work";
}

export type ReadinessItem = { id: string; message: string };

export type ProgressStage = {
  key: string;
  label: string;
  sublabel: string;
  href: string;
  complete: boolean;
};

type StageSong = {
  assignments: unknown[];
  song: {
    id: string;
    visionNote?: string | null;
    sections: { roleNotes: { content: string }[] }[];
    rehearsals: unknown[];
  };
};

// Drives the "Setlist → Song Flow → Team → Rehearsal" progress path shown
// on the Dashboard's next-service card and on the Set detail page itself —
// same four stages, same completeness rules, in both places.
export function getServiceStages(set: {
  id: string;
  teamMembers: unknown[];
  songs: StageSong[];
}): ProgressStage[] {
  const songCount = set.songs.length;
  const hasSongs = songCount > 0;

  const flowStatuses = set.songs.map((s) => getSongFlowStatus(s.song));
  const songFlowReady = hasSongs && flowStatuses.every((s) => s === "ready");
  const songFlowNeedsWork = flowStatuses.filter((s) => s !== "ready").length;

  const teamAssigned = set.teamMembers.length > 0 || set.songs.some((s) => s.assignments.length > 0);
  const rehearsed = hasSongs && set.songs.every((s) => s.song.rehearsals.length > 0);

  const firstUnready = set.songs.find((s) => getSongFlowStatus(s.song) !== "ready");
  const songFlowHref = hasSongs ? `/songs/${(firstUnready ?? set.songs[0]).song.id}` : `/sets/${set.id}`;

  return [
    {
      key: "setlist",
      label: "Setlist",
      sublabel: hasSongs ? `${songCount} song${songCount === 1 ? "" : "s"}` : "Add songs",
      href: `/sets/${set.id}`,
      complete: hasSongs,
    },
    {
      key: "songFlow",
      label: "Song Flow",
      sublabel: !hasSongs
        ? "Add songs first"
        : songFlowReady
          ? "All songs ready"
          : `${songFlowNeedsWork} song${songFlowNeedsWork === 1 ? "" : "s"} need notes & keys`,
      href: songFlowHref,
      complete: songFlowReady,
    },
    {
      key: "team",
      label: "Team",
      sublabel: teamAssigned ? "Assignments set" : "Check assignments",
      href: `/sets/${set.id}#team`,
      complete: teamAssigned,
    },
    {
      key: "rehearsal",
      label: "Rehearsal",
      sublabel: rehearsed ? "Rehearsed" : "Get ready",
      href: `/rehearsal/${set.id}`,
      complete: rehearsed,
    },
  ];
}

export function getSetReadiness(set: {
  leaderName: string | null;
  songs: {
    id: string;
    assignments: unknown[];
    song: { title: string; visionNote?: string | null; sections: { roleNotes: { content: string }[] }[] };
  }[];
  teamMembers: unknown[];
}): ReadinessItem[] {
  const items: ReadinessItem[] = [];

  if (!set.leaderName) items.push({ id: "leader", message: "Worship leader not assigned" });
  if (set.songs.length === 0) {
    items.push({ id: "songs", message: "No songs added to the setlist yet" });
    return items;
  }

  const nobodyAssignedAtAll =
    set.teamMembers.length === 0 && set.songs.every((s) => s.assignments.length === 0);
  if (nobodyAssignedAtAll) items.push({ id: "team", message: "No one assigned to this service yet" });

  for (const setSong of set.songs) {
    const status = getSongFlowStatus(setSong.song);
    if (status === "not_started") {
      items.push({ id: `flow-${setSong.id}`, message: `${setSong.song.title} — Song Flow not started` });
    } else if (status === "needs_work") {
      items.push({ id: `flow-${setSong.id}`, message: `${setSong.song.title} — Song Flow needs work` });
    }
  }

  return items;
}
