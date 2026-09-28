-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "instrument" TEXT,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Song" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT,
    "key" TEXT,
    "bpm" INTEGER,
    "timeSignature" TEXT DEFAULT '4/4',
    "durationSeconds" INTEGER,
    "energy" TEXT,
    "themeCategory" TEXT,
    "biblicalConnection" TEXT,
    "lyricsSummary" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Song_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SongTag" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "SongTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SongSection" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "barCount" INTEGER,

    CONSTRAINT "SongSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SongRoleNote" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SongRoleNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SongAssignment" (
    "id" TEXT NOT NULL,
    "setSongId" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "SongAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorshipSet" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "theme" TEXT,
    "keywords" TEXT,
    "serviceDate" TIMESTAMP(3),
    "church" TEXT,
    "serviceType" TEXT,
    "leaderName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorshipSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetSong" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "purpose" TEXT,
    "transitionNotes" TEXT,
    "overrideKey" TEXT,
    "overrideBpm" INTEGER,
    "capo" INTEGER,

    CONSTRAINT "SetSong_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BibleReference" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "text" TEXT,
    "setId" TEXT,
    "songId" TEXT,

    CONSTRAINT "BibleReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rehearsal" (
    "id" TEXT NOT NULL,
    "setSongId" TEXT,
    "songId" TEXT NOT NULL,
    "bpmUsed" INTEGER,
    "summary" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rehearsal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RehearsalNote" (
    "id" TEXT NOT NULL,
    "rehearsalId" TEXT NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "RehearsalNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RehearsalCheck" (
    "id" TEXT NOT NULL,
    "rehearsalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RehearsalCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeLog" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "userId" TEXT,
    "field" TEXT NOT NULL,
    "fromValue" TEXT,
    "toValue" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamMemberId" TEXT,
    "songId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "page" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Team_ownerId_idx" ON "Team"("ownerId");

-- CreateIndex
CREATE INDEX "TeamMember_teamId_idx" ON "TeamMember"("teamId");

-- CreateIndex
CREATE INDEX "Song_teamId_idx" ON "Song"("teamId");

-- CreateIndex
CREATE INDEX "SongTag_songId_idx" ON "SongTag"("songId");

-- CreateIndex
CREATE UNIQUE INDEX "SongTag_songId_label_key" ON "SongTag"("songId", "label");

-- CreateIndex
CREATE INDEX "SongSection_songId_idx" ON "SongSection"("songId");

-- CreateIndex
CREATE INDEX "SongRoleNote_sectionId_idx" ON "SongRoleNote"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "SongRoleNote_sectionId_role_key" ON "SongRoleNote"("sectionId", "role");

-- CreateIndex
CREATE INDEX "SongAssignment_setSongId_idx" ON "SongAssignment"("setSongId");

-- CreateIndex
CREATE INDEX "SongAssignment_teamMemberId_idx" ON "SongAssignment"("teamMemberId");

-- CreateIndex
CREATE INDEX "WorshipSet_teamId_idx" ON "WorshipSet"("teamId");

-- CreateIndex
CREATE INDEX "SetSong_setId_idx" ON "SetSong"("setId");

-- CreateIndex
CREATE INDEX "SetSong_songId_idx" ON "SetSong"("songId");

-- CreateIndex
CREATE INDEX "BibleReference_setId_idx" ON "BibleReference"("setId");

-- CreateIndex
CREATE INDEX "BibleReference_songId_idx" ON "BibleReference"("songId");

-- CreateIndex
CREATE INDEX "Rehearsal_songId_idx" ON "Rehearsal"("songId");

-- CreateIndex
CREATE INDEX "Rehearsal_setSongId_idx" ON "Rehearsal"("setSongId");

-- CreateIndex
CREATE INDEX "RehearsalNote_rehearsalId_idx" ON "RehearsalNote"("rehearsalId");

-- CreateIndex
CREATE INDEX "RehearsalCheck_rehearsalId_idx" ON "RehearsalCheck"("rehearsalId");

-- CreateIndex
CREATE INDEX "ChangeLog_songId_idx" ON "ChangeLog"("songId");

-- CreateIndex
CREATE INDEX "PersonalNote_userId_idx" ON "PersonalNote"("userId");

-- CreateIndex
CREATE INDEX "PersonalNote_songId_idx" ON "PersonalNote"("songId");

-- CreateIndex
CREATE INDEX "Feedback_createdAt_idx" ON "Feedback"("createdAt");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Song" ADD CONSTRAINT "Song_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongTag" ADD CONSTRAINT "SongTag_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongSection" ADD CONSTRAINT "SongSection_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongRoleNote" ADD CONSTRAINT "SongRoleNote_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "SongSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongAssignment" ADD CONSTRAINT "SongAssignment_setSongId_fkey" FOREIGN KEY ("setSongId") REFERENCES "SetSong"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongAssignment" ADD CONSTRAINT "SongAssignment_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorshipSet" ADD CONSTRAINT "WorshipSet_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetSong" ADD CONSTRAINT "SetSong_setId_fkey" FOREIGN KEY ("setId") REFERENCES "WorshipSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetSong" ADD CONSTRAINT "SetSong_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BibleReference" ADD CONSTRAINT "BibleReference_setId_fkey" FOREIGN KEY ("setId") REFERENCES "WorshipSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BibleReference" ADD CONSTRAINT "BibleReference_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rehearsal" ADD CONSTRAINT "Rehearsal_setSongId_fkey" FOREIGN KEY ("setSongId") REFERENCES "SetSong"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rehearsal" ADD CONSTRAINT "Rehearsal_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RehearsalNote" ADD CONSTRAINT "RehearsalNote_rehearsalId_fkey" FOREIGN KEY ("rehearsalId") REFERENCES "Rehearsal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RehearsalCheck" ADD CONSTRAINT "RehearsalCheck_rehearsalId_fkey" FOREIGN KEY ("rehearsalId") REFERENCES "Rehearsal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RehearsalCheck" ADD CONSTRAINT "RehearsalCheck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeLog" ADD CONSTRAINT "ChangeLog_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeLog" ADD CONSTRAINT "ChangeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalNote" ADD CONSTRAINT "PersonalNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalNote" ADD CONSTRAINT "PersonalNote_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalNote" ADD CONSTRAINT "PersonalNote_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
