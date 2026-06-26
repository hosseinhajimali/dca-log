-- Squashed init migration (generated 2026-06-26T14:05:18Z)
-- Equivalent to the prior 23 migrations, verified to apply cleanly.

-- ===== from 20260514160933_init =====
-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('CRYPTO', 'METAL', 'STOCK', 'ETF', 'OTHER');

-- CreateEnum
CREATE TYPE "DcaFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "asset_type" "AssetType" NOT NULL,
    "coingecko_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dca_plans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "name" TEXT,
    "amount_usd" DOUBLE PRECISION NOT NULL,
    "frequency" "DcaFrequency" NOT NULL,
    "interval_days" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "start_date" TIMESTAMP(3) NOT NULL,
    "next_purchase_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dca_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "dca_plan_id" TEXT,
    "amount_usd" DOUBLE PRECISION NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "price_per_unit" DOUBLE PRECISION NOT NULL,
    "purchased_at" TIMESTAMP(3) NOT NULL,
    "exchange" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_cache" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "price_usd" DOUBLE PRECISION NOT NULL,
    "change_24h" DOUBLE PRECISION,
    "market_cap" DOUBLE PRECISION,
    "fetched_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "from_currency" TEXT NOT NULL,
    "to_currency" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "assets_user_id_symbol_key" ON "assets"("user_id", "symbol");

-- CreateIndex
CREATE UNIQUE INDEX "price_cache_symbol_key" ON "price_cache"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_from_currency_to_currency_key" ON "exchange_rates"("from_currency", "to_currency");

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dca_plans" ADD CONSTRAINT "dca_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dca_plans" ADD CONSTRAINT "dca_plans_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_dca_plan_id_fkey" FOREIGN KEY ("dca_plan_id") REFERENCES "dca_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== from 20260514203821_add_ath_to_price_cache =====
-- AlterTable
ALTER TABLE "price_cache" ADD COLUMN     "ath" DOUBLE PRECISION,
ADD COLUMN     "ath_date" TIMESTAMP(3);

-- ===== from 20260514210933_add_buying_rules =====
-- CreateTable
CREATE TABLE "buying_rules" (
    "id" TEXT NOT NULL,
    "dca_plan_id" TEXT NOT NULL,
    "min_drawdown" DOUBLE PRECISION NOT NULL,
    "max_drawdown" DOUBLE PRECISION NOT NULL,
    "buy_amount" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buying_rules_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "buying_rules" ADD CONSTRAINT "buying_rules_dca_plan_id_fkey" FOREIGN KEY ("dca_plan_id") REFERENCES "dca_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===== from 20260514214920_add_end_date_to_dca_plan =====
-- AlterTable
ALTER TABLE "dca_plans" ADD COLUMN     "end_date" TIMESTAMP(3);

-- ===== from 20260515043036_add_color_to_asset =====
-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "color" TEXT;

-- ===== from 20260515051718_add_avatar_to_user =====
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar" TEXT;

-- ===== from 20260515054830_add_google_auth =====
/*
  Warnings:

  - A unique constraint covering the columns `[google_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "google_id" TEXT,
ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- ===== from 20260515073440_add_is_admin =====
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_admin" BOOLEAN NOT NULL DEFAULT false;

-- ===== from 20260515094856_add_plan_allocations =====
-- DropForeignKey
ALTER TABLE "dca_plans" DROP CONSTRAINT "dca_plans_asset_id_fkey";

-- AddForeignKey
ALTER TABLE "dca_plans" ADD CONSTRAINT "dca_plans_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== from 20260515_add_fear_greed_rule =====
-- This migration was intentionally left empty (feature was not implemented)
SELECT 1;

-- ===== from 20260515_add_per_asset_rules =====
-- Add per_asset_rules flag to dca_plans (default false = existing group behaviour)
ALTER TABLE "dca_plans" ADD COLUMN "per_asset_rules" BOOLEAN NOT NULL DEFAULT false;

-- ===== from 20260515_add_plan_allocations =====
-- CreateTable: plan_allocations
CREATE TABLE "plan_allocations" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "allocation_pct" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_allocations_pkey" PRIMARY KEY ("id")
);

-- AlterTable: make asset_id nullable on dca_plans
ALTER TABLE "dca_plans" ALTER COLUMN "asset_id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "plan_allocations_plan_id_asset_id_key" ON "plan_allocations"("plan_id", "asset_id");

-- AddForeignKey
ALTER TABLE "plan_allocations" ADD CONSTRAINT "plan_allocations_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "dca_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "plan_allocations" ADD CONSTRAINT "plan_allocations_asset_id_fkey"
    FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Data migration: convert existing single-asset plans into 100% allocations
INSERT INTO "plan_allocations" ("id", "plan_id", "asset_id", "allocation_pct", "created_at")
SELECT
    gen_random_uuid()::text,
    "id",
    "asset_id",
    100.0,
    NOW()
FROM "dca_plans"
WHERE "asset_id" IS NOT NULL;

-- ===== from 20260516_add_goals =====
-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('ACCUMULATION', 'PORTFOLIO_VALUE', 'INVESTMENT_COMMITMENT');

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "GoalType" NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "asset_id" TEXT,
    "target_qty" DOUBLE PRECISION,
    "target_value" DOUBLE PRECISION,
    "target_monthly_amount" DOUBLE PRECISION,
    "start_date" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== from 20260516_add_notifications_feedback =====
-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DCA_REMINDER', 'SELL_RULE_MET', 'BUYING_RULE_MET');

-- CreateEnum
CREATE TYPE "FeedbackCategory" AS ENUM ('COMPLAINT', 'FEEDBACK', 'LOGIN_ISSUE', 'APP_ISSUE', 'FEATURE_REQUEST', 'OTHER');

-- CreateTable: notifications
CREATE TABLE "notifications" (
    "id"         TEXT NOT NULL,
    "user_id"    TEXT NOT NULL,
    "type"       "NotificationType" NOT NULL,
    "title"      TEXT NOT NULL,
    "message"    TEXT NOT NULL,
    "is_read"    BOOLEAN NOT NULL DEFAULT false,
    "metadata"   JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable: feedbacks
CREATE TABLE "feedbacks" (
    "id"         TEXT NOT NULL,
    "user_id"    TEXT,
    "category"   "FeedbackCategory" NOT NULL,
    "message"    TEXT NOT NULL,
    "is_read"    BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== from 20260516a_add_sell_rules =====
-- CreateEnum (idempotent)
DO $$ BEGIN
  CREATE TYPE "TransactionType" AS ENUM ('BUY', 'SELL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable: add type column to transactions (idempotent)
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "type" "TransactionType" NOT NULL DEFAULT 'BUY';

-- CreateTable: sell_rules
CREATE TABLE IF NOT EXISTS "sell_rules" (
    "id" TEXT NOT NULL,
    "dca_plan_id" TEXT NOT NULL,
    "min_profit" DOUBLE PRECISION NOT NULL,
    "max_profit" DOUBLE PRECISION NOT NULL,
    "sell_amount" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sell_rules_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey (idempotent)
DO $$ BEGIN
  ALTER TABLE "sell_rules" ADD CONSTRAINT "sell_rules_dca_plan_id_fkey" FOREIGN KEY ("dca_plan_id") REFERENCES "dca_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Merge: add sell_amount_type (was separate migration, merged here to fix shadow DB ordering)
ALTER TABLE "sell_rules" ADD COLUMN IF NOT EXISTS "sell_amount_type" TEXT NOT NULL DEFAULT 'USD';

-- ===== from 20260516b_add_sell_amount_type =====
-- Column already created in 20260516_add_sell_rules; this is a no-op kept for migration history integrity
ALTER TABLE "sell_rules" ADD COLUMN IF NOT EXISTS "sell_amount_type" TEXT NOT NULL DEFAULT 'USD';

-- ===== from 20260517_add_new_feedback_notification =====
DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE 'NEW_FEEDBACK';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===== from 20260518_add_announcements =====
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ANNOUNCEMENT';

CREATE TABLE "announcements" (
  "id"           TEXT NOT NULL,
  "title"        TEXT NOT NULL,
  "message"      TEXT NOT NULL,
  "scheduled_at" TIMESTAMP(3),
  "sent_at"      TIMESTAMP(3),
  "sent_count"   INTEGER NOT NULL DEFAULT 0,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- ===== from 20260518_add_scheduled_time =====
ALTER TABLE "dca_plans" ADD COLUMN "scheduled_time" TEXT NOT NULL DEFAULT '08:00';

-- ===== from 20260602_add_theme_to_user =====
-- AlterTable
ALTER TABLE "users" ADD COLUMN "theme" TEXT NOT NULL DEFAULT 'system';

-- ===== from 20260603_add_rule_sets =====
-- Add min/max budget columns to dca_plans
ALTER TABLE "dca_plans" ADD COLUMN IF NOT EXISTS "min_budget_usd" DOUBLE PRECISION;
ALTER TABLE "dca_plans" ADD COLUMN IF NOT EXISTS "max_budget_usd" DOUBLE PRECISION;

-- Create RuleStrategyType enum
DO $$ BEGIN
  CREATE TYPE "RuleStrategyType" AS ENUM ('DRAWDOWN_ATH');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create buying_rule_sets
CREATE TABLE IF NOT EXISTS "buying_rule_sets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "strategy_type" "RuleStrategyType" NOT NULL DEFAULT 'DRAWDOWN_ATH',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "buying_rule_sets_pkey" PRIMARY KEY ("id")
);

-- Create buying_rule_set_rows
CREATE TABLE IF NOT EXISTS "buying_rule_set_rows" (
    "id" TEXT NOT NULL,
    "rule_set_id" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "buying_rule_set_rows_pkey" PRIMARY KEY ("id")
);

-- Create plan_buying_rule_sets
CREATE TABLE IF NOT EXISTS "plan_buying_rule_sets" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "rule_set_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "plan_buying_rule_sets_pkey" PRIMARY KEY ("id")
);

-- Create sell_rule_sets
CREATE TABLE IF NOT EXISTS "sell_rule_sets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "strategy_type" "RuleStrategyType" NOT NULL DEFAULT 'DRAWDOWN_ATH',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sell_rule_sets_pkey" PRIMARY KEY ("id")
);

-- Create sell_rule_set_rows
CREATE TABLE IF NOT EXISTS "sell_rule_set_rows" (
    "id" TEXT NOT NULL,
    "rule_set_id" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "sell_amount" DOUBLE PRECISION NOT NULL,
    "sell_amount_type" TEXT NOT NULL DEFAULT 'USD',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sell_rule_set_rows_pkey" PRIMARY KEY ("id")
);

-- Create plan_sell_rule_sets
CREATE TABLE IF NOT EXISTS "plan_sell_rule_sets" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "rule_set_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "plan_sell_rule_sets_pkey" PRIMARY KEY ("id")
);

-- Foreign keys (idempotent)
DO $$ BEGIN
  ALTER TABLE "buying_rule_sets" ADD CONSTRAINT "buying_rule_sets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "buying_rule_set_rows" ADD CONSTRAINT "buying_rule_set_rows_rule_set_id_fkey" FOREIGN KEY ("rule_set_id") REFERENCES "buying_rule_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "plan_buying_rule_sets" ADD CONSTRAINT "plan_buying_rule_sets_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "dca_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "plan_buying_rule_sets" ADD CONSTRAINT "plan_buying_rule_sets_rule_set_id_fkey" FOREIGN KEY ("rule_set_id") REFERENCES "buying_rule_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "sell_rule_sets" ADD CONSTRAINT "sell_rule_sets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "sell_rule_set_rows" ADD CONSTRAINT "sell_rule_set_rows_rule_set_id_fkey" FOREIGN KEY ("rule_set_id") REFERENCES "sell_rule_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "plan_sell_rule_sets" ADD CONSTRAINT "plan_sell_rule_sets_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "dca_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "plan_sell_rule_sets" ADD CONSTRAINT "plan_sell_rule_sets_rule_set_id_fkey" FOREIGN KEY ("rule_set_id") REFERENCES "sell_rule_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Unique constraints
DO $$ BEGIN
  ALTER TABLE "plan_buying_rule_sets" ADD CONSTRAINT "plan_buying_rule_sets_plan_id_rule_set_id_key" UNIQUE ("plan_id", "rule_set_id");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "plan_sell_rule_sets" ADD CONSTRAINT "plan_sell_rule_sets_plan_id_rule_set_id_key" UNIQUE ("plan_id", "rule_set_id");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===== from 20260605_add_monthly_disposable_income =====
-- AlterTable
ALTER TABLE "users" ADD COLUMN "monthly_disposable_income" DOUBLE PRECISION;

-- ===== from 20260605_remove_min_budget =====
-- Remove min_budget_usd column (replaced by amount as the committed minimum)
ALTER TABLE "dca_plans" DROP COLUMN IF EXISTS "min_budget_usd";

