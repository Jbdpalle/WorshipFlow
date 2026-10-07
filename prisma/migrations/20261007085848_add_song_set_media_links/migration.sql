-- AlterTable
ALTER TABLE "Song" ADD COLUMN     "spotifyUrl" TEXT,
ADD COLUMN     "youtubeUrl" TEXT;

-- AlterTable
ALTER TABLE "WorshipSet" ADD COLUMN     "spotifyPlaylistUrl" TEXT,
ADD COLUMN     "youtubePlaylistUrl" TEXT;
