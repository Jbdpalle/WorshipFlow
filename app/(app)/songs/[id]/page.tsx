import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { SongHeaderEditor } from "@/components/songs/song-header-editor";
import { DeleteSongButton } from "@/components/songs/delete-song-button";
import { TagEditor } from "@/components/songs/tag-editor";
import { ThemeVerseSuggestion } from "@/components/songs/theme-verse-suggestion";
import { ArrangementEditor } from "@/components/songs/arrangement-editor";
import { TeamNotesEditor, PersonalNoteEditor } from "@/components/songs/note-editors";
import { RehearsalHistoryList } from "@/components/songs/rehearsal-history";
import { ChangeLogPanel } from "@/components/songs/change-log";
import { LastTimeCallout } from "@/components/songs/last-time-callout";
import { advanceTourIfNeeded } from "@/lib/actions/demo-tour";
import { BookOpenText } from "lucide-react";

// "Suggest theme & verse" calls the Anthropic API, which can take longer
// than Vercel's default serverless timeout — see the same note on
// app/(app)/songs/page.tsx.
export const maxDuration = 60;

export default async function SongDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, team } = await requireUser();

  const [song, teamMembers] = await Promise.all([
    prisma.song.findUnique({
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
    }),
    prisma.teamMember.findMany({ where: { teamId: team.id }, orderBy: { name: "asc" } }),
  ]);

  if (!song || song.teamId !== team.id) notFound();
  await advanceTourIfNeeded(user.id, team.id, 3);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Song</CardTitle>
          <div className="flex items-center gap-2">
            <Link href={`/songs/${song.id}/chart`}>
              <Button variant="secondary" size="sm">
                <BookOpenText className="h-4 w-4" /> View Chart
              </Button>
            </Link>
            <DeleteSongButton songId={song.id} songTitle={song.title} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <SongHeaderEditor songId={song.id} song={song} />
          <TagEditor songId={song.id} tags={song.tags} />
          <ThemeVerseSuggestion songId={song.id} />
        </CardContent>
      </Card>

      <LastTimeCallout lastRehearsal={song.rehearsals[0] ?? null} recentChanges={song.changeLogs.slice(0, 3)} />

      <Tabs
        tabs={[
          {
            key: "arrangement",
            label: "Song Flow",
            content: (
              <ArrangementEditor
                songId={song.id}
                initialSections={song.sections}
                initialVisionNote={song.visionNote ?? ""}
                teamMembers={teamMembers.map((m) => ({ id: m.id, name: m.name, role: m.role }))}
              />
            ),
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
