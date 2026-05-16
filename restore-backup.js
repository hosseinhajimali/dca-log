/**
 * Restore from backup_2026-05-16T06-21-11
 * Run from project root: node restore-backup.js
 */

const fs   = require('fs');
const path = require('path');

// Load DATABASE_URL from server/.env
const envPath = path.join(__dirname, 'server/.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^(\w+)\s*=\s*"?([^"]+)"?/);
    if (m) process.env[m[1]] = m[2].trim();
  }
}

const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

const BACKUP = path.join(__dirname, 'backups/backup_2026-05-16T06-21-11');
const read   = (f) => JSON.parse(fs.readFileSync(path.join(BACKUP, f), 'utf-8'));
const d      = (s) => s ? new Date(s) : null;

async function main() {
  const users        = read('users.json');
  const assets       = read('assets.json');
  const dcaPlans     = read('dcaPlans.json');
  const allocations  = read('allocations.json');
  const buyingRules  = read('buyingRules.json');
  const sellRules    = fs.existsSync(path.join(BACKUP, 'sellRules.json')) ? read('sellRules.json') : [];
  const transactions = read('transactions.json');
  const priceCache   = read('priceCache.json');

  console.log(`Restoring: ${users.length} users | ${assets.length} assets | ${dcaPlans.length} plans | ${allocations.length} allocations | ${buyingRules.length} buying rules | ${sellRules.length} sell rules | ${transactions.length} txs`);

  await prisma.$transaction(async (tx) => {
    console.log('\nClearing existing data...');
    await tx.sellRule.deleteMany({});
    await tx.buyingRule.deleteMany({});
    await tx.transaction.deleteMany({});
    await tx.planAllocation.deleteMany({});
    await tx.dcaPlan.deleteMany({});
    await tx.priceCache.deleteMany({});
    await tx.asset.deleteMany({});
    await tx.goal.deleteMany({});
    await tx.user.deleteMany({});

    console.log('Restoring users...');
    for (const r of users) {
      await tx.user.create({ data: {
        id: r.id, email: r.email, name: r.name,
        passwordHash: r.passwordHash, googleId: r.googleId,
        avatar: r.avatar, currency: r.currency, isAdmin: r.isAdmin ?? false,
        createdAt: d(r.createdAt), updatedAt: d(r.updatedAt),
      }});
    }

    console.log('Restoring assets...');
    for (const r of assets) {
      await tx.asset.create({ data: {
        id: r.id, userId: r.userId, symbol: r.symbol, name: r.name,
        assetType: r.assetType, color: r.color, coingeckoId: r.coingeckoId,
        createdAt: d(r.createdAt),
      }});
    }

    console.log('Restoring price cache...');
    for (const r of priceCache) {
      await tx.priceCache.create({ data: {
        id: r.id, symbol: r.symbol, priceUsd: r.priceUsd,
        change24h: r.change24h, marketCap: r.marketCap,
        ath: r.ath, athDate: d(r.athDate),
        fetchedAt: d(r.fetchedAt),
      }});
    }

    console.log('Restoring DCA plans...');
    for (const r of dcaPlans) {
      await tx.dcaPlan.create({ data: {
        id: r.id, userId: r.userId, assetId: r.assetId, name: r.name,
        amountUsd: r.amountUsd, frequency: r.frequency,
        intervalDays: r.intervalDays, isActive: r.isActive,
        perAssetRules: r.perAssetRules ?? false,
        startDate: d(r.startDate), endDate: d(r.endDate),
        nextPurchaseDate: d(r.nextPurchaseDate),
        notes: r.notes,
        createdAt: d(r.createdAt), updatedAt: d(r.updatedAt),
      }});
    }

    console.log('Restoring allocations...');
    for (const r of allocations) {
      await tx.planAllocation.create({ data: {
        id: r.id, planId: r.planId, assetId: r.assetId,
        allocationPct: r.allocationPct,
        createdAt: d(r.createdAt),
      }});
    }

    console.log('Restoring buying rules...');
    for (const r of buyingRules) {
      await tx.buyingRule.create({ data: {
        id: r.id, dcaPlanId: r.dcaPlanId,
        minDrawdown: r.minDrawdown, maxDrawdown: r.maxDrawdown,
        buyAmount: r.buyAmount,
        createdAt: d(r.createdAt),
      }});
    }

    console.log('Restoring sell rules...');
    for (const r of sellRules) {
      await tx.sellRule.create({ data: {
        id: r.id, dcaPlanId: r.dcaPlanId,
        minProfit: r.minProfit, maxProfit: r.maxProfit,
        sellAmount: r.sellAmount,
        sellAmountType: r.sellAmountType ?? 'USD',
        createdAt: d(r.createdAt),
      }});
    }

    console.log('Restoring transactions...');
    for (const r of transactions) {
      await tx.transaction.create({ data: {
        id: r.id, userId: r.userId, assetId: r.assetId,
        dcaPlanId: r.dcaPlanId,
        type: r.type ?? 'BUY',
        amountUsd: r.amountUsd, quantity: r.quantity,
        pricePerUnit: r.pricePerUnit,
        purchasedAt: d(r.purchasedAt),
        exchange: r.exchange, notes: r.notes,
        createdAt: d(r.createdAt), updatedAt: d(r.updatedAt),
      }});
    }
  });

  console.log('\n✓ Restore complete!');
}

main()
  .catch((e) => { console.error('\n✗ Failed:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
