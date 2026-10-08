import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { PracticeSessionRunner } from "@/components/rehearsal/practice-session-runner";

export default async function PracticeSessionPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id, sessionId } = await params;
  const { user, team, membershipRole } = await requireUser();

  const [session, set, viewerMember] = await Promise.all([
    prisma.practiceSession.findUnique({ where: { id: sessionId } }),
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

  if (!session || !set || set.teamId !== team.id || session.setId !== set.id) notFound();

  const isLeaderView = membershipRole !== "MEMBER";

  const rehearsals = await prisma.rehearsal.findMany({
    where: { practiceSessionId: session.id },
    select: { songId: true, sectionsVisited: true },
  });
  const summary = {
    durationMinutes:
      session.startedAt && session.finishedAt
        ? Math.max(1, Math.round((session.finishedAt.getTime() - session.startedAt.getTime()) / 60000))
        : null,
    songsPracticed: new Set(rehearsals.map((r) => r.songId)).size,
    sectionsCovered: new Set(rehearsals.flatMap((r) => r.sectionsVisited)).size,
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PracticeSessionRunner
        session={{
          id: session.id,
          name: session.name,
          status: session.status,
          scheduledAt: session.scheduledAt?.toISOString() ?? null,
          startedAt: session.startedAt?.toISOString() ?? null,
          finishedAt: session.finishedAt?.toISOString() ?? null,
        }}
        setId={set.id}
        setTitle={set.title}
        songs={set.songs}
        setTeamMembers={set.teamMembers}
        isLeaderView={isLeaderView}
        viewerTeamMemberId={viewerMember?.id ?? null}
        initialLiveSetSongId={set.activePracticeSessionId === session.id ? set.liveSetSongId : null}
        initialLiveSectionId={set.activePracticeSessionId === session.id ? set.liveSectionId : null}
        initialSummary={summary}
      />
    </div>
  );
}
