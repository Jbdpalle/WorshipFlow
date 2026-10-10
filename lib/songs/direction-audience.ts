import { prisma } from "@/lib/db/prisma";

// Mirrors the exact "override always wins" rule already encoded in
// lib/songs/assignment-resolver.ts's pickEffectiveRole/resolveMemberSongRoles
// (member → songs), just computed in the other direction: given one
// SetSong's overrides and its set's whole-service defaults, what's the full
// roster (every member, with the one role each of them actually ends up
// playing) for that specific song occurrence. Not a second assignment
// resolver — same rule, same data, read the other way round.
export type SimpleAssignment = { teamMemberId: string; role: string };

export function resolveRosterForSetSong(
  overrides: SimpleAssignment[],
  setDefaults: SimpleAssignment[],
): SimpleAssignment[] {
  const overriddenMemberIds = new Set(overrides.map((o) => o.teamMemberId));
  const defaultsForNonOverridden = setDefaults.filter((d) => !overriddenMemberIds.has(d.teamMemberId));
  return [...overrides, ...defaultsForNonOverridden];
}

export type UpcomingRosterRow = {
  teamMemberId: string;
  memberName: string;
  role: string;
  setId: string;
  setTitle: string;
};

// The actual root-cause fix for "directions appear to disappear": a
// direction written with role X is only ever shown to someone in My Part
// when their *resolved role for that song in a specific service* is the
// exact same string X. This answers, for a given direction's role, "who
// (if anyone) currently resolves to that role for an upcoming occurrence of
// this song" — so the leader sees the real reason a direction won't show up
// in My Part yet (nobody rostered under that exact role string), instead of
// the save silently looking like it failed.
export function summarizeDirectionAudience(
  directionRole: string,
  roster: UpcomingRosterRow[],
): UpcomingRosterRow[] {
  return roster.filter((r) => r.role === directionRole);
}

// Every upcoming (today-or-later, or undated) non-archived service this
// song appears in, with the full resolved roster for each occurrence —
// ready to pass into summarizeDirectionAudience per direction. Read-only,
// scoped by teamId exactly like every other query in this codebase.
export async function getUpcomingRosterForSong(songId: string, teamId: string): Promise<UpcomingRosterRow[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const setSongs = await prisma.setSong.findMany({
    where: {
      songId,
      set: {
        teamId,
        archivedAt: null,
        OR: [{ serviceDate: { gte: today } }, { serviceDate: null }],
      },
    },
    include: {
      set: { select: { id: true, title: true, teamMembers: { include: { teamMember: true } } } },
      assignments: { include: { teamMember: true } },
    },
  });

  const rows: UpcomingRosterRow[] = [];
  for (const setSong of setSongs) {
    const overrides = setSong.assignments.map((a) => ({ teamMemberId: a.teamMemberId, role: a.role }));
    const defaults = setSong.set.teamMembers.map((m) => ({ teamMemberId: m.teamMemberId, role: m.role }));
    const roster = resolveRosterForSetSong(overrides, defaults);
    const nameById = new Map<string, string>([
      ...setSong.assignments.map((a) => [a.teamMemberId, a.teamMember.name] as const),
      ...setSong.set.teamMembers.map((m) => [m.teamMemberId, m.teamMember.name] as const),
    ]);
    for (const r of roster) {
      rows.push({
        teamMemberId: r.teamMemberId,
        memberName: nameById.get(r.teamMemberId) ?? "Someone",
        role: r.role,
        setId: setSong.set.id,
        setTitle: setSong.set.title,
      });
    }
  }
  return rows;
}
