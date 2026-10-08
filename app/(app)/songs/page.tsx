import { requireUser, isLeaderRole } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { Library } from "lucide-react";
import { SectionHeader } from "@/components/ui/section-header";
import { SongLibraryList } from "@/components/songs/song-library-list";
import { NewSongDialog } from "@/components/songs/new-song-dialog";
import { ImportPdfDialog } from "@/components/songs/import-pdf-dialog";
import { ImportSongMetadataDialog } from "@/components/songs/import-song-metadata-dialog";
import { PasteLyricsDialog } from "@/components/songs/paste-lyrics-dialog";
import { advanceTourIfNeeded } from "@/lib/actions/demo-tour";

// Vercel's default serverless function timeout (10s on Hobby) is shorter
// than the PDF-parsing timeout import.ts already enforces internally (25s
// per file) — without this, the platform can kill a bulk-import request
// before that internal timeout ever gets a chance to return a clean error,
// surfacing as a raw platform timeout instead. This applies to every
// Server Action invoked from this route, including importSongsFromPdfs.
export const maxDuration = 60;

export default async function SongLibraryPage() {
  const { user, team, membershipRole } = await requireUser();
  const isLeader = isLeaderRole(membershipRole);
  const songs = await prisma.song.findMany({
    where: { teamId: team.id },
    orderBy: { title: "asc" },
    include: { tags: true },
  });
  await advanceTourIfNeeded(user.id, team.id, 1);

  return (
    <div className="space-y-6">
      <SectionHeader
        level={1} icon={Library} stage="arrange"
        label="Library"
        title="Songs"
        description="Every song your team plays, with its key, tempo and arrangement."
        action={<NewSongDialog />}
      />
      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
        <span className="label-caps mr-1 shrink-0">Bring songs in</span>
        {isLeader && <ImportPdfDialog />}
        {isLeader && <ImportSongMetadataDialog />}
        <PasteLyricsDialog />
      </div>
      <SongLibraryList songs={songs} />
    </div>
  );
}
