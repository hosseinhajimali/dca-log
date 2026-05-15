-- DropForeignKey
ALTER TABLE "dca_plans" DROP CONSTRAINT "dca_plans_asset_id_fkey";

-- AddForeignKey
ALTER TABLE "dca_plans" ADD CONSTRAINT "dca_plans_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
