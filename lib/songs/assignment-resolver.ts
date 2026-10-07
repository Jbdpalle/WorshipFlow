import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

// The one rule every "what's my part" surface shares: a per-song
// SongAssignment is an explicit override and always wins; otherwise fall
// back to the role(s) this person holds for the whole set via
// SetTeamMember — the normal way someone is added to a service (the
// "Worship Team" card). Never falls back further than that — no
// assignment at either level means no part, full stop, never a guess
// based on account role or any other field.
export function pickEffectiveRole(
  overrideRole: string | null | undefined,
  defaultRoles: string[],
): string | null {
  return overrideRole ?? defaultRoles[0] ?? null;
}

export type ResolvedSongRole = {
  setSongId: string;
  role: string;
  isOverride: boolean;
};

// Batch version for My Part: every (setSong, role) this member actually
// plays, across every set they're involved in — whether that's via a
// per-song override, the whole-set roster, or both. A song covered by an
// override never also emits its set-level default(s), so a song never
// shows the same person twice for conflicting reasons.
//
// Accepts one id or several: two TeamMember rows can turn out to share one
// real person's name (see lib/songs/member-name.ts), and querying only the
// single id the picker happens to be showing would silently hide whatever
// was assigned to its sibling row.
export async function resolveMemberSongRoles(
  db: Db,
  teamMemberId: string | string[],
): Promise<ResolvedSongRole[]> {
  const teamMemberIdFilter = Array.isArray(teamMemberId) ? { in: teamMemberId } : teamMemberId;
  const [overrides, setRoles] = await Promise.all([
    db.songAssignment.findMany({
      where: { teamMemberId: teamMemberIdFilter },
      select: { setSongId: true, role: true },
    }),
    db.setTeamMember.findMany({
      where: { teamMemberId: teamMemberIdFilter },
      select: { setId: true, role: true },
    }),
  ]);

  const results: ResolvedSongRole[] = overrides.map((o) => ({
    setSongId: o.setSongId,
    role: o.role,
    isOverride: true,
  }));

  if (setRoles.length === 0) return results;

  const overriddenSetSongIds = new Set(overrides.map((o) => o.setSongId));
  const rolesBySetId = new Map<string, string[]>();
  for (const s of setRoles) {
    const arr = rolesBySetId.get(s.setId) ?? [];
    arr.push(s.role);
    rolesBySetId.set(s.setId, arr);
  }

  const setSongs = await db.setSong.findMany({
    where: { setId: { in: [...rolesBySetId.keys()] } },
    select: { id: true, setId: true },
  });

  for (const setSong of setSongs) {
    if (overriddenSetSongIds.has(setSong.id)) continue;
    for (const role of rolesBySetId.get(setSong.setId) ?? []) {
      results.push({ setSongId: setSong.id, role, isOverride: false });
    }
  }

  return results;
}
