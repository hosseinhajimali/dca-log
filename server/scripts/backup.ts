import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = join(__dirname, `../../backups/backup_${timestamp}`);
  mkdirSync(dir, { recursive: true });

  const users        = await prisma.user.findMany();
  const assets       = await prisma.asset.findMany();
  const dcaPlans     = await prisma.dcaPlan.findMany();
  const allocations  = await prisma.planAllocation.findMany();
  const buyingRules  = await prisma.buyingRule.findMany();
  const transactions = await prisma.transaction.findMany();
  const priceCache   = await prisma.priceCache.findMany();
  const exchangeRates = await prisma.exchangeRate.findMany();

  const tables = { users, assets, dcaPlans, allocations, buyingRules, transactions, priceCache, exchangeRates };

  for (const [name, rows] of Object.entries(tables)) {
    writeFileSync(join(dir, `${name}.json`), JSON.stringify(rows, null, 2));
    console.log(`✓ ${name}: ${rows.length} rows`);
  }

  console.log(`\nBackup saved to: ${dir}`);
  await prisma.$disconnect();
}

backup().catch(e => { console.error(e); process.exit(1); });
