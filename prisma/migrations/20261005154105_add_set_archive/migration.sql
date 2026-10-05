-- AlterTable
ALTER TABLE "WorshipSet" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "WorshipSet_archivedAt_idx" ON "WorshipSet"("archivedAt");
