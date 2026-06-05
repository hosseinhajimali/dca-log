import { PrismaClient } from '@prisma/client';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

function load(dir: string, name: string): Record<string, unknown>[] {
  try {
    return JSON.parse(readFileSync(join(dir, `${name}.json`), 'utf-8'));
  } catch {
    console.warn(`  ⚠ ${name}.json not found, skipping`);
    return [];
  }
}

// Convert ISO date strings back to Date objects, strip relation objects and auto-managed fields
const DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
const RELATION_KEYS = new Set([
  'user', 'asset', 'plan', 'dcaPlan', 'ruleSet',
  'allocations', 'transactions', 'buyingRules', 'goals',
  'dcaPlans', 'planAllocations', 'rows',
  'planBuyingRuleSets', 'planSellRuleSets',
]);

function clean(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (RELATION_KEYS.has(k)) continue;          // skip nested relations
    if (k === 'updatedAt') continue;              // Prisma manages this
    if (typeof v === 'string' && DATE_RE.test(v)) {
      out[k] = new Date(v);                       // parse date strings
    } else {
      out[k] = v;
    }
  }
  return out;
}

async function insertMany(label: string, rows: Record<string, unknown>[], fn: (row: Record<string, unknown>) => Promise<unknown>) {
  let ok = 0;
  for (const row of rows) {
    try {
      await fn(clean(row));
      ok++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`  ⚠ skipped ${label} ${row['id']}: ${msg.split('\n')[0]}`);
    }
  }
  console.log(`✓ ${label}: ${ok}/${rows.length}`);
}

async function restore() {
  const backupsDir = join(__dirname, '../../backups');
  const targetDir = process.argv[2]
    ? join(backupsDir, process.argv[2])
    : join(backupsDir, readdirSync(backupsDir).sort().at(-1)!);

  console.log(`Restoring from: ${targetDir}\n`);

  const users              = load(targetDir, 'users');
  const assets             = load(targetDir, 'assets');
  const dcaPlans           = load(targetDir, 'dcaPlans');
  const allocations        = load(targetDir, 'allocations');
  const buyingRuleSets     = load(targetDir, 'buyingRuleSets');
  const buyingRuleSetRows  = load(targetDir, 'buyingRuleSetRows');
  const sellRuleSets       = load(targetDir, 'sellRuleSets');
  const sellRuleSetRows    = load(targetDir, 'sellRuleSetRows');
  const planBuyingRuleSets = load(targetDir, 'planBuyingRuleSets');
  const planSellRuleSets   = load(targetDir, 'planSellRuleSets');
  const goals              = load(targetDir, 'goals');
  const transactions       = load(targetDir, 'transactions');
  const priceCache         = load(targetDir, 'priceCache');
  const exchangeRates      = load(targetDir, 'exchangeRates');

  // Insert in FK order: users -> assets -> plans -> allocations -> rule sets -> join tables -> goals -> transactions
  await insertMany('users',              users,              (d) => prisma.user.create({ data: d as never }));
  await insertMany('assets',            assets,             (d) => prisma.asset.create({ data: d as never }));
  await insertMany('dcaPlans',          dcaPlans,           (d) => prisma.dcaPlan.create({ data: d as never }));
  await insertMany('allocations',       allocations,        (d) => prisma.planAllocation.create({ data: d as never }));
  await insertMany('buyingRuleSets',    buyingRuleSets,     (d) => prisma.buyingRuleSet.create({ data: d as never }));
  await insertMany('buyingRuleSetRows', buyingRuleSetRows,  (d) => prisma.buyingRuleSetRow.create({ data: d as never }));
  await insertMany('sellRuleSets',      sellRuleSets,       (d) => prisma.sellRuleSet.create({ data: d as never }));
  await insertMany('sellRuleSetRows',   sellRuleSetRows,    (d) => prisma.sellRuleSetRow.create({ data: d as never }));
  await insertMany('planBuyingRuleSets',planBuyingRuleSets, (d) => prisma.planBuyingRuleSet.create({ data: d as never }));
  await insertMany('planSellRuleSets',  planSellRuleSets,   (d) => prisma.planSellRuleSet.create({ data: d as never }));
  await insertMany('goals',             goals,              (d) => prisma.goal.create({ data: d as never }));
  await insertMany('transactions',      transactions,       (d) => prisma.transaction.create({ data: d as never }));
  await insertMany('priceCache',        priceCache,         (d) => prisma.priceCache.create({ data: d as never }));
  await insertMany('exchangeRates',     exchangeRates,      (d) => prisma.exchangeRate.create({ data: d as never }));

  console.log('\n✅ Restore complete.');
  await prisma.$disconnect();
}

restore().catch(e => { console.error(e); process.exit(1); });
