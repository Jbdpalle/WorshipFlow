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
import { CalendarDays, PlayCircle } from "lucide-react";

export default async function SetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { team } = await requireUser();

  const set = await prisma.worshipSet.findUnique({
    where: { id },
    include: {
      bibleRefs: true,
      songs: {
        orderBy: { order: "asc" },
        include: {
          song: true,
          assignments: { include: { teamMember: true } },
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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Setlist</h2>
            <AddFromLibraryDialog setId={set.id} librarySongs={librarySongsRaw} />
          </div>
          <SetlistBoard
            setId={set.id}
            initialSongs={set.songs}
            teamMembers={teamMembers.map((m) => ({ id: m.id, name: m.name, role: m.role }))}
          />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Set Notes</CardTitle>
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
