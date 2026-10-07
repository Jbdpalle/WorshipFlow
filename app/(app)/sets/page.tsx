import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ListMusic } from "lucide-react";
import { EVENT_TYPES } from "@/lib/songs/constants";
import { cn } from "@/lib/utils/cn";
import { getSetsPageData } from "@/lib/dashboard/data";
import { SetsBoard } from "@/components/sets/sets-board";

export default async function SetsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; archived?: string }>;
}) {
  const { type, archived } = await searchParams;
  const { team } = await requireUser();
  const showArchived = archived === "1";
  const [allSets, members, archivedCount] = await Promise.all([
    getSetsPageData(team.id, showArchived),
    prisma.teamMember.findMany({
      where: { teamId: team.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
    prisma.worshipSet.count({ where: { teamId: team.id, archivedAt: { not: null } } }),
  ]);
  const sets = type ? allSets.filter((s) => s.eventType === type) : allSets;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {showArchived ? "Archived Sets" : "Worship Sets & Events"}
        </h1>
        <Link href="/sets/new">
          <Button>
            <Plus className="h-4 w-4" /> New Event
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <Link
            href="/sets"
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              !type && !showArchived ? "bg-accent text-accent-foreground" : "bg-surface-muted text-muted-foreground",
            )}
          >
            All ({allSets.length})
          </Link>
          {!showArchived &&
            EVENT_TYPES.map((t) => {
              const count = allSets.filter((s) => s.eventType === t.value).length;
              if (count === 0) return null;
              return (
                <Link
                  key={t.value}
                  href={`/sets?type=${t.value}`}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium",
                    type === t.value
                      ? "bg-accent text-accent-foreground"
                      : "bg-surface-muted text-muted-foreground",
                  )}
                >
                  {t.label} ({count})
                </Link>
              );
            })}
        </div>
        {archivedCount > 0 && (
          <Link
            href={showArchived ? "/sets" : "/sets?archived=1"}
            className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
          >
            {showArchived ? "← Back to active sets" : `Archived (${archivedCount})`}
          </Link>
        )}
      </div>

      {sets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <ListMusic className="h-8 w-8 text-muted-foreground" aria-hidden />
            {showArchived ? (
              <p className="text-muted-foreground">No archived sets.</p>
            ) : allSets.length === 0 ? (
              <>
                <h2 className="font-semibold text-foreground">No worship sets yet</h2>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Create a service and you&apos;ll be able to build its setlist, add song flow
                  details, assign the team, and rehearse — all from that one service.
                </p>
                <Link href="/sets/new" className="mt-2">
                  <Button>
                    <Plus className="h-4 w-4" /> New Event
                  </Button>
                </Link>
              </>
            ) : (
              <p className="text-muted-foreground">No events of this type yet.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <SetsBoard entries={sets} members={members} />
      )}
    </div>
  );
}
