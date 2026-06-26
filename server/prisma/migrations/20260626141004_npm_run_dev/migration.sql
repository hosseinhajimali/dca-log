/*
  Warnings:

  - You are about to drop the column `per_asset_rules` on the `dca_plans` table. All the data in the column will be lost.
  - You are about to drop the `buying_rules` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sell_rules` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "buying_rules" DROP CONSTRAINT "buying_rules_dca_plan_id_fkey";

-- DropForeignKey
ALTER TABLE "sell_rules" DROP CONSTRAINT "sell_rules_dca_plan_id_fkey";

-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "ath_override" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "dca_plans" DROP COLUMN "per_asset_rules";

-- DropTable
DROP TABLE "buying_rules";

-- DropTable
DROP TABLE "sell_rules";
