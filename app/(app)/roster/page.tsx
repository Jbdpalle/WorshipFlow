import { ClipboardList } from "lucide-react";
import { requireUser, isLeaderRole } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { getRosterPageData } from "@/lib/dashboard/data";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ImportRosterDialog } from "@/components/team/import-roster-dialog";
import { RosterBoard } from "@/components/roster/roster-board";

// Image-based roster import calls the Anthropic API, which can take longer
// than Vercel's default serverless timeout — see the same note on
// app/(app)/songs/page.tsx.
export const maxDuration = 60;

export default async function RosterPage() {
  const { team, membershipRole } = await requireUser();
  const isLeader = isLeaderRole(membershipRole);
  const [entries, members] = await Promise.all([
    getRosterPageData(team.id),
    prisma.teamMember.findMany({
      where: { teamId: team.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <SectionHeader
        level={1} icon={ClipboardList} stage="assign"
        label="Roster"
        title="Who's serving, and when"
        description="Plan ahead, or import a schedule and it shows up here."
        action={isLeader ? <ImportRosterDialog /> : undefined}
      />

      {entries.length === 0 && !isLeader ? (
        <EmptyState
          icon={ClipboardList} stage="assign"
          title="No roster yet"
          description="Your worship leader hasn't scheduled anything yet. Check back soon."
        />
      ) : (
        <RosterBoard entries={entries} members={members} isLeader={isLeader} />
      )}
    </div>
  );
}
