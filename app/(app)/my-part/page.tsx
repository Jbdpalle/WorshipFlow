import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MyPartMemberPicker } from "@/components/team/my-part-member-picker";
import { PrepareMeCard } from "@/components/team/prepare-me-card";
import { selectRoleNoteForViewer } from "@/lib/songs/role-notes";
import { resolveMemberSongRoles } from "@/lib/songs/assignment-resolver";
import { trackEvent } from "@/lib/usability/track";
import { advanceTourIfNeeded } from "@/lib/actions/demo-tour";

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
  trackEvent(team.id, "my_part_opened", { userId: user.id });
  await advanceTourIfNeeded(user.id, team.id, 10);

  const members = await prisma.teamMember.findMany({
    where: { teamId: team.id },
    orderBy: { name: "asc" },
  });

  const ownMember = members.find((m) => m.userId === user.id);
  const activeMember = members.find((m) => m.id === memberIdParam) ?? ownMember ?? members[0];
  const isOwnView = !!activeMember && activeMember.id === ownMember?.id;

  // A person's part can come from either an explicit per-song override
  // (SongAssignment) or the default role(s) they hold for the whole
  // service (SetTeamMember, set via the "Worship Team" card) — see
  // resolveMemberSongRoles. Checking only the former was the root cause of
  // My Part showing nothing for anyone assigned the normal, whole-set way.
  const resolvedRoles = activeMember ? await resolveMemberSongRoles(prisma, activeMember.id) : [];

  const setSongRows = resolvedRoles.length
    ? await prisma.setSong.findMany({
        where: { id: { in: resolvedRoles.map((r) => r.setSongId) } },
        include: {
          set: true,
          song: {
            include: {
              sections: { include: { roleNotes: true }, orderBy: { order: "asc" } },
              changeLogs: { orderBy: { createdAt: "desc" }, take: 2 },
            },
          },
        },
      })
    : [];
  const setSongById = new Map(setSongRows.map((ss) => [ss.id, ss]));

  const assignments = resolvedRoles
    .flatMap((r) => {
      const setSong = setSongById.get(r.setSongId);
      return setSong ? [{ id: `${r.setSongId}:${r.role}`, role: r.role, setSong }] : [];
    })
    .sort((a, b) => {
      const aTime = a.setSong.set.serviceDate ? new Date(a.setSong.set.serviceDate).getTime() : 0;
      const bTime = b.setSong.set.serviceDate ? new Date(b.setSong.set.serviceDate).getTime() : 0;
      return bTime - aTime;
    });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const setIdsInvolved = [...new Set(assignments.map((a) => a.setSong.set.id))];
  const nextSetId = setIdsInvolved.length
    ? (
        await prisma.worshipSet.findFirst({
          where: {
            teamId: team.id,
            id: { in: setIdsInvolved },
            OR: [{ serviceDate: { gte: today } }, { serviceDate: null }],
            archivedAt: null,
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
        <MyPartMemberPicker members={members} activeId={activeMember?.id} isOwnView={isOwnView} />
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
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-muted-foreground">
              {isOwnView
                ? "No songs assigned to you yet."
                : `No songs assigned to ${activeMember?.name ?? "this person"} yet.`}
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              A worship leader assigns people to a service from its Worship Team card, or to one
              specific song from that song&apos;s Details — once you&apos;re assigned either way,
              it shows up here automatically.
            </p>
            <Link href="/sets" className="mt-1 text-sm font-medium text-accent hover:underline">
              View Services →
            </Link>
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
