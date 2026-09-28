import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { SongLibraryList } from "@/components/songs/song-library-list";
import { NewSongDialog } from "@/components/songs/new-song-dialog";
import { ImportPdfDialog } from "@/components/songs/import-pdf-dialog";

export default async function SongLibraryPage() {
  const { team } = await requireUser();
  const songs = await prisma.song.findMany({
    where: { teamId: team.id },
    orderBy: { title: "asc" },
    include: { tags: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Song Library</h1>
          <p className="text-sm text-muted-foreground">{songs.length} songs</p>
        </div>
        <div className="flex gap-2">
          <ImportPdfDialog />
          <NewSongDialog />
        </div>
      </div>
      <SongLibraryList songs={songs} />
    </div>
  );
}
