/*
  Adds the Church/Membership tenancy layer above Team, and multi-role
  support for TeamMember, without losing or resetting any existing data.

  Every existing Team gets wrapped in a new Church (reusing the Team's
  own id as the Church id, since it's already a unique, stable key and
  today's data is exactly one team per "tenant"). The team's owner gets
  an OWNER membership on that church; every team member with a linked
  login gets a MEMBER membership. Each TeamMember's existing single
  `role` value is copied into the new TeamMemberRole set so multi-role
  editing has something to start from.
*/

-- CreateEnum
CREATE TYPE "ChurchRole" AS ENUM ('OWNER', 'ADMIN', 'LEADER', 'MEMBER');

-- CreateTable
CREATE TABLE "Church" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Church_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "role" "ChurchRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMemberRole" (
    "id" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "TeamMemberRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Church_ownerId_idx" ON "Church"("ownerId");

-- CreateIndex
CREATE INDEX "Membership_churchId_idx" ON "Membership"("churchId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_churchId_key" ON "Membership"("userId", "churchId");

-- CreateIndex
CREATE INDEX "TeamMemberRole_teamMemberId_idx" ON "TeamMemberRole"("teamMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMemberRole_teamMemberId_role_key" ON "TeamMemberRole"("teamMemberId", "role");

-- AddForeignKey
ALTER TABLE "Church" ADD CONSTRAINT "Church_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMemberRole" ADD CONSTRAINT "TeamMemberRole_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: add churchId nullable first so we can backfill before enforcing NOT NULL
ALTER TABLE "Team" ADD COLUMN "churchId" TEXT;

-- Backfill: one Church per existing Team, reusing the Team's id as the Church's id.
INSERT INTO "Church" ("id", "name", "ownerId", "createdAt")
SELECT t."id", t."name", t."ownerId", t."createdAt" FROM "Team" t;

-- Backfill: point each Team at its new Church.
UPDATE "Team" SET "churchId" = "id";

-- Backfill: the team owner becomes the church's OWNER.
INSERT INTO "Membership" ("id", "userId", "churchId", "role", "createdAt")
SELECT gen_random_uuid()::text, t."ownerId", t."id", 'OWNER', t."createdAt"
FROM "Team" t;

-- Backfill: every team member with a linked login becomes a MEMBER
-- (skips the owner if they also have their own TeamMember row).
INSERT INTO "Membership" ("id", "userId", "churchId", "role", "createdAt")
SELECT gen_random_uuid()::text, tm."userId", t."id", 'MEMBER', tm."createdAt"
FROM "TeamMember" tm
JOIN "Team" t ON t."id" = tm."teamId"
WHERE tm."userId" IS NOT NULL
ON CONFLICT ("userId", "churchId") DO NOTHING;

-- Backfill: copy each member's existing single role into the new multi-role set.
INSERT INTO "TeamMemberRole" ("id", "teamMemberId", "role")
SELECT gen_random_uuid()::text, "id", "role" FROM "TeamMember";

-- Now that every row has a churchId, enforce it.
ALTER TABLE "Team" ALTER COLUMN "churchId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Team_churchId_idx" ON "Team"("churchId");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;
