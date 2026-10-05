import { catchAllDirectionFor } from "@/lib/songs/constants";

// A section+role can now hold more than one SongRoleNote row — one shared
// TEAM/ROLE-wide row (teamMemberId null) plus any number of PERSON-scoped
// rows, one per assignee (see the @@unique comment on SongRoleNote). When a
// viewer has their own PERSON-scoped note for a role, it takes priority over
// the shared one; everyone else still sees the shared one.
type RoleNoteLike = {
  role: string;
  teamMemberId: string | null;
  visibility: "TEAM" | "ROLE" | "PERSON";
};

function pickForRole<T extends RoleNoteLike>(
  roleNotes: T[],
  role: string,
  viewerTeamMemberId: string | null,
): T | undefined {
  const candidates = roleNotes.filter((n) => n.role === role);
  const personal = viewerTeamMemberId
    ? candidates.find((n) => n.visibility === "PERSON" && n.teamMemberId === viewerTeamMemberId)
    : undefined;
  return personal ?? candidates.find((n) => n.visibility !== "PERSON");
}

export function selectRoleNoteForViewer<T extends RoleNoteLike>(
  roleNotes: T[],
  role: string,
  viewerTeamMemberId: string | null,
): T | undefined {
  const own = pickForRole(roleNotes, role, viewerTeamMemberId);
  if (own) return own;
  // No direction written for this specific role — fall back to the
  // "Rest of the Band" / "Rest of the Vocals" catch-all, if the leader left
  // one, so someone without an individual note still knows what to do.
  return pickForRole(roleNotes, catchAllDirectionFor(role), viewerTeamMemberId);
}
