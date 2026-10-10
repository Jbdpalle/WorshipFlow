import { catchAllDirectionFor, categoryForRole } from "@/lib/songs/constants";

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

// For the Song Flow overview: which roles actually have a written
// direction in this section, so the outline can show "Bass, Drums, Vocals"
// at a glance instead of making a leader open every section to find out —
// and flag a section with none at all as incomplete. Blank-content rows
// (the UI leaves an empty row around while someone's mid-type) don't count.
export function summarizeSectionCoverage<T extends { role: string; content: string }>(
  roleNotes: T[],
): { roles: string[]; hasAny: boolean } {
  const roles = Array.from(new Set(roleNotes.filter((n) => n.content.trim()).map((n) => n.role)));
  return { roles, hasAny: roles.length > 0 };
}

// Which visual lane a direction's role belongs in, for the Song Overview's
// vocal/instrument lanes (Feature Three). Reuses the existing
// ROLE_CATEGORIES "vocals" grouping rather than a second vocal-roles list;
// "Rest of the Vocals" is the one DIRECTION_GROUPS value that's vocal, so
// it's called out explicitly. Anything uncategorized (a custom/freeform
// role, "Other", "Rest of the Band") defaults to the instrument lane, which
// is the safer default for an unrecognized instrument name.
export function laneForRole(role: string): "vocal" | "instrument" {
  if (role === "Rest of the Vocals") return "vocal";
  return categoryForRole(role) === "vocals" ? "vocal" : "instrument";
}
