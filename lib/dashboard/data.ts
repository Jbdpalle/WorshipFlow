import { prisma } from "@/lib/db/prisma";
import { getServiceStages, type ProgressStage } from "@/lib/songs/readiness";
import { ROLE_CATEGORIES, ROLES, categoryForRole, type RoleCategoryKey } from "@/lib/songs/constants";

function sortByRoleOrder<T extends { role: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const ai = ROLES.indexOf(a.role as (typeof ROLES)[number]);
    const bi = ROLES.indexOf(b.role as (typeof ROLES)[number]);
    return (ai === -1 ? ROLES.length : ai) - (bi === -1 ? ROLES.length : bi);
  });
}

export type NeedsAttentionItem = {
  id: string;
  message: string;
  actionLabel: string;
  href: string;
};

export type SetlistPreviewSong = {
  id: string;
  songId: string;
  title: string;
  order: number;
  key: string | null;
  bpm: number | null;
  coveredCategories: RoleCategoryKey[];
  transitionToNext: string | null;
};

export type TeamCoverageRow = {
  key: RoleCategoryKey;
  label: string;
  confirmed: number;
  total: number;
};

export type ServiceRosterRow = { role: string; name: string };

export type DashboardSet = {
  id: string;
  title: string;
  theme: string | null;
  leaderName: string | null;
  // The actual "Worship Leader" assignment from the service roster, when
  // one exists — preferred over the manually-typed `leaderName` field
  // above wherever both might be shown, so the two can never contradict
  // each other on screen. Falls back to `leaderName` when no one is
  // assigned that role yet.
  effectiveLeaderName: string | null;
  serviceDate: Date | null;
  songCount: number;
  teamMemberCount: number;
  notes: string | null;
  stages: ProgressStage[];
  setlistPreview: SetlistPreviewSong[];
  teamCoverage: TeamCoverageRow[];
  // Who's serving this service and in what role — the whole-service
  // roster (SetTeamMember), not a per-song override. This is the same
  // source of truth My Part and Rehearsal Mode resolve against.
  serviceRoster: ServiceRosterRow[];
};

export type ThisWeekItem = {
  id: string;
  title: string;
  eventType: string;
  serviceDate: Date;
  location: string | null;
};

export type MemberStatus = {
  teamMemberName: string;
  roleLabel: string;
  isVocalist: boolean;
  hasAssignmentForNextSunday: boolean;
  partReady: boolean;
  changedSongCount: number;
};

export type DashboardData = {
  nextSunday: DashboardSet | null;
  followingSunday: DashboardSet | null;
  thisWeek: ThisWeekItem[];
  needsAttention: NeedsAttentionItem[];
  isLeaderView: boolean;
  memberStatus: MemberStatus | null;
  uninvitedMemberCount: number;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function getDashboardData(
  teamId: string,
  userId: string,
  membershipRole: string,
): Promise<DashboardData> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sundaySets = await prisma.worshipSet.findMany({
    where: { teamId, eventType: "SERVICE", serviceDate: { gte: today }, archivedAt: null },
    orderBy: { serviceDate: "asc" },
    take: 2,
    include: {
      teamMembers: { include: { teamMember: { select: { id: true, name: true, role: true } } } },
      songs: {
        orderBy: { order: "asc" },
        include: {
          assignments: { include: { teamMember: { select: { id: true, role: true } } } },
          transitionFrom: { select: { type: true } },
          song: {
            include: {
              sections: { select: { roleNotes: { select: { content: true } } } },
              rehearsals: { orderBy: { occurredAt: "desc" }, take: 1 },
              changeLogs: { orderBy: { createdAt: "desc" }, take: 5 },
            },
          },
        },
      },
    },
  });

  const [nextSet, followingSet] = sundaySets;

  // Full roster, grouped by the same four instrument families as the
  // per-song coverage icons, so Team Coverage can show "confirmed of total"
  // per family instead of a raw headcount.
  const roster = await prisma.teamMember.findMany({ where: { teamId }, select: { id: true, role: true } });
  const rosterByCategory = new Map<string, number>();
  for (const m of roster) {
    const cat = categoryForRole(m.role);
    if (cat) rosterByCategory.set(cat, (rosterByCategory.get(cat) ?? 0) + 1);
  }

  const TRANSITION_LABELS: Record<string, string> = {
    DIRECT: "Direct",
    INSTRUMENTAL: "Instrumental",
    PAD: "Pad",
    SPOKEN: "Spoken",
    PRAYER: "Prayer",
    FREE_WORSHIP: "Free Worship",
    COUNT_IN: "Count-in",
    PAUSE: "Pause",
    CUSTOM: "Custom",
  };

  function toDashboardSet(
    set: (typeof sundaySets)[number] | undefined,
  ): DashboardSet | null {
    if (!set) return null;
    const teamMemberIds = new Set([
      ...set.songs.flatMap((s) => s.assignments.map((a) => a.teamMemberId)),
      ...set.teamMembers.map((tm) => tm.teamMemberId),
    ]);

    const serviceRoster = sortByRoleOrder(
      set.teamMembers.map((tm) => ({ role: tm.role, name: tm.teamMember.name })),
    );
    const effectiveLeaderName =
      serviceRoster.find((r) => r.role === "Worship Leader")?.name ?? set.leaderName;

    const confirmedByCategory = new Map<string, Set<string>>();
    for (const s of set.songs) {
      for (const a of s.assignments) {
        const cat = categoryForRole(a.teamMember.role);
        if (!cat) continue;
        if (!confirmedByCategory.has(cat)) confirmedByCategory.set(cat, new Set());
        confirmedByCategory.get(cat)!.add(a.teamMember.id);
      }
    }

    const teamCoverage: TeamCoverageRow[] = ROLE_CATEGORIES.map((c) => ({
      key: c.key,
      label: c.label,
      confirmed: confirmedByCategory.get(c.key)?.size ?? 0,
      total: rosterByCategory.get(c.key) ?? 0,
    })).filter((row) => row.total > 0);

    const setlistPreview: SetlistPreviewSong[] = set.songs.map((s) => ({
      id: s.id,
      songId: s.song.id,
      title: s.song.title,
      order: s.order,
      key: s.overrideKey ?? s.song.key,
      bpm: s.song.bpm,
      coveredCategories: Array.from(
        new Set(s.assignments.map((a) => categoryForRole(a.teamMember.role)).filter((c): c is RoleCategoryKey => !!c)),
      ),
      transitionToNext: s.transitionFrom ? (TRANSITION_LABELS[s.transitionFrom.type] ?? s.transitionFrom.type) : null,
    }));

    return {
      id: set.id,
      title: set.title,
      theme: set.theme,
      leaderName: set.leaderName,
      effectiveLeaderName,
      serviceDate: set.serviceDate,
      songCount: set.songs.length,
      teamMemberCount: teamMemberIds.size,
      notes: set.notes,
      stages: getServiceStages(set),
      setlistPreview,
      teamCoverage,
      serviceRoster,
    };
  }

  const excludeIds = [nextSet?.id, followingSet?.id].filter(Boolean) as string[];
  const weekFromNow = new Date(today.getTime() + WEEK_MS);
  const thisWeekSets = await prisma.worshipSet.findMany({
    where: {
      teamId,
      id: { notIn: excludeIds },
      serviceDate: { gte: today, lte: weekFromNow },
      archivedAt: null,
    },
    orderBy: { serviceDate: "asc" },
    take: 4,
  });

  const thisWeek: ThisWeekItem[] = thisWeekSets
    .filter((s) => s.serviceDate !== null)
    .map((s) => ({
      id: s.id,
      title: s.title,
      eventType: s.eventType,
      serviceDate: s.serviceDate as Date,
      location: s.location,
    }));

  const needsAttention: NeedsAttentionItem[] = [];
  if (nextSet) {
    const hasRosterLeader = nextSet.teamMembers.some((tm) => tm.role === "Worship Leader");
    if (!hasRosterLeader && !nextSet.leaderName) {
      needsAttention.push({
        id: "leader",
        message: "Worship leader hasn't been assigned",
        actionLabel: "Assign Leader",
        href: `/sets/${nextSet.id}`,
      });
    }
    if (!nextSet.theme) {
      needsAttention.push({
        id: "theme",
        message: "Sunday theme hasn't been added",
        actionLabel: "Add Theme",
        href: `/sets/${nextSet.id}`,
      });
    }
    // A song only truly needs attention if there's no per-song override
    // AND no whole-set roster to fall back on — once a set has a roster,
    // every song in it inherits those roles by default.
    const unassignedCount =
      nextSet.teamMembers.length === 0
        ? nextSet.songs.filter((s) => s.assignments.length === 0).length
        : 0;
    if (nextSet.songs.length === 0) {
      needsAttention.push({
        id: "no-songs",
        message: "No songs added to the setlist yet",
        actionLabel: "Build Setlist",
        href: `/sets/${nextSet.id}`,
      });
    } else if (unassignedCount > 0) {
      needsAttention.push({
        id: "unassigned",
        message: `${unassignedCount} song${unassignedCount === 1 ? "" : "s"} still ${unassignedCount === 1 ? "needs" : "need"} a musician`,
        actionLabel: "Assign",
        href: `/sets/${nextSet.id}`,
      });
    }
    const notRehearsedCount = nextSet.songs.filter((s) => s.song.rehearsals.length === 0).length;
    if (notRehearsedCount > 0 && nextSet.songs.length > 0) {
      needsAttention.push({
        id: "not-rehearsed",
        message: `${notRehearsedCount} song${notRehearsedCount === 1 ? "" : "s"} ${notRehearsedCount === 1 ? "hasn't" : "haven't"} been rehearsed yet`,
        actionLabel: "Rehearse",
        href: `/rehearsal/${nextSet.id}`,
      });
    }
  }

  const isLeaderView = membershipRole !== "MEMBER";
  let memberStatus: MemberStatus | null = null;
  let uninvitedMemberCount = 0;

  if (isLeaderView) {
    // Roster members with no login of their own and no invite already
    // pending for them — the nudge to actually use the invite flow, since
    // it otherwise sits unused behind the Team page.
    const [membersWithoutLogin, pendingInvitedMemberIds] = await Promise.all([
      prisma.teamMember.findMany({ where: { teamId, userId: null }, select: { id: true } }),
      prisma.invite.findMany({
        where: { teamId, acceptedAt: null, expiresAt: { gt: new Date() }, teamMemberId: { not: null } },
        select: { teamMemberId: true },
      }),
    ]);
    const invitedIds = new Set(pendingInvitedMemberIds.map((i) => i.teamMemberId));
    uninvitedMemberCount = membersWithoutLogin.filter((m) => !invitedIds.has(m.id)).length;
  }

  if (!isLeaderView) {
    const member = await prisma.teamMember.findFirst({ where: { teamId, userId } });
    if (member) {
      const roleLabel = member.instrument || member.role;
      const isVocalist = /vocal/i.test(member.role) || /vocal/i.test(member.instrument ?? "");
      // A per-song override always counts; otherwise fall back to whether
      // this member holds any role on the set's whole-service roster —
      // same override-wins-over-default precedence as My Part and
      // Rehearsal Mode (lib/songs/assignment-resolver.ts), so this card
      // can never disagree with what those pages show.
      const hasSetRole = nextSet?.teamMembers.some((tm) => tm.teamMemberId === member.id) ?? false;
      const assignedSongs =
        nextSet?.songs.filter(
          (s) => s.assignments.some((a) => a.teamMemberId === member.id) || hasSetRole,
        ) ?? [];
      const hasAssignmentForNextSunday = assignedSongs.length > 0;
      const partReady =
        hasAssignmentForNextSunday && assignedSongs.every((s) => s.song.rehearsals.length > 0);
      const changedSongCount = assignedSongs.filter((s) => {
        const lastRehearsal = s.song.rehearsals[0];
        return s.song.changeLogs.some(
          (c) => !lastRehearsal || c.createdAt > lastRehearsal.occurredAt,
        );
      }).length;

      memberStatus = {
        teamMemberName: member.name,
        roleLabel,
        isVocalist,
        hasAssignmentForNextSunday,
        partReady,
        changedSongCount,
      };
    }
  }

  return {
    nextSunday: toDashboardSet(nextSet),
    followingSunday: toDashboardSet(followingSet),
    thisWeek,
    needsAttention: needsAttention.slice(0, 3),
    isLeaderView,
    memberStatus,
    uninvitedMemberCount,
  };
}

export type CalendarDateEntry = {
  date: string; // YYYY-MM-DD, local
  setId: string;
  title: string;
  eventType: string;
  hasRoster: boolean;
  roster: ServiceRosterRow[];
};

export type RosterPageEntry = {
  id: string;
  title: string;
  eventType: string;
  serviceDate: Date;
  roster: ServiceRosterRow[];
};

// The team's upcoming schedule with who's serving each date — what a
// roster import actually produces (SetTeamMember rows per date), surfaced
// as its own page rather than only inside the Dashboard's calendar popover
// or a one-time import summary dialog, so an imported roster has a
// permanent, browsable home.
export async function getRosterPageData(teamId: string): Promise<RosterPageEntry[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sets = await prisma.worshipSet.findMany({
    where: { teamId, serviceDate: { gte: today }, archivedAt: null },
    orderBy: { serviceDate: "asc" },
    include: {
      teamMembers: { include: { teamMember: { select: { id: true, name: true, role: true } } } },
    },
  });

  return sets
    .filter((s): s is typeof s & { serviceDate: Date } => s.serviceDate !== null)
    .map((s) => ({
      id: s.id,
      title: s.title,
      eventType: s.eventType,
      serviceDate: s.serviceDate,
      roster: sortByRoleOrder(s.teamMembers.map((tm) => ({ role: tm.role, name: tm.teamMember.name }))),
    }));
}

// One query per visible month, scoped to the team — no N+1. `month` is
// 0-indexed (JS Date convention: 0 = January). Every event type shows here
// (Sunday Service, Rehearsal/Practice, Special Event, etc.) — a team's
// rehearsal matters just as much as its Sunday service, and the Dashboard's
// own "This Week" list already mixes types, so the calendar should too.
export async function getCalendarMonthData(
  teamId: string,
  year: number,
  month: number,
): Promise<CalendarDateEntry[]> {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);

  const sets = await prisma.worshipSet.findMany({
    where: { teamId, serviceDate: { gte: start, lt: end }, archivedAt: null },
    orderBy: { serviceDate: "asc" },
    include: {
      teamMembers: { include: { teamMember: { select: { id: true, name: true, role: true } } } },
    },
  });

  return sets
    .filter((s): s is typeof s & { serviceDate: Date } => s.serviceDate !== null)
    .map((s) => ({
      date: `${s.serviceDate.getFullYear()}-${String(s.serviceDate.getMonth() + 1).padStart(2, "0")}-${String(s.serviceDate.getDate()).padStart(2, "0")}`,
      setId: s.id,
      title: s.title,
      eventType: s.eventType,
      hasRoster: s.teamMembers.length > 0,
      roster: sortByRoleOrder(s.teamMembers.map((tm) => ({ role: tm.role, name: tm.teamMember.name }))),
    }));
}
