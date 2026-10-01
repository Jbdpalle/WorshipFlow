import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { SongLibraryList } from "@/components/songs/song-library-list";
import { NewSongDialog } from "@/components/songs/new-song-dialog";
import { ImportPdfDialog } from "@/components/songs/import-pdf-dialog";
import { PasteLyricsDialog } from "@/components/songs/paste-lyrics-dialog";

// Vercel's default serverless function timeout (10s on Hobby) is shorter
// than the PDF-parsing timeout import.ts already enforces internally (25s
// per file) — without this, the platform can kill a bulk-import request
// before that internal timeout ever gets a chance to return a clean error,
// surfacing as a raw platform timeout instead. This applies to every
// Server Action invoked from this route, including importSongsFromPdfs.
export const maxDuration = 60;

export default async function SongLibraryPage() {
  const { team } = await requireUser();
  const songs = await prisma.song.findMany({
    where: { teamId: team.id },
    orderBy: { title: "asc" },
    include: { tags: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Song Library</h1>
          <p className="text-sm text-muted-foreground">{songs.length} songs</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ImportPdfDialog />
          <PasteLyricsDialog />
          <NewSongDialog />
        </div>
      </div>
      <SongLibraryList songs={songs} />
    </div>
  );
}
