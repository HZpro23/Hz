-- CreateEnum
CREATE TYPE "TelegramDraftStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TelegramMatchStatus" AS ENUM ('EXACT', 'STRONG', 'AMBIGUOUS', 'NOT_FOUND');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "createdByBot" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "posSaleToken" TEXT;

-- CreateTable
CREATE TABLE "TelegramAccount" (
    "id" TEXT NOT NULL,
    "telegramUserId" BIGINT NOT NULL,
    "adminId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversationSummary" TEXT,
    "messagesSinceSummary" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TelegramAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramChatMessage" (
    "id" TEXT NOT NULL,
    "telegramAccountId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramLinkToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramInvoiceDraft" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "telegramAccountId" TEXT NOT NULL,
    "status" "TelegramDraftStatus" NOT NULL DEFAULT 'PENDING',
    "rawTranscript" TEXT,
    "customerId" TEXT,
    "invoiceId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramInvoiceDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramInvoiceDraftItem" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "spokenName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "matchStatus" "TelegramMatchStatus" NOT NULL,
    "matchedProductId" TEXT,
    "candidateProductIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "position" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "TelegramInvoiceDraftItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramAccount_telegramUserId_key" ON "TelegramAccount"("telegramUserId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramAccount_adminId_key" ON "TelegramAccount"("adminId");

-- CreateIndex
CREATE INDEX "TelegramChatMessage_telegramAccountId_createdAt_idx" ON "TelegramChatMessage"("telegramAccountId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramLinkToken_token_key" ON "TelegramLinkToken"("token");

-- CreateIndex
CREATE INDEX "TelegramLinkToken_adminId_idx" ON "TelegramLinkToken"("adminId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramInvoiceDraft_token_key" ON "TelegramInvoiceDraft"("token");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramInvoiceDraft_invoiceId_key" ON "TelegramInvoiceDraft"("invoiceId");

-- CreateIndex
CREATE INDEX "TelegramInvoiceDraft_telegramAccountId_status_idx" ON "TelegramInvoiceDraft"("telegramAccountId", "status");

-- CreateIndex
CREATE INDEX "TelegramInvoiceDraftItem_draftId_idx" ON "TelegramInvoiceDraftItem"("draftId");

-- CreateIndex
CREATE INDEX "TelegramInvoiceDraftItem_matchedProductId_idx" ON "TelegramInvoiceDraftItem"("matchedProductId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_posSaleToken_key" ON "Invoice"("posSaleToken");

-- AddForeignKey
ALTER TABLE "TelegramAccount" ADD CONSTRAINT "TelegramAccount_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramChatMessage" ADD CONSTRAINT "TelegramChatMessage_telegramAccountId_fkey" FOREIGN KEY ("telegramAccountId") REFERENCES "TelegramAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramLinkToken" ADD CONSTRAINT "TelegramLinkToken_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramInvoiceDraft" ADD CONSTRAINT "TelegramInvoiceDraft_telegramAccountId_fkey" FOREIGN KEY ("telegramAccountId") REFERENCES "TelegramAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramInvoiceDraft" ADD CONSTRAINT "TelegramInvoiceDraft_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramInvoiceDraft" ADD CONSTRAINT "TelegramInvoiceDraft_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramInvoiceDraftItem" ADD CONSTRAINT "TelegramInvoiceDraftItem_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "TelegramInvoiceDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramInvoiceDraftItem" ADD CONSTRAINT "TelegramInvoiceDraftItem_matchedProductId_fkey" FOREIGN KEY ("matchedProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

