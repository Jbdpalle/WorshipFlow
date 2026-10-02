-- CreateEnum
CREATE TYPE "TransitionType" AS ENUM ('DIRECT', 'INSTRUMENTAL', 'PAD', 'SPOKEN', 'PRAYER', 'FREE_WORSHIP', 'COUNT_IN', 'PAUSE', 'CUSTOM');

-- CreateTable
CREATE TABLE "Transition" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "fromSetSongId" TEXT NOT NULL,
    "toSetSongId" TEXT,
    "type" "TransitionType" NOT NULL DEFAULT 'CUSTOM',
    "direction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transition_fromSetSongId_key" ON "Transition"("fromSetSongId");

-- CreateIndex
CREATE INDEX "Transition_setId_idx" ON "Transition"("setId");

-- CreateIndex
CREATE INDEX "Transition_toSetSongId_idx" ON "Transition"("toSetSongId");

-- AddForeignKey
ALTER TABLE "Transition" ADD CONSTRAINT "Transition_setId_fkey" FOREIGN KEY ("setId") REFERENCES "WorshipSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transition" ADD CONSTRAINT "Transition_fromSetSongId_fkey" FOREIGN KEY ("fromSetSongId") REFERENCES "SetSong"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transition" ADD CONSTRAINT "Transition_toSetSongId_fkey" FOREIGN KEY ("toSetSongId") REFERENCES "SetSong"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DataMigration: carry forward every existing non-empty SetSong.transitionNotes
-- into a first-class Transition row (type CUSTOM, direction = the old text),
-- pointed at whichever SetSong comes next in that set's order (if any). The
-- old column is kept, not dropped — see the comment on SetSong.transitionNotes.
INSERT INTO "Transition" (id, "setId", "fromSetSongId", "toSetSongId", type, direction, "createdAt", "updatedAt")
SELECT
  'txn_' || ss.id,
  ss."setId",
  ss.id,
  (
    SELECT ss2.id FROM "SetSong" ss2
    WHERE ss2."setId" = ss."setId" AND ss2."order" > ss."order"
    ORDER BY ss2."order" ASC LIMIT 1
  ),
  'CUSTOM',
  ss."transitionNotes",
  now(),
  now()
FROM "SetSong" ss
WHERE ss."transitionNotes" IS NOT NULL AND trim(ss."transitionNotes") <> '';
