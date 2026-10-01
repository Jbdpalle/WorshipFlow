import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { RehearsalMode } from "@/components/rehearsal/rehearsal-mode";

export default async function RehearsalPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const { user, team, membershipRole } = await requireUser();

  const [set, viewerMember] = await Promise.all([
    prisma.worshipSet.findUnique({
      where: { id: setId },
      include: {
        songs: {
          orderBy: { order: "asc" },
          include: {
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

  // Today, the only login every real user has is OWNER (see
  // WORSHIPFLOW_SONG_FLOW_AUDIT.md section 4) — this branch is correct and
  // ready for when per-musician logins exist, but isLeaderView is true for
  // every real session right now.
  const isLeaderView = membershipRole !== "MEMBER";

  return (
    <div className="mx-auto max-w-xl">
      <RehearsalMode
        setId={set.id}
        setTitle={set.title}
        songs={set.songs}
        isLeaderView={isLeaderView}
        viewerTeamMemberId={viewerMember?.id ?? null}
        initialLiveSetSongId={set.liveSetSongId}
        initialLiveSectionId={set.liveSectionId}
      />
    </div>
  );
}
