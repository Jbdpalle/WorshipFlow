import { notFound } from "next/navigation";
import { requireUser, isLeaderRole } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { SongChart } from "@/components/songs/song-chart";

export default async function SongChartPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ setSongId?: string }>;
}) {
  const { id } = await params;
  const { setSongId } = await searchParams;
  const { team, membershipRole } = await requireUser();
  const isLeader = isLeaderRole(membershipRole);

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

  // A set may want this song a different key than the song's own key,
  // without changing that stored key — e.g. SetSong.overrideKey here.
  let initialKey = song.key;
  if (setSongId) {
    const setSong = await prisma.setSong.findUnique({
      where: { id: setSongId },
      include: { set: true },
    });
    if (setSong && setSong.set.teamId === team.id && setSong.songId === song.id && setSong.overrideKey) {
      initialKey = setSong.overrideKey;
    }
  }

  return <SongChart song={song} initialKey={initialKey} isLeader={isLeader} />;
}
