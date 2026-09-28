import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { SongChart } from "@/components/songs/song-chart";

export default async function SongChartPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { team } = await requireUser();

  const song = await prisma.song.findUnique({
    where: { id },
    include: {
      sections: {
        orderBy: { order: "asc" },
        select: { id: true, label: true, lyricsChords: true },
      },
    },
  });

  if (!song || song.teamId !== team.id) notFound();

  return <SongChart song={song} />;
}
