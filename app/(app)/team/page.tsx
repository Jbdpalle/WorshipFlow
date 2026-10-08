import { requireUser, isLeaderRole, isAdminRole } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { Users } from "lucide-react";
import { SectionHeader } from "@/components/ui/section-header";
import { TeamRoster } from "@/components/team/team-roster";
import { ChurchAccessList } from "@/components/team/church-access-list";
import { listChurchAccess } from "@/lib/actions/team";

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
      <SectionHeader
        level={1} icon={Users} stage="assign"
        label="Team"
        title={team.name}
        description={`${members.length} member${members.length === 1 ? "" : "s"}. What someone plays, their account, and their invitation are shown separately.`}
      />
      <TeamRoster members={members} pendingInvites={pendingInvites} isLeader={isLeader} isAdmin={isAdmin} />
      {isLeader && <ChurchAccessList rows={churchAccess} isAdmin={isAdmin} />}
    </div>
  );
}
