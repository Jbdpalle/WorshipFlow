import { requireUser, isLeaderRole } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { SectionHeader } from "@/components/ui/section-header";
import { FilterChip } from "@/components/ui/filter-chip";
import { TextLink } from "@/components/ui/text-link";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { Plus, ListMusic } from "lucide-react";
import { EVENT_TYPES } from "@/lib/songs/constants";
import { getSetsPageData } from "@/lib/dashboard/data";
import { SetsBoard } from "@/components/sets/sets-board";
import { LoadSampleDataButton } from "@/components/songs/load-sample-data-button";

export default async function SetsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; archived?: string }>;
}) {
  const { type, archived } = await searchParams;
  const { team, membershipRole } = await requireUser();
  const isLeader = isLeaderRole(membershipRole);
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
      <SectionHeader
        level={1}
        label="Sets"
        title={showArchived ? "Archived sets" : "Worship sets & events"}
        action={
          <ButtonLink href="/sets/new">
              <Plus className="h-4 w-4" aria-hidden /> New set
            </ButtonLink>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <nav aria-label="Filter by event type" className="flex flex-wrap gap-2">
          <FilterChip href="/sets" selected={!type && !showArchived}>
            All ({allSets.length})
          </FilterChip>
          {!showArchived &&
            EVENT_TYPES.map((t) => {
              const count = allSets.filter((s) => s.eventType === t.value).length;
              if (count === 0) return null;
              return (
                <FilterChip key={t.value} href={`/sets?type=${t.value}`} selected={type === t.value}>
                  {t.label} ({count})
                </FilterChip>
              );
            })}
        </nav>
        {archivedCount > 0 && (
          <TextLink href={showArchived ? "/sets" : "/sets?archived=1"} className="text-muted-foreground">
            {showArchived ? "← Back to active sets" : `Archived (${archivedCount})`}
          </TextLink>
        )}
      </div>

      {sets.length === 0 ? (
        showArchived ? (
          <EmptyState
            icon={ListMusic}
            title="No archived sets"
            description="Sets you archive are kept here so you can find them later."
          />
        ) : allSets.length === 0 ? (
          <EmptyState
            icon={ListMusic}
            title="No worship sets yet"
            description="Create a service to build its setlist, add song flow, assign the team and rehearse, all in one place."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <ButtonLink href="/sets/new" size="lg">
                    <Plus className="h-4 w-4" aria-hidden /> Create your first set
                  </ButtonLink>
                {isLeader && <LoadSampleDataButton />}
              </div>
            }
          />
        ) : (
          <EmptyState
            icon={ListMusic}
            title="No events of this type"
            description="Try another filter, or create a new event."
            action={
              <ButtonLink href="/sets" variant="outline">Show all sets</ButtonLink>
            }
          />
        )
      ) : (
        <SetsBoard entries={sets} members={members} />
      )}
    </div>
  );
}
