-- CreateEnum
CREATE TYPE "TeamPlan" AS ENUM ('FREE', 'PRO');

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "plan" "TeamPlan" NOT NULL DEFAULT 'FREE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "demoExpiresAt" TIMESTAMP(3),
ADD COLUMN     "tourStatus" TEXT,
ADD COLUMN     "tourStep" INTEGER NOT NULL DEFAULT 0;
