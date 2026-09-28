import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, ListMusic, CalendarDays } from "lucide-react";

export default async function SetsPage() {
  const { team } = await requireUser();
  const sets = await prisma.worshipSet.findMany({
    where: { teamId: team.id },
    orderBy: [{ serviceDate: "desc" }, { createdAt: "desc" }],
    include: { songs: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Worship Sets</h1>
        <Link href="/sets/new">
          <Button>
            <Plus className="h-4 w-4" /> New Worship Set
          </Button>
        </Link>
      </div>

      {sets.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No worship sets yet. Create your first one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sets.map((set) => (
            <Link key={set.id} href={`/sets/${set.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="space-y-3 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{set.title}</h3>
                    {set.theme && <Badge variant="accent">{set.theme}</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {set.serviceDate
                        ? new Date(set.serviceDate).toLocaleDateString()
                        : "No date"}
                    </span>
                    <span className="flex items-center gap-1">
                      <ListMusic className="h-3.5 w-3.5" />
                      {set.songs.length} songs
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
