/**
 * One-time data migration: Render PostgreSQL → Neon
 * Run from server/ folder:
 *   npx tsx prisma/migrate-to-neon.ts
 */

import { PrismaClient } from '@prisma/client';

const RENDER_URL = 'postgresql://dcalog_db_user:JatSWfYP9nGRBv1AnPKuFmajcaXWUlox@dpg-d84a3egjo89c73an2ntg-a.frankfurt-postgres.render.com/dcalog_db';
const NEON_URL   = 'postgresql://neondb_owner:npg_d1eg2yLxWfrk@ep-small-pine-algvztpp.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require';

const src  = new PrismaClient({ datasources: { db: { url: RENDER_URL } } });
const dest = new PrismaClient({ datasources: { db: { url: NEON_URL } } });

async function copy<T>(
  label: string,
  findMany: () => Promise<T[]>,
  createMany: (data: T[]) => Promise<{ count: number }>,
) {
  const rows = await findMany();
  if (rows.length === 0) { console.log(`  ~ ${label}: empty, skipped`); return; }
  const { count } = await createMany(rows);
  console.log(`  ✓ ${label}: ${count}/${rows.length} rows copied`);
}

async function main() {
  console.log('Connecting to both databases...');
  await src.$connect();
  await dest.$connect();
  console.log('✓ Connected\n');

  // Copy in FK-safe order
  await copy('users',
    () => src.user.findMany(),
    (data) => dest.user.createMany({ data, skipDuplicates: true }),
  );

  await copy('assets',
    () => src.asset.findMany(),
    (data) => dest.asset.createMany({ data, skipDuplicates: true }),
  );

  await copy('price_cache',
    () => src.priceCache.findMany(),
    (data) => dest.priceCache.createMany({ data, skipDuplicates: true }),
  );

  await copy('exchange_rates',
    () => src.exchangeRate.findMany(),
    (data) => dest.exchangeRate.createMany({ data, skipDuplicates: true }),
  );

  await copy('dca_plans',
    () => src.dcaPlan.findMany(),
    (data) => dest.dcaPlan.createMany({ data, skipDuplicates: true }),
  );

  await copy('plan_allocations',
    () => src.planAllocation.findMany(),
    (data) => dest.planAllocation.createMany({ data, skipDuplicates: true }),
  );

  await copy('buying_rules',
    () => src.buyingRule.findMany(),
    (data) => dest.buyingRule.createMany({ data, skipDuplicates: true }),
  );

  await copy('sell_rules',
    () => src.sellRule.findMany(),
    (data) => dest.sellRule.createMany({ data, skipDuplicates: true }),
  );

  await copy('transactions',
    () => src.transaction.findMany(),
    (data) => dest.transaction.createMany({ data, skipDuplicates: true }),
  );

  await copy('goals',
    () => src.goal.findMany(),
    (data) => dest.goal.createMany({ data, skipDuplicates: true }),
  );

  await copy('notifications',
    () => src.notification.findMany(),
    (data) => dest.notification.createMany({ data, skipDuplicates: true }),
  );

  await copy('feedbacks',
    () => src.feedback.findMany(),
    (data) => dest.feedback.createMany({ data, skipDuplicates: true }),
  );

  console.log('\n🎉 Migration complete!');
}

main()
  .catch((e) => { console.error('\n❌ Migration failed:', e.message); process.exit(1); })
  .finally(async () => { await src.$disconnect(); await dest.$disconnect(); });
