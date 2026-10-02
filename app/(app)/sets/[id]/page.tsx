import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SetlistBoard } from "@/components/setlist/setlist-board";
import { ThemeSuggestions } from "@/components/setlist/theme-suggestions";
import { AddFromLibraryDialog } from "@/components/setlist/add-from-library-dialog";
import { SetNotes } from "@/components/setlist/set-notes";
import { SetMetaEditor } from "@/components/setlist/set-meta-editor";
import { SetTeam } from "@/components/setlist/set-team";
import { SetReadiness } from "@/components/setlist/set-readiness";
import { getSetReadiness, getSongFlowStatus } from "@/lib/songs/readiness";
import { CalendarDays, PlayCircle } from "lucide-react";

export default async function SetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { team } = await requireUser();

  const set = await prisma.worshipSet.findUnique({
    where: { id },
    include: {
      bibleRefs: true,
      teamMembers: { include: { teamMember: true }, orderBy: { id: "asc" } },
      songs: {
        orderBy: { order: "asc" },
        include: {
          song: { include: { sections: { include: { roleNotes: true } } } },
          assignments: { include: { teamMember: true } },
          transitionFrom: { select: { id: true, type: true, direction: true } },
        },
      },
    },
  });

  if (!set || set.teamId !== team.id) notFound();

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
  const songsWithFlowStatus = set.songs.map((s) => ({
    ...s,
    songFlowStatus: getSongFlowStatus(s.song),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{set.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {set.serviceDate && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {new Date(set.serviceDate).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            )}
            {set.theme && <Badge variant="accent">{set.theme}</Badge>}
            {set.bibleRefs.map((ref) => (
              <Badge key={ref.id} variant="outline">
                {ref.reference}
              </Badge>
            ))}
          </div>
        </div>
        <Link href={`/rehearsal/${set.id}`}>
          <Button>
            <PlayCircle className="h-4 w-4" /> Start Rehearsal
          </Button>
        </Link>
      </div>

      <SetReadiness items={readiness} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Worship Team</CardTitle>
            </CardHeader>
            <CardContent>
              <SetTeam
                setId={set.id}
                members={set.teamMembers}
                teamMembers={teamMembers.map((m) => ({ id: m.id, name: m.name, role: m.role }))}
              />
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Setlist</h2>
            <AddFromLibraryDialog setId={set.id} librarySongs={librarySongsRaw} />
          </div>
          <SetlistBoard
            setId={set.id}
            initialSongs={songsWithFlowStatus}
            teamMembers={teamMembers.map((m) => ({ id: m.id, name: m.name, role: m.role }))}
            anchorSongId={set.anchorSongId}
          />
        </div>

        <div className="space-y-4">
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
                songOptions={set.songs.map((s) => ({ songId: s.song.id, title: s.song.title }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leader&apos;s Note</CardTitle>
            </CardHeader>
            <CardContent>
              <SetNotes setId={set.id} initialNotes={set.notes ?? ""} />
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
