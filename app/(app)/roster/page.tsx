import { ClipboardList } from "lucide-react";
import { requireUser, isLeaderRole } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { getRosterPageData } from "@/lib/dashboard/data";
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Roster</h1>
          <p className="text-sm text-muted-foreground">
            Who&apos;s serving, when — plan ahead, or import a schedule and it shows up here.
          </p>
        </div>
        {isLeader && <ImportRosterDialog />}
      </div>

      {entries.length === 0 && !isLeader ? (
        <section className="rounded-2xl border border-border bg-surface p-8 text-center shadow-sm sm:p-12">
          <ClipboardList className="mx-auto h-9 w-9 text-accent" aria-hidden />
          <h2 className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            No roster yet
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Your worship leader hasn&apos;t scheduled anything yet — check back soon.
          </p>
        </section>
      ) : (
        <RosterBoard entries={entries} members={members} isLeader={isLeader} />
      )}
    </div>
  );
}
