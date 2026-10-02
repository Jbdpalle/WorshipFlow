import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MyPartMemberPicker } from "@/components/team/my-part-member-picker";
import { PrepareMeCard } from "@/components/team/prepare-me-card";
import { selectRoleNoteForViewer } from "@/lib/songs/role-notes";

// "Prepare Me" calls the Anthropic API, which can take longer than
// Vercel's default serverless timeout — see the same note on
// app/(app)/songs/page.tsx.
export const maxDuration = 60;

export default async function MyPartPage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string }>;
}) {
  const { user, team } = await requireUser();
  const { member: memberIdParam } = await searchParams;

  const members = await prisma.teamMember.findMany({
    where: { teamId: team.id },
    orderBy: { name: "asc" },
  });

  const activeMember =
    members.find((m) => m.id === memberIdParam) ??
    members.find((m) => m.userId === user.id) ??
    members[0];

  const assignments = activeMember
    ? await prisma.songAssignment.findMany({
        where: { teamMemberId: activeMember.id },
        include: {
          setSong: {
            include: {
              set: true,
              song: {
                include: {
                  sections: { include: { roleNotes: true }, orderBy: { order: "asc" } },
                  changeLogs: { orderBy: { createdAt: "desc" }, take: 2 },
                },
              },
            },
          },
        },
        orderBy: { setSong: { set: { serviceDate: "desc" } } },
      })
    : [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextSetId = activeMember
    ? (
        await prisma.worshipSet.findFirst({
          where: {
            teamId: team.id,
            songs: { some: { assignments: { some: { teamMemberId: activeMember.id } } } },
            OR: [{ serviceDate: { gte: today } }, { serviceDate: null }],
          },
          orderBy: [{ serviceDate: "asc" }, { createdAt: "desc" }],
          select: { id: true },
        })
      )?.id
    : null;
  const prepareAssignments = nextSetId ? assignments.filter((a) => a.setSong.set.id === nextSetId) : [];
  const nextSet = prepareAssignments[0]?.setSong.set ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">My Part</h1>
          <p className="text-sm text-muted-foreground">
            Only what {activeMember?.name ?? "this person"} needs to know — nothing else.
          </p>
        </div>
        <MyPartMemberPicker members={members} activeId={activeMember?.id} />
      </div>

      {activeMember && nextSet && prepareAssignments.length > 0 && (
        <PrepareMeCard
          memberId={activeMember.id}
          memberName={activeMember.name}
          setId={nextSet.id}
          setTitle={nextSet.title}
          setDate={nextSet.serviceDate}
          assignments={prepareAssignments}
        />
      )}

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No songs assigned yet. Assignments happen from the Setlist Builder.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {assignments.map((a) => (
            <Card key={a.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">
                    <Link href={`/songs/${a.setSong.song.id}`} className="hover:text-accent">
                      {a.setSong.song.title}
                    </Link>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {a.setSong.set.title}
                    {a.setSong.set.serviceDate &&
                      ` — ${new Date(a.setSong.set.serviceDate).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Badge variant="accent">{a.role}</Badge>
                  {a.setSong.song.key && <Badge variant="outline">Key {a.setSong.song.key}</Badge>}
                  {a.setSong.song.bpm && <Badge variant="outline">{a.setSong.song.bpm} BPM</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {a.setSong.song.sections.map((section) => {
                  // A note aimed at one specific person (visibility: PERSON)
                  // takes priority over a shared TEAM/ROLE note for that
                  // person, and is never shown to anyone else playing the
                  // same role — see selectRoleNoteForViewer.
                  const note = selectRoleNoteForViewer(section.roleNotes, a.role, activeMember!.id);
                  if (!note) return null;
                  return (
                    <div key={section.id} className="rounded-lg bg-surface-muted px-3 py-2 text-sm">
                      <span className="font-semibold">
                        {section.label}
                        {section.repeatCount && section.repeatCount > 1 ? ` ×${section.repeatCount}` : ""}:{" "}
                      </span>
                      {note.content}
                    </div>
                  );
                })}
                {a.setSong.song.sections.every(
                  (s) => !selectRoleNoteForViewer(s.roleNotes, a.role, activeMember!.id),
                ) && (
                  <p className="text-sm text-muted-foreground">
                    No specific instructions yet for {a.role} — play it as written.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
