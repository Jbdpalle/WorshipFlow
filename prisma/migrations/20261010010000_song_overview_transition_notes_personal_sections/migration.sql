-- AlterTable
ALTER TABLE "PersonalNote" ADD COLUMN     "sectionId" TEXT;

-- AlterTable
ALTER TABLE "SongRoleNote" ADD COLUMN     "cueLabel" TEXT,
ADD COLUMN     "transitionId" TEXT,
ALTER COLUMN "sectionId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "PersonalNote_sectionId_idx" ON "PersonalNote"("sectionId");

-- CreateIndex
CREATE INDEX "SongRoleNote_transitionId_idx" ON "SongRoleNote"("transitionId");

-- CreateIndex
CREATE UNIQUE INDEX "SongRoleNote_transitionId_role_teamMemberId_key" ON "SongRoleNote"("transitionId", "role", "teamMemberId");

-- AddForeignKey
ALTER TABLE "SongRoleNote" ADD CONSTRAINT "SongRoleNote_transitionId_fkey" FOREIGN KEY ("transitionId") REFERENCES "Transition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalNote" ADD CONSTRAINT "PersonalNote_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "SongSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
