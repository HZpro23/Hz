-- AlterTable
ALTER TABLE "TelegramInvoiceDraft" ADD COLUMN     "paidInFull" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentAmount" DECIMAL(10,2),
ADD COLUMN     "paymentMethod" "PaymentMethod";

