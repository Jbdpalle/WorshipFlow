-- CreateEnum
CREATE TYPE "SetLiveMode" AS ENUM ('NONE', 'PRACTICE', 'LIVE');

-- CreateEnum
CREATE TYPE "PracticeSessionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED');

-- AlterTable
ALTER TABLE "Rehearsal" ADD COLUMN     "practiceSessionId" TEXT,
ADD COLUMN     "sectionsVisited" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "WorshipSet" ADD COLUMN     "activePracticeSessionId" TEXT,
ADD COLUMN     "liveEndedAt" TIMESTAMP(3),
ADD COLUMN     "liveMode" "SetLiveMode" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "liveStartedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PracticeSession" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "PracticeSessionStatus" NOT NULL DEFAULT 'PLANNED',
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PracticeSession_setId_idx" ON "PracticeSession"("setId");

-- CreateIndex
CREATE INDEX "Rehearsal_practiceSessionId_idx" ON "Rehearsal"("practiceSessionId");

-- CreateIndex
CREATE INDEX "WorshipSet_activePracticeSessionId_idx" ON "WorshipSet"("activePracticeSessionId");

-- AddForeignKey
ALTER TABLE "WorshipSet" ADD CONSTRAINT "WorshipSet_activePracticeSessionId_fkey" FOREIGN KEY ("activePracticeSessionId") REFERENCES "PracticeSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeSession" ADD CONSTRAINT "PracticeSession_setId_fkey" FOREIGN KEY ("setId") REFERENCES "WorshipSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rehearsal" ADD CONSTRAINT "Rehearsal_practiceSessionId_fkey" FOREIGN KEY ("practiceSessionId") REFERENCES "PracticeSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
