import { requireUser, isLeaderRole, isAdminRole } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { TeamRoster } from "@/components/team/team-roster";
import { ChurchAccessList } from "@/components/team/church-access-list";
import { listChurchAccess } from "@/lib/actions/team";

// Image-based roster import calls the Anthropic API, which can take longer
// than Vercel's default serverless timeout — see the same note on
// app/(app)/songs/page.tsx.
export const maxDuration = 60;

export default async function TeamPage() {
  const { team, membershipRole } = await requireUser();
  const isLeader = isLeaderRole(membershipRole);
  const isAdmin = isAdminRole(membershipRole);
  const [members, pendingInvites, churchAccess] = await Promise.all([
    prisma.teamMember.findMany({
      where: { teamId: team.id },
      orderBy: { name: "asc" },
    }),
    prisma.invite.findMany({
      where: { teamId: team.id, acceptedAt: null },
      orderBy: { createdAt: "desc" },
    }),
    isLeader ? listChurchAccess() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Team</h1>
        <p className="text-sm text-muted-foreground">{team.name} — {members.length} members</p>
      </div>
      <TeamRoster members={members} pendingInvites={pendingInvites} isLeader={isLeader} isAdmin={isAdmin} />
      {isLeader && <ChurchAccessList rows={churchAccess} isAdmin={isAdmin} />}
    </div>
  );
}
