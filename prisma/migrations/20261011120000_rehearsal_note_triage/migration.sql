-- CreateEnum
CREATE TYPE "RehearsalNoteStatus" AS ENUM ('OPEN', 'KEPT', 'DISCARDED', 'CONVERTED');

-- AlterTable
ALTER TABLE "RehearsalNote" ADD COLUMN     "category" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "sectionId" TEXT,
ADD COLUMN     "status" "RehearsalNoteStatus" NOT NULL DEFAULT 'OPEN';

-- Notes recorded before triage existed are already part of rehearsal
-- history; they must not show up as a backlog of "unreviewed" notes.
UPDATE "RehearsalNote" SET "status" = 'KEPT';

-- CreateIndex
CREATE INDEX "RehearsalNote_sectionId_idx" ON "RehearsalNote"("sectionId");

-- CreateIndex
CREATE INDEX "RehearsalNote_status_idx" ON "RehearsalNote"("status");

-- AddForeignKey
ALTER TABLE "RehearsalNote" ADD CONSTRAINT "RehearsalNote_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "SongSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
