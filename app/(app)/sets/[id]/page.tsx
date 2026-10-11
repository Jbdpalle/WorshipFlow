import { notFound } from "next/navigation";
import { requireUser, isLeaderRole } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { SetlistBoard } from "@/components/setlist/setlist-board";
import { ServiceOrderStrip } from "@/components/setlist/service-order-strip";
import { ThemeSuggestions } from "@/components/setlist/theme-suggestions";
import { AddFromLibraryDialog } from "@/components/setlist/add-from-library-dialog";
import { SetVision } from "@/components/setlist/set-vision";
import { SetMetaEditor } from "@/components/setlist/set-meta-editor";
import { SetTeam } from "@/components/setlist/set-team";
import { SetReadiness } from "@/components/setlist/set-readiness";
import { StartPracticeButton } from "@/components/rehearsal/start-practice-button";
import { SetActions } from "@/components/setlist/set-actions";
import { ServiceProgressPath } from "@/components/dashboard/service-progress-path";
import { getSetReadiness, getSongFlowStatus, getServiceStages } from "@/lib/songs/readiness";
import { CalendarDays, ClipboardList, Radio } from "lucide-react";

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
          transitionFrom: { select: { id: true, type: true, direction: true, roleNotes: true } },
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
  const distinctTeamMemberCount = new Set(set.teamMembers.map((tm) => tm.teamMemberId)).size;

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
            <StartPracticeButton
              setId={set.id}
              isLeader={isLeader}
              practiceInProgress={set.liveMode === "PRACTICE"}
              activeSessionId={set.activePracticeSessionId}
            />
            <ButtonLink href={`/sets/${set.id}/live`} variant="outline">
              <Radio className="h-4 w-4" aria-hidden /> Live Set
            </ButtonLink>
            <ButtonLink href={`/sets/${set.id}/practice`} variant="ghost" size="sm">
              <ClipboardList className="h-4 w-4" aria-hidden /> Sessions
            </ButtonLink>
            <SetActions
              setId={set.id}
              setTitle={set.title}
              isArchived={!!set.archivedAt}
              isLeader={isLeader}
            />
          </>
        }
      />

      <SetVision setId={set.id} notes={set.notes ?? ""} exaltation={set.exaltation ?? ""} isLeader={isLeader} />

      <Card className="p-4">
        <ServiceProgressPath stages={stages} />
      </Card>

      {/* The phone already shows the full setlist right below; the strip
          would just repeat it, so it is a tablet/desktop overview only. */}
      <div className="hidden sm:block">
        <ServiceOrderStrip songs={songsWithFlowStatus} />
      </div>

      <SetReadiness items={readiness} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <CollapsibleCard
            id="team"
            title="Worship Team"
            summary={distinctTeamMemberCount > 0 ? `${distinctTeamMemberCount} on the team` : "No one assigned yet"}
            defaultOpen={false}
          >
            <SetTeam
              setId={set.id}
              members={set.teamMembers}
              teamMembers={teamMembers.map((m) => ({ id: m.id, name: m.name, role: m.role }))}
              isLeader={isLeader}
            />
          </CollapsibleCard>

          <CollapsibleCard
            title="Setlist"
            summary={`${songsWithFlowStatus.length} song${songsWithFlowStatus.length === 1 ? "" : "s"}`}
            headerAction={isLeader ? <AddFromLibraryDialog setId={set.id} librarySongs={librarySongsRaw} /> : undefined}
            defaultOpen
          >
            <SetlistBoard
              setId={set.id}
              initialSongs={songsWithFlowStatus}
              teamMembers={teamMembers.map((m) => ({ id: m.id, name: m.name, role: m.role }))}
              anchorSongId={set.anchorSongId}
              isLeader={isLeader}
            />
          </CollapsibleCard>
        </div>

        <div className="min-w-0 space-y-4">
          <CollapsibleCard
            title="Service Details"
            summary={[set.theme, set.leaderName].filter(Boolean).join(" · ") || "Date, leader, theme, playlists"}
            defaultOpen={false}
          >
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
          </CollapsibleCard>

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
