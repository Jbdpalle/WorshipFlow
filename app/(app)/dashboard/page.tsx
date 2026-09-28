import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Users, ListMusic, AlertCircle, History, Plus } from "lucide-react";

export default async function DashboardPage() {
  const { team } = await requireUser();

  const [nextSet, memberCount, songCount, recentChanges] = await Promise.all([
    prisma.worshipSet.findFirst({
      where: { teamId: team.id },
      orderBy: [{ serviceDate: "asc" }, { createdAt: "desc" }],
      include: { songs: { include: { song: { include: { rehearsals: true } } } }, bibleRefs: true },
    }),
    prisma.teamMember.count({ where: { teamId: team.id } }),
    prisma.song.count({ where: { teamId: team.id } }),
    prisma.changeLog.findMany({
      where: { song: { teamId: team.id } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { song: true },
    }),
  ]);

  const songsReady = nextSet?.songs.filter((s) => s.song.rehearsals.length > 0).length ?? 0;
  const totalSongs = nextSet?.songs.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{team.name}</p>
        </div>
        <Link href="/sets/new">
          <Button>
            <Plus className="h-4 w-4" /> New Worship Set
          </Button>
        </Link>
      </div>

      {nextSet ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg">Upcoming Service</CardTitle>
              <CardDescription>
                {nextSet.serviceDate
                  ? new Date(nextSet.serviceDate).toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })
                  : "No date set"}
              </CardDescription>
            </div>
            {nextSet.theme && <Badge variant="accent">{nextSet.theme}</Badge>}
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatBlock
              icon={<ListMusic className="h-4 w-4" />}
              label="Setlist"
              value={`${totalSongs} songs`}
            />
            <StatBlock
              icon={<Users className="h-4 w-4" />}
              label="Team"
              value={`${memberCount} members`}
            />
            <StatBlock
              icon={<CalendarDays className="h-4 w-4" />}
              label="Scripture"
              value={nextSet.bibleRefs[0]?.reference ?? "None yet"}
            />
            <StatBlock
              icon={<AlertCircle className="h-4 w-4" />}
              label="Rehearsal Status"
              value={`${songsReady}/${totalSongs} songs rehearsed`}
            />
          </CardContent>
          <div className="flex flex-wrap gap-2 border-t border-border p-4">
            <Link href={`/sets/${nextSet.id}`}>
              <Button variant="secondary" size="sm">Open Setlist</Button>
            </Link>
            <Link href={`/rehearsal/${nextSet.id}`}>
              <Button size="sm">Start Rehearsal</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-muted-foreground">You don&apos;t have a worship set yet.</p>
            <Link href="/sets/new">
              <Button>
                <Plus className="h-4 w-4" /> Create your first worship set
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <History className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Recently Changed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentChanges.length === 0 && (
            <p className="text-sm text-muted-foreground">No arrangement changes recorded yet.</p>
          )}
          {recentChanges.map((c) => (
            <Link
              key={c.id}
              href={`/songs/${c.songId}`}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-surface-muted"
            >
              <span>
                <span className="font-medium">{c.song.title}</span>
                <span className="text-muted-foreground"> — {c.field}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {c.fromValue} → {c.toValue}
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function StatBlock({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-muted p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
