-- Remove min_budget_usd column (replaced by amount as the committed minimum)
ALTER TABLE "dca_plans" DROP COLUMN IF EXISTS "min_budget_usd";
