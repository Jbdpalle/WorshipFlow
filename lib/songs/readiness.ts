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
