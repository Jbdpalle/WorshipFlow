-- CreateTable
CREATE TABLE "DirectionPattern" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectionPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectionPatternItem" (
    "id" TEXT NOT NULL,
    "patternId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "cueLabel" TEXT,

    CONSTRAINT "DirectionPatternItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DirectionPattern_teamId_idx" ON "DirectionPattern"("teamId");

-- CreateIndex
CREATE INDEX "DirectionPatternItem_patternId_idx" ON "DirectionPatternItem"("patternId");

-- AddForeignKey
ALTER TABLE "DirectionPattern" ADD CONSTRAINT "DirectionPattern_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectionPatternItem" ADD CONSTRAINT "DirectionPatternItem_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "DirectionPattern"("id") ON DELETE CASCADE ON UPDATE CASCADE;
