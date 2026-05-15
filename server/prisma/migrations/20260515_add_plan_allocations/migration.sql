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
