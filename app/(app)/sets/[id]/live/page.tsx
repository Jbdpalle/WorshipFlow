import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { LiveSetRunner } from "@/components/rehearsal/live-set-runner";

export default async function LiveSetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, team, membershipRole } = await requireUser();

  const [set, viewerMember] = await Promise.all([
    prisma.worshipSet.findUnique({
      where: { id },
      include: {
        teamMembers: { select: { teamMemberId: true, role: true } },
        songs: {
          orderBy: { order: "asc" },
          include: {
            assignments: { select: { teamMemberId: true, role: true } },
            song: {
              include: {
                sections: {
                  orderBy: { order: "asc" },
                  include: {
                    roleNotes: true,
                    arrangementChanges: { where: { status: "PROPOSED" }, orderBy: { createdAt: "desc" } },
                  },
                },
                rehearsals: {
                  orderBy: { occurredAt: "desc" },
                  take: 1,
                  include: { notes: true },
                },
                changeLogs: { orderBy: { createdAt: "desc" }, take: 3 },
              },
            },
          },
        },
      },
    }),
    prisma.teamMember.findFirst({ where: { teamId: team.id, userId: user.id } }),
  ]);

  if (!set || set.teamId !== team.id) notFound();

  const isLeaderView = membershipRole !== "MEMBER";
  const distinctMembers = new Set(set.teamMembers.map((m) => m.teamMemberId)).size;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <LiveSetRunner
        set={{
          id: set.id,
          title: set.title,
          serviceDate: set.serviceDate?.toISOString() ?? null,
          liveMode: set.liveMode,
          liveStartedAt: set.liveStartedAt?.toISOString() ?? null,
          liveEndedAt: set.liveEndedAt?.toISOString() ?? null,
          songCount: set.songs.length,
          teamCount: distinctMembers,
        }}
        songs={set.songs}
        setTeamMembers={set.teamMembers}
        isLeaderView={isLeaderView}
        viewerTeamMemberId={viewerMember?.id ?? null}
        initialLiveSetSongId={set.liveMode === "LIVE" ? set.liveSetSongId : null}
        initialLiveSectionId={set.liveMode === "LIVE" ? set.liveSectionId : null}
      />
    </div>
  );
}
