-- Add per_asset_rules flag to dca_plans (default false = existing group behaviour)
ALTER TABLE "dca_plans" ADD COLUMN "per_asset_rules" BOOLEAN NOT NULL DEFAULT false;
