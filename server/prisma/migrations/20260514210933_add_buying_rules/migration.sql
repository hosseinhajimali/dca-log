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
