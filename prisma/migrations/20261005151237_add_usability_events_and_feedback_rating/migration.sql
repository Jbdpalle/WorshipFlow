-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN     "rating" INTEGER;

-- CreateTable
CREATE TABLE "UsabilityEvent" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT,
    "event" TEXT NOT NULL,
    "entityId" TEXT,
    "meta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsabilityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsabilityEvent_teamId_idx" ON "UsabilityEvent"("teamId");

-- CreateIndex
CREATE INDEX "UsabilityEvent_event_idx" ON "UsabilityEvent"("event");

-- CreateIndex
CREATE INDEX "UsabilityEvent_createdAt_idx" ON "UsabilityEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "UsabilityEvent" ADD CONSTRAINT "UsabilityEvent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsabilityEvent" ADD CONSTRAINT "UsabilityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
