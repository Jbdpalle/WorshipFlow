-- CreateEnum
CREATE TYPE "NoteVisibility" AS ENUM ('TEAM', 'ROLE', 'PERSON');

-- CreateEnum
CREATE TYPE "ArrangementChangeStatus" AS ENUM ('PROPOSED', 'KEPT', 'DISCARDED');

-- AlterTable
ALTER TABLE "Song" ADD COLUMN     "visionNote" TEXT;

-- AlterTable
ALTER TABLE "SongRoleNote" ADD COLUMN     "teamMemberId" TEXT,
ADD COLUMN     "visibility" "NoteVisibility" NOT NULL DEFAULT 'TEAM';

-- AlterTable
ALTER TABLE "SongSection" ADD COLUMN     "repeatCount" INTEGER;

-- AlterTable
ALTER TABLE "WorshipSet" ADD COLUMN     "anchorSongId" TEXT,
ADD COLUMN     "liveSectionId" TEXT,
ADD COLUMN     "liveSetSongId" TEXT,
ADD COLUMN     "liveUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SetTeamMember" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "SetTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArrangementChange" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "proposedContent" TEXT NOT NULL,
    "previousContent" TEXT,
    "status" "ArrangementChangeStatus" NOT NULL DEFAULT 'PROPOSED',
    "rehearsalId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ArrangementChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SetTeamMember_setId_idx" ON "SetTeamMember"("setId");

-- CreateIndex
CREATE INDEX "SetTeamMember_teamMemberId_idx" ON "SetTeamMember"("teamMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "SetTeamMember_setId_teamMemberId_role_key" ON "SetTeamMember"("setId", "teamMemberId", "role");

-- CreateIndex
CREATE INDEX "ArrangementChange_songId_idx" ON "ArrangementChange"("songId");

-- CreateIndex
CREATE INDEX "ArrangementChange_sectionId_idx" ON "ArrangementChange"("sectionId");

-- CreateIndex
CREATE INDEX "ArrangementChange_rehearsalId_idx" ON "ArrangementChange"("rehearsalId");

-- CreateIndex
CREATE INDEX "ArrangementChange_status_idx" ON "ArrangementChange"("status");

-- CreateIndex
CREATE INDEX "SongRoleNote_teamMemberId_idx" ON "SongRoleNote"("teamMemberId");

-- CreateIndex
CREATE INDEX "WorshipSet_anchorSongId_idx" ON "WorshipSet"("anchorSongId");

-- CreateIndex
CREATE INDEX "WorshipSet_liveSetSongId_idx" ON "WorshipSet"("liveSetSongId");

-- CreateIndex
CREATE INDEX "WorshipSet_liveSectionId_idx" ON "WorshipSet"("liveSectionId");

-- AddForeignKey
ALTER TABLE "SongRoleNote" ADD CONSTRAINT "SongRoleNote_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorshipSet" ADD CONSTRAINT "WorshipSet_anchorSongId_fkey" FOREIGN KEY ("anchorSongId") REFERENCES "Song"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorshipSet" ADD CONSTRAINT "WorshipSet_liveSetSongId_fkey" FOREIGN KEY ("liveSetSongId") REFERENCES "SetSong"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorshipSet" ADD CONSTRAINT "WorshipSet_liveSectionId_fkey" FOREIGN KEY ("liveSectionId") REFERENCES "SongSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetTeamMember" ADD CONSTRAINT "SetTeamMember_setId_fkey" FOREIGN KEY ("setId") REFERENCES "WorshipSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetTeamMember" ADD CONSTRAINT "SetTeamMember_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArrangementChange" ADD CONSTRAINT "ArrangementChange_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArrangementChange" ADD CONSTRAINT "ArrangementChange_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "SongSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArrangementChange" ADD CONSTRAINT "ArrangementChange_rehearsalId_fkey" FOREIGN KEY ("rehearsalId") REFERENCES "Rehearsal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArrangementChange" ADD CONSTRAINT "ArrangementChange_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
