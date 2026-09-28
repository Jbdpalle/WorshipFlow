import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { RehearsalMode } from "@/components/rehearsal/rehearsal-mode";

export default async function RehearsalPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const { team } = await requireUser();

  const set = await prisma.worshipSet.findUnique({
    where: { id: setId },
    include: {
      songs: {
        orderBy: { order: "asc" },
        include: {
          song: {
            include: {
              sections: { orderBy: { order: "asc" }, include: { roleNotes: true } },
              rehearsals: {
                orderBy: { occurredAt: "desc" },
                take: 1,
                include: { notes: true },
              },
              changeLogs: { orderBy: { createdAt: "desc" }, take: 3 },
            },
          },
        },
      },
    },
  });

  if (!set || set.teamId !== team.id) notFound();

  return (
    <div className="mx-auto max-w-xl">
      <RehearsalMode setTitle={set.title} songs={set.songs} />
    </div>
  );
}
