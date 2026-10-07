-- AlterTable
ALTER TABLE "User" ADD COLUMN     "currentChurchId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_currentChurchId_fkey" FOREIGN KEY ("currentChurchId") REFERENCES "Church"("id") ON DELETE SET NULL ON UPDATE CASCADE;
