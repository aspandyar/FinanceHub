-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "is_override" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recurring_transaction_id" TEXT;

-- CreateIndex
CREATE INDEX "transactions_recurring_transaction_id_date_idx" ON "transactions"("recurring_transaction_id", "date");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurring_transaction_id_fkey" FOREIGN KEY ("recurring_transaction_id") REFERENCES "recurring_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
