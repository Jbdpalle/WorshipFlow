import { prisma } from "@/lib/db/prisma";

export type NeedsAttentionItem = {
  id: string;
  message: string;
  actionLabel: string;
  href: string;
};

export type DashboardSet = {
  id: string;
  title: string;
  theme: string | null;
  leaderName: string | null;
  serviceDate: Date | null;
  songCount: number;
  teamMemberCount: number;
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
      songs: {
        include: {
          assignments: true,
          song: {
            include: {
              rehearsals: { orderBy: { occurredAt: "desc" }, take: 1 },
              changeLogs: { orderBy: { createdAt: "desc" }, take: 5 },
            },
          },
        },
      },
    },
  });

  const [nextSet, followingSet] = sundaySets;

  function toDashboardSet(
    set: (typeof sundaySets)[number] | undefined,
  ): DashboardSet | null {
    if (!set) return null;
    const teamMemberIds = new Set(
      set.songs.flatMap((s) => s.assignments.map((a) => a.teamMemberId)),
    );
    return {
      id: set.id,
      title: set.title,
      theme: set.theme,
      leaderName: set.leaderName,
      serviceDate: set.serviceDate,
      songCount: set.songs.length,
      teamMemberCount: teamMemberIds.size,
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
    if (!nextSet.leaderName) {
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
    const unassignedCount = nextSet.songs.filter((s) => s.assignments.length === 0).length;
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

  if (!isLeaderView) {
    const member = await prisma.teamMember.findFirst({ where: { teamId, userId } });
    if (member) {
      const roleLabel = member.instrument || member.role;
      const isVocalist = /vocal/i.test(member.role) || /vocal/i.test(member.instrument ?? "");
      const assignedSongs =
        nextSet?.songs.filter((s) => s.assignments.some((a) => a.teamMemberId === member.id)) ?? [];
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
  };
}
