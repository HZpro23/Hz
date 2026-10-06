-- DropIndex
DROP INDEX "TelegramAccount_adminId_key";

-- AlterTable
ALTER TABLE "TelegramAccount" ADD COLUMN     "name" TEXT,
ADD COLUMN     "username" TEXT;

-- CreateIndex
CREATE INDEX "TelegramAccount_adminId_idx" ON "TelegramAccount"("adminId");

