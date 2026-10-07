-- CreateTable
CREATE TABLE "SongThemeCategory" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "SongThemeCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SongThemeCategory_songId_idx" ON "SongThemeCategory"("songId");

-- CreateIndex
CREATE UNIQUE INDEX "SongThemeCategory_songId_label_key" ON "SongThemeCategory"("songId", "label");

-- AddForeignKey
ALTER TABLE "SongThemeCategory" ADD CONSTRAINT "SongThemeCategory_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;
