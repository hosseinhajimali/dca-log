/**
 * Seed script — import transactions from CSV data
 * Run: npx tsx prisma/seed-transactions.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const USER_EMAIL = 'hossein.hajimali@gmail.com';

// Raw CSV rows: [date DD/MM/YYYY, symbol, quantity, pricePerUnit]
const rows: [string, string, number, number][] = [
  ['10/08/2025', 'BTC', 0.00067828, 118130.89],
  ['10/08/2025', 'ETH', 0.01907132, 4227.33],
  ['12/08/2025', 'BTC', 0.00064369, 118985.01],
  ['12/08/2025', 'ETH', 0.01778066, 4308.03],
  ['05/09/2025', 'ETH', 0.03108624, 4402.20],
  ['05/09/2025', 'BTC', 0.0012269,  112215.36],
  ['03/10/2025', 'BTC', 0.00099029, 120600.00],
  ['03/10/2025', 'ETH', 0.02675961, 4490.00],
  ['11/10/2025', 'BTC', 0.00097877, 113500.00],
  ['11/10/2025', 'ETH', 0.08653911, 3858.08],
  ['30/10/2025', 'BTC', 0.00217867, 106932.00],
  ['30/10/2025', 'ETH', 0.06190224, 3764.00],
  ['14/11/2025', 'BTC', 0.00174421, 97270.00],
  ['14/11/2025', 'ETH', 0.05292373, 3209.28],
  ['15/11/2025', 'ETH', 0.01959405, 3175.67],
  ['15/11/2025', 'BTC', 0.00064674, 96226.36],
  ['05/12/2025', 'ETH', 0.03699702, 3109.78],
  ['05/12/2025', 'BTC', 0.00127261, 90468.87],
  ['05/01/2026', 'ETH', 0.03656956, 3193.95],
  ['05/01/2026', 'BTC', 0.00123555, 93950.04],
  ['14/01/2026', 'ETH', 0.03472945, 3323.92],
  ['14/01/2026', 'BTC', 0.00121842, 94767.98],
  ['03/02/2026', 'ETH', 0.027868,   2127.12],
  ['03/02/2026', 'BTC', 0.00081187, 73026.65],
  ['05/02/2026', 'BTC', 0.00329333, 60000.00],
  ['11/02/2026', 'BTC', 0.00073952, 67104.00],
  ['11/02/2026', 'ETH', 0.02537363, 1955.77],
  ['17/02/2026', 'BTC', 0.00073185, 67802.99],
  ['17/02/2026', 'BTC', 0.0004388,  67839.99],
  ['17/02/2026', 'ETH', 0.02480833, 2000.22],
  ['17/02/2026', 'ETH', 0.01487533, 2001.25],
  ['24/02/2026', 'BTC', 0.00077149, 64319.68],
  ['24/02/2026', 'ETH', 0.02681813, 1850.32],
  ['03/03/2026', 'BTC', 0.00072434, 68505.81],
  ['03/03/2026', 'ETH', 0.02505244, 1980.73],
  ['10/03/2026', 'BTC', 0.00071059, 70070.38],
  ['10/03/2026', 'ETH', 0.02441146, 2039.70],
  ['17/03/2026', 'BTC', 0.00066468, 74654.61],
  ['17/03/2026', 'ETH', 0.0212775,  2332.14],
  ['18/03/2026', 'BTC', 0.00118867, 74341.27],
  ['18/03/2026', 'ETH', 0.03779445, 2338.39],
  ['19/03/2026', 'BTC', 0.00083709, 71137.05],
  ['19/03/2026', 'ETH', 0.02717263, 2191.49],
  ['19/03/2026', 'BTC', 0.00285324, 69814.63],
  ['19/03/2026', 'ETH', 0.13824357, 2161.42],
  ['24/03/2026', 'BTC', 0.00358965, 69366.02],
  ['24/03/2026', 'ETH', 0.11762165, 2116.96],
  ['24/03/2026', 'BTC', 0.00071685, 69459.00],
  ['24/03/2026', 'ETH', 0.02350256, 2118.58],
  ['31/03/2026', 'BTC', 0.00073774, 67491.44],
  ['31/03/2026', 'ETH', 0.02378219, 2093.67],
  ['01/04/2026', 'BTC', 0.00116914, 68152.05],
  ['01/04/2026', 'ETH', 0.03778356, 2108.75],
  ['07/04/2026', 'BTC', 0.00072412, 68522.99],
  ['07/04/2026', 'ETH', 0.02374122, 2090.25],
  ['14/04/2026', 'BTC', 0.00066311, 74836.11],
  ['14/04/2026', 'ETH', 0.021161,   2344.80],
  ['05/09/2025', 'BTC', 0.028927,   83500.00],
  ['05/09/2025', 'ETH', 0.92652,    2680.00],
  ['21/04/2026', 'BTC', 0.00262645, 75581.02],
  ['21/04/2026', 'BTC', 0.00052549, 75547.21],
  ['21/04/2026', 'ETH', 0.129103,   2306.37],
  ['21/04/2026', 'ETH', 0.021532,   2304.45],
  ['21/04/2026', 'BTC', 0.0001312,  75584.08],
  ['28/04/2026', 'ETH', 0.00432317, 2293.92],
  ['28/04/2026', 'ETH', 0.02164,    2292.96],
  ['28/04/2026', 'BTC', 0.00052088, 76212.77],
  ['28/04/2026', 'ETH', 0.121953,   2287.93],
  ['28/04/2026', 'BTC', 0.00299844, 76139.01],
  ['30/04/2026', 'ETH', 0.03733495, 2259.67],
  ['30/04/2026', 'BTC', 0.00091017, 76326.08],
  ['05/05/2026', 'ETH', 0.03361579, 2362.06],
  ['05/05/2026', 'BTC', 0.0004995,  81273.70],
  ['12/05/2026', 'ETH', 0.01831037, 2276.35],
  ['12/05/2026', 'BTC', 0.0004068,  80510.55],
];

function parseDate(ddmmyyyy: string): Date {
  const [dd, mm, yyyy] = ddmmyyyy.split('/');
  return new Date(`${yyyy}-${mm}-${dd}T12:00:00.000Z`);
}

async function main() {
  // 1. Find user
  const user = await prisma.user.findUnique({ where: { email: USER_EMAIL } });
  if (!user) {
    console.error(`❌ User ${USER_EMAIL} not found. Log in to the app first to create your account.`);
    process.exit(1);
  }
  console.log(`✅ Found user: ${user.email}`);

  // 2. Upsert BTC and ETH assets
  const assetDefs = [
    { symbol: 'BTC', name: 'Bitcoin',  assetType: 'CRYPTO' as const, coingeckoId: 'bitcoin',  color: '#f7931a' },
    { symbol: 'ETH', name: 'Ethereum', assetType: 'CRYPTO' as const, coingeckoId: 'ethereum', color: '#627eea' },
  ];

  const assetMap: Record<string, string> = {};
  for (const def of assetDefs) {
    const asset = await prisma.asset.upsert({
      where: { userId_symbol: { userId: user.id, symbol: def.symbol } },
      update: {},
      create: { userId: user.id, ...def },
    });
    assetMap[def.symbol] = asset.id;
    console.log(`✅ Asset ready: ${def.symbol} (${asset.id})`);
  }

  // 3. Insert transactions
  let created = 0;
  for (const [dateStr, symbol, quantity, pricePerUnit] of rows) {
    const assetId = assetMap[symbol];
    if (!assetId) { console.warn(`⚠️  Unknown asset ${symbol}, skipping`); continue; }

    await prisma.transaction.create({
      data: {
        userId:       user.id,
        assetId,
        quantity,
        pricePerUnit,
        amountUsd:    +(quantity * pricePerUnit).toFixed(2),
        purchasedAt:  parseDate(dateStr),
      },
    });
    created++;
  }

  console.log(`\n🎉 Done — ${created} transactions imported.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
