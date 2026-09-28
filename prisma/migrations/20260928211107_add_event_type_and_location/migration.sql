-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('SERVICE', 'MINISTRY_SERVICE', 'REHEARSAL', 'SPECIAL_EVENT', 'CONFERENCE_CAMP', 'CUSTOM');

-- AlterTable
ALTER TABLE "WorshipSet" ADD COLUMN     "eventType" "EventType" NOT NULL DEFAULT 'SERVICE',
ADD COLUMN     "location" TEXT;

-- CreateIndex
CREATE INDEX "WorshipSet_eventType_idx" ON "WorshipSet"("eventType");
