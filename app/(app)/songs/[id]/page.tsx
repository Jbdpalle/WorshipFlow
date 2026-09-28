import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { SongHeaderEditor } from "@/components/songs/song-header-editor";
import { TagEditor } from "@/components/songs/tag-editor";
import { ArrangementEditor } from "@/components/songs/arrangement-editor";
import { TeamNotesEditor, PersonalNoteEditor } from "@/components/songs/note-editors";
import { RehearsalHistoryList } from "@/components/songs/rehearsal-history";
import { ChangeLogPanel } from "@/components/songs/change-log";

export default async function SongDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, team } = await requireUser();

  const song = await prisma.song.findUnique({
    where: { id },
    include: {
      tags: true,
      bibleRefs: true,
      sections: {
        orderBy: { order: "asc" },
        include: { roleNotes: true },
      },
      rehearsals: {
        orderBy: { occurredAt: "desc" },
        include: { notes: true },
      },
      changeLogs: { orderBy: { createdAt: "desc" } },
      personalNotes: { where: { userId: user.id } },
    },
  });

  if (!song || song.teamId !== team.id) notFound();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Song</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SongHeaderEditor songId={song.id} song={song} />
          <TagEditor songId={song.id} tags={song.tags} />
        </CardContent>
      </Card>

      <Tabs
        tabs={[
          {
            key: "arrangement",
            label: "Arrangement & Role Notes",
            content: <ArrangementEditor songId={song.id} initialSections={song.sections} />,
          },
          {
            key: "notes",
            label: "Notes",
            content: (
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Song Notes (whole team)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TeamNotesEditor songId={song.id} initialNotes={song.notes ?? ""} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">My Personal Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PersonalNoteEditor
                      songId={song.id}
                      initialNote={song.personalNotes[0]?.content ?? ""}
                    />
                  </CardContent>
                </Card>
              </div>
            ),
          },
          {
            key: "history",
            label: "Rehearsal History",
            content: (
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Rehearsals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RehearsalHistoryList rehearsals={song.rehearsals} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">What Changed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChangeLogPanel songId={song.id} changes={song.changeLogs} />
                  </CardContent>
                </Card>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
