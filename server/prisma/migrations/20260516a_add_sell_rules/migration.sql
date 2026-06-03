-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('BUY', 'SELL');

-- AlterTable: add type column to transactions (default BUY so existing rows are unaffected)
ALTER TABLE "transactions" ADD COLUMN "type" "TransactionType" NOT NULL DEFAULT 'BUY';

-- CreateTable: sell_rules
CREATE TABLE "sell_rules" (
    "id" TEXT NOT NULL,
    "dca_plan_id" TEXT NOT NULL,
    "min_profit" DOUBLE PRECISION NOT NULL,
    "max_profit" DOUBLE PRECISION NOT NULL,
    "sell_amount" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sell_rules_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "sell_rules" ADD CONSTRAINT "sell_rules_dca_plan_id_fkey" FOREIGN KEY ("dca_plan_id") REFERENCES "dca_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Merge: add sell_amount_type (was separate migration, merged here to fix shadow DB ordering)
ALTER TABLE "sell_rules" ADD COLUMN IF NOT EXISTS "sell_amount_type" TEXT NOT NULL DEFAULT 'USD';
