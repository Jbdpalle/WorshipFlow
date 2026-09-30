import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { TeamRoster } from "@/components/team/team-roster";

// Image-based roster import calls the Anthropic API, which can take longer
// than Vercel's default serverless timeout — see the same note on
// app/(app)/songs/page.tsx.
export const maxDuration = 60;

export default async function TeamPage() {
  const { team } = await requireUser();
  const members = await prisma.teamMember.findMany({
    where: { teamId: team.id },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Team</h1>
        <p className="text-sm text-muted-foreground">{team.name} — {members.length} members</p>
      </div>
      <TeamRoster members={members} />
    </div>
  );
}
