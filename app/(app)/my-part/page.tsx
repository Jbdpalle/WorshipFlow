import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { MyPartCard } from "@/components/team/my-part-card";
import { Music2, UserCircle } from "lucide-react";
import { MyPartMemberPicker } from "@/components/team/my-part-member-picker";
import { PrepareMeCard } from "@/components/team/prepare-me-card";
import { MyRosterCard } from "@/components/team/my-roster-card";
import { resolveMemberSongRoles } from "@/lib/songs/assignment-resolver";
import { getMyRosterData } from "@/lib/dashboard/data";
import { groupMembersByName } from "@/lib/songs/member-name";
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
  // A leader who isn't themselves on the roster, and hasn't picked anyone
  // via the picker yet, gets no active member at all — never a silent
  // default to whichever person happens to sort first, which looked like
  // that person had been deliberately chosen.
  const activeMember = members.find((m) => m.id === memberIdParam) ?? ownMember;
  const isOwnView = !!activeMember && activeMember.id === ownMember?.id;

  // Two TeamMember rows can share one real person's name (see
  // lib/songs/member-name.ts) — e.g. a roster import that didn't exactly
  // match an existing row. The picker already shows each name once; this
  // merges every id behind that name so switching to the "other" duplicate
  // never silently hides a real assignment.
  const memberIds = activeMember
    ? groupMembersByName(members).find((g) => g.ids.includes(activeMember.id))?.ids ?? [activeMember.id]
    : [];

  const myRoster = memberIds.length ? await getMyRosterData(memberIds) : { upcoming: [], recent: [] };

  // A person's part can come from either an explicit per-song override
  // (SongAssignment) or the default role(s) they hold for the whole
  // service (SetTeamMember, set via the "Worship Team" card) — see
  // resolveMemberSongRoles. Checking only the former was the root cause of
  // My Part showing nothing for anyone assigned the normal, whole-set way.
  const resolvedRoles = memberIds.length ? await resolveMemberSongRoles(prisma, memberIds) : [];

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
          // The transition OUT of this song (into whatever comes next in the
          // set) — reused as-is from the Setlist Builder's Transition model,
          // just resolved down to this musician's own piece of it below.
          transitionFrom: {
            include: {
              roleNotes: true,
              toSetSong: { include: { song: { select: { title: true } } } },
            },
          },
        },
      })
    : [];
  const setSongById = new Map(setSongRows.map((ss) => [ss.id, ss]));

  // Merging resolvedRoles across sibling duplicate-name ids (above) can
  // produce the same (setSong, role) pair twice — e.g. both duplicate rows
  // got assigned the same role for the same service — so dedupe by id
  // rather than assume resolveMemberSongRoles already returns unique pairs.
  const assignmentsById = new Map<string, { id: string; role: string; setSong: NonNullable<ReturnType<typeof setSongById.get>> }>();
  for (const r of resolvedRoles) {
    const setSong = setSongById.get(r.setSongId);
    if (!setSong) continue;
    const id = `${r.setSongId}:${r.role}`;
    if (!assignmentsById.has(id)) assignmentsById.set(id, { id, role: r.role, setSong });
  }

  const assignments = [...assignmentsById.values()]
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

  // Presentation grouping only: this service's songs in set order first,
  // everything else after (same data, same order as before for the rest).
  const nextAssignments = [...prepareAssignments].sort((x, y) => x.setSong.order - y.setSong.order);
  const otherAssignments = assignments.filter((a) => !prepareAssignments.includes(a));
  const firstName = activeMember?.name.split(" ")[0] ?? "this person";

  // A leader who isn't themselves on the roster and hasn't picked anyone
  // yet — show the picker and a plain prompt, never another person's part
  // by silent default.
  if (!activeMember) {
    return (
      <div className="space-y-8">
        <SectionHeader
          level={1} icon={UserCircle} stage="mypart"
          label="My Part"
          title="Preview a musician's part"
          description="Pick someone from the team to see exactly what they'll see."
          action={<MyPartMemberPicker members={members} activeId={undefined} isOwnView={false} />}
        />
        <EmptyState
          icon={Music2} stage="mypart"
          title="No one selected yet"
          description="Choose a team member above to preview their part — what they play, their directions, nothing else."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        level={1} icon={UserCircle} stage="mypart"
        title={isOwnView ? "What I play" : `${firstName}'s part`}
        label="My Part"
        description={`Only what ${activeMember.name} needs to know. Nothing else.`}
        action={<MyPartMemberPicker members={members} activeId={activeMember.id} isOwnView={isOwnView} />}
      />

      {activeMember && <MyRosterCard data={myRoster} memberName={activeMember.name} />}

      {assignments.length === 0 ? (
        <EmptyState
          icon={Music2} stage="mypart"
          title={isOwnView ? "No songs assigned to you yet" : `No songs assigned to ${activeMember?.name ?? "this person"} yet`}
          description="A worship leader assigns people to a service from its Worship Team card, or to one song from that song's details. Once you're assigned, your part appears here automatically."
          action={
            <ButtonLink href="/sets" variant="outline">View services</ButtonLink>
          }
        />
      ) : (
        <>
          {activeMember && nextSet && nextAssignments.length > 0 && (
            <section className="space-y-4">
              <SectionHeader
                label="Next service"
                title={nextSet.title}
                description={
                  nextSet.serviceDate
                    ? new Date(nextSet.serviceDate).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
                    : "No date set"
                }
              />
              {nextAssignments.map((a) => (
                <MyPartCard key={a.id} assignment={a} memberId={activeMember.id} />
              ))}
              <PrepareMeCard
                memberId={activeMember.id}
                memberName={activeMember.name}
                setId={nextSet.id}
                setTitle={nextSet.title}
                setDate={nextSet.serviceDate}
                assignments={nextAssignments}
              />
            </section>
          )}

          {activeMember && otherAssignments.length > 0 && (
            <section className="space-y-4">
              <SectionHeader level={2} title="Other services" description="Earlier and later services you are part of." />
              {otherAssignments.map((a) => (
                <MyPartCard key={a.id} assignment={a} memberId={activeMember.id} muted showSet />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
