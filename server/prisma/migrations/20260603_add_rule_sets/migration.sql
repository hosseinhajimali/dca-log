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
