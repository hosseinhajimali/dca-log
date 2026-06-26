/**
 * One-command local backup.
 *
 *   npm run backup            (from the repo root)
 *
 * Writes a single timestamped JSON file to ./backups/ in the same format as the
 * in-app Export, so it can be restored through the app's Import button, or kept
 * as a plain snapshot. The backups/ folder is gitignored.
 */
import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function main() {
  // Single-user local app: prefer the local-mode user, fall back to the first.
  const user =
    (await prisma.user.findUnique({ where: { email: 'local@dcalog.local' } })) ??
    (await prisma.user.findFirst());

  if (!user) {
    console.error('No user found in the database. Nothing to back up.');
    process.exit(1);
  }
  const userId = user.id;

  const [
    assets, dcaPlans, allocations,
    buyingRuleSets, buyingRuleSetRows,
    sellRuleSets, sellRuleSetRows,
    planBuyingRuleSets, planSellRuleSets,
    goals, transactions,
  ] = await Promise.all([
    prisma.asset.findMany({ where: { userId } }),
    prisma.dcaPlan.findMany({ where: { userId } }),
    prisma.planAllocation.findMany({ where: { plan: { userId } } }),
    prisma.buyingRuleSet.findMany({ where: { userId } }),
    prisma.buyingRuleSetRow.findMany({ where: { ruleSet: { userId } } }),
    prisma.sellRuleSet.findMany({ where: { userId } }),
    prisma.sellRuleSetRow.findMany({ where: { ruleSet: { userId } } }),
    prisma.planBuyingRuleSet.findMany({ where: { plan: { userId } } }),
    prisma.planSellRuleSet.findMany({ where: { plan: { userId } } }),
    prisma.goal.findMany({ where: { userId } }),
    prisma.transaction.findMany({ where: { userId } }),
  ]);

  const backup = {
    version: 2,
    exportedAt: new Date().toISOString(),
    userId,
    data: {
      assets, dcaPlans, allocations,
      buyingRuleSets, buyingRuleSetRows,
      sellRuleSets, sellRuleSetRows,
      planBuyingRuleSets, planSellRuleSets,
      goals, transactions,
    },
  };

  const dir = join(__dirname, '../../backups');
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const file = join(dir, `dcalog_backup_${stamp}.json`);
  writeFileSync(file, JSON.stringify(backup, null, 2));

  const total = Object.values(backup.data).reduce((sum, rows) => sum + rows.length, 0);
  console.log(`Backup written: ${file}`);
  console.log(`${total} records. Restore via the app's Import, or keep this file as a snapshot.`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
