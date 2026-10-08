import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser, isLeaderRole } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SetlistBoard } from "@/components/setlist/setlist-board";
import { ServiceOrderStrip } from "@/components/setlist/service-order-strip";
import { ThemeSuggestions } from "@/components/setlist/theme-suggestions";
import { AddFromLibraryDialog } from "@/components/setlist/add-from-library-dialog";
import { SetNotes } from "@/components/setlist/set-notes";
import { SetExaltation } from "@/components/setlist/set-exaltation";
import { SetMetaEditor } from "@/components/setlist/set-meta-editor";
import { SetTeam } from "@/components/setlist/set-team";
import { SetReadiness } from "@/components/setlist/set-readiness";
import { SetActions } from "@/components/setlist/set-actions";
import { ServiceProgressPath } from "@/components/dashboard/service-progress-path";
import { getSetReadiness, getSongFlowStatus, getServiceStages } from "@/lib/songs/readiness";
import { CalendarDays, PlayCircle } from "lucide-react";

export default async function SetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { team, membershipRole } = await requireUser();

  const set = await prisma.worshipSet.findUnique({
    where: { id },
    include: {
      bibleRefs: true,
      teamMembers: { include: { teamMember: true }, orderBy: { id: "asc" } },
      songs: {
        orderBy: { order: "asc" },
        include: {
          song: {
            include: {
              sections: { include: { roleNotes: true } },
              rehearsals: { select: { id: true }, take: 1 },
            },
          },
          assignments: { include: { teamMember: true } },
          transitionFrom: { select: { id: true, type: true, direction: true } },
        },
      },
    },
  });

  if (!set || set.teamId !== team.id) notFound();
  const isLeader = isLeaderRole(membershipRole);

  const [librarySongsRaw, teamMembers] = await Promise.all([
    prisma.song.findMany({
      where: { teamId: team.id },
      include: { tags: true },
      orderBy: { title: "asc" },
    }),
    prisma.teamMember.findMany({ where: { teamId: team.id }, orderBy: { name: "asc" } }),
  ]);

  const alreadyInSetIds = new Set(set.songs.map((s) => s.songId));
  const readiness = getSetReadiness(set);
  const stages = getServiceStages(set);
  const songsWithFlowStatus = set.songs.map((s) => ({
    ...s,
    songFlowStatus: getSongFlowStatus(s.song),
  }));

  return (
    <div className="space-y-6">
      <SectionHeader
        level={1}
        label={set.archivedAt ? "Archived set" : "Set"}
        title={set.title}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {set.serviceDate && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" aria-hidden />
                {new Date(set.serviceDate).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            )}
            {set.theme && <Badge variant="musical">{set.theme}</Badge>}
            {set.archivedAt && <Badge variant="outline">Archived</Badge>}
            {set.bibleRefs.map((ref) => (
              <Badge key={ref.id} variant="outline">
                {ref.reference}
              </Badge>
            ))}
          </span>
        }
        action={
          <>
            <Link href={`/rehearsal/${set.id}`}>
              <Button>
                <PlayCircle className="h-4 w-4" aria-hidden /> Start rehearsal
              </Button>
            </Link>
            <SetActions
              setId={set.id}
              setTitle={set.title}
              isArchived={!!set.archivedAt}
              isLeader={isLeader}
            />
          </>
        }
      />

      <Card className="p-4">
        <ServiceProgressPath stages={stages} />
      </Card>

      <ServiceOrderStrip songs={songsWithFlowStatus} />

      <SetReadiness items={readiness} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <Card id="team">
            <CardHeader>
              <CardTitle className="text-base">Worship Team</CardTitle>
            </CardHeader>
            <CardContent>
              <SetTeam
                setId={set.id}
                members={set.teamMembers}
                teamMembers={teamMembers.map((m) => ({ id: m.id, name: m.name, role: m.role }))}
                isLeader={isLeader}
              />
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">Setlist</h2>
            {isLeader && <AddFromLibraryDialog setId={set.id} librarySongs={librarySongsRaw} />}
          </div>
          <SetlistBoard
            setId={set.id}
            initialSongs={songsWithFlowStatus}
            teamMembers={teamMembers.map((m) => ({ id: m.id, name: m.name, role: m.role }))}
            anchorSongId={set.anchorSongId}
            isLeader={isLeader}
          />
        </div>

        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Set Direction</CardTitle>
            </CardHeader>
            <CardContent>
              <SetMetaEditor
                setId={set.id}
                initialTheme={set.theme ?? ""}
                initialLeaderName={set.leaderName ?? ""}
                initialKeywords={set.keywords ?? ""}
                initialAnchorSongId={set.anchorSongId ?? ""}
                initialServiceDate={set.serviceDate ? new Date(set.serviceDate).toISOString().slice(0, 10) : ""}
                initialYoutubePlaylistUrl={set.youtubePlaylistUrl ?? ""}
                initialSpotifyPlaylistUrl={set.spotifyPlaylistUrl ?? ""}
                songOptions={set.songs.map((s) => ({ songId: s.song.id, title: s.song.title }))}
                isLeader={isLeader}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Exaltation</CardTitle>
            </CardHeader>
            <CardContent>
              <SetExaltation setId={set.id} initialExaltation={set.exaltation ?? ""} isLeader={isLeader} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leader&apos;s Note</CardTitle>
            </CardHeader>
            <CardContent>
              <SetNotes setId={set.id} initialNotes={set.notes ?? ""} isLeader={isLeader} />
            </CardContent>
          </Card>

          <ThemeSuggestions
            setId={set.id}
            theme={set.theme}
            keywords={set.keywords}
            librarySongs={librarySongsRaw}
            alreadyInSetIds={alreadyInSetIds}
          />
        </div>
      </div>
    </div>
  );
}
