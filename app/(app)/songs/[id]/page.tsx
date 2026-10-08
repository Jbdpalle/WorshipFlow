import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import { SongDetailsSheet } from "@/components/songs/song-details-sheet";
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
        themeCategories: true,
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

  const facts = [
    song.key && { label: "Key", value: song.key, musical: true },
    song.bpm && { label: "Tempo", value: `${song.bpm} BPM` },
    song.timeSignature && { label: "Time", value: song.timeSignature },
    song.energy && { label: "Energy", value: song.energy.charAt(0).toUpperCase() + song.energy.slice(1) },
    song.worshipType && { label: "Type", value: song.worshipType },
  ].filter(Boolean) as { label: string; value: string; musical?: boolean }[];

  return (
    <div className="space-y-6">
      <SectionHeader
        level={1}
        label="Song"
        title={song.title}
        description={song.artist ?? undefined}
        action={
          <>
            <ButtonLink href={`/songs/${song.id}/chart`} variant="outline">
                <BookOpenText className="h-4 w-4" aria-hidden /> View chart
              </ButtonLink>
            <SongDetailsSheet>
              <SongHeaderEditor
                songId={song.id}
                song={song}
                themeCategories={song.themeCategories.map((c) => c.label)}
              />
              <TagEditor songId={song.id} tags={song.tags} />
              <ThemeVerseSuggestion songId={song.id} />
              <div className="border-t border-border pt-4">
                <DeleteSongButton songId={song.id} songTitle={song.title} />
              </div>
            </SongDetailsSheet>
          </>
        }
      />

      {(facts.length > 0 || song.tags.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {facts.map((f) => (
            <Badge key={f.label} variant={f.musical ? "musical" : "default"} className="tnum gap-1.5 px-3 py-1 text-sm">
              <span className="text-xs font-medium">{f.label}</span> {f.value}
            </Badge>
          ))}
          {song.tags.map((t) => (
            <Badge key={t.id} variant="outline" className="px-3 py-1 text-sm">
              {t.label}
            </Badge>
          ))}
        </div>
      )}

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
