-- Column already created in 20260516_add_sell_rules; this is a no-op kept for migration history integrity
ALTER TABLE "sell_rules" ADD COLUMN IF NOT EXISTS "sell_amount_type" TEXT NOT NULL DEFAULT 'USD';
