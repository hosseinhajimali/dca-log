import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest, TransactionQuery } from '../types';
import { AppError } from '../middleware/errorHandler';

const txSchema = z.object({
  assetId: z.string().min(1),
  dcaPlanId: z.string().min(1).optional().nullable(),
  type: z.enum(['BUY', 'SELL']).optional(),
  amountUsd: z.number().positive(),
  quantity: z.number().positive(),
  pricePerUnit: z.number().positive(),
  purchasedAt: z.string().datetime(),
  exchange: z.string().optional(),
  notes: z.string().optional(),
});

const SORTABLE_FIELDS = ['purchasedAt', 'amountUsd', 'quantity', 'pricePerUnit'] as const;
type SortableField = (typeof SORTABLE_FIELDS)[number];

export async function getTransactions(req: AuthRequest & { query: TransactionQuery }, res: Response, next: NextFunction) {
  try {
    const { assetId, from, to, type, page = '1', limit = '50', sortBy = 'purchasedAt', sortOrder = 'desc' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Validate sort field to prevent injection
    const safeSortBy: SortableField = SORTABLE_FIELDS.includes(sortBy as SortableField)
      ? (sortBy as SortableField)
      : 'purchasedAt';
    const safeOrder = sortOrder === 'asc' ? 'asc' : 'desc';

    const where: Record<string, unknown> = { userId: req.userId };
    if (assetId) where.assetId = assetId;
    if (type === 'BUY' || type === 'SELL') where.type = type;
    if (from || to) {
      where.purchasedAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { asset: true, dcaPlan: { select: { id: true, name: true } } },
        orderBy: { [safeSortBy]: safeOrder },
        skip,
        take: parseInt(limit),
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({
      success: true,
      data: transactions,
      meta: { total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    next(err);
  }
}

export async function createTransaction(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = txSchema.safeParse(req.body);
    if (!body.success) {
      const e = body.error.errors[0];
      return next(new AppError(400, `${e.path.join('.')}: ${e.message}`));
    }

    const asset = await prisma.asset.findFirst({
      where: { id: body.data.assetId, userId: req.userId },
    });
    if (!asset) return next(new AppError(404, 'Asset not found'));

    const tx = await prisma.transaction.create({
      data: {
        ...body.data,
        purchasedAt: new Date(body.data.purchasedAt),
        userId: req.userId!,
      },
      include: { asset: true },
    });
    res.status(201).json({ success: true, data: tx });
  } catch (err) {
    next(err);
  }
}

export async function updateTransaction(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tx = await prisma.transaction.findFirst({ where: { id: id as string, userId: req.userId } });
    if (!tx) return next(new AppError(404, 'Transaction not found'));

    const body = txSchema.partial().safeParse(req.body);
    if (!body.success) return next(new AppError(400, body.error.errors[0].message));

    const updated = await prisma.transaction.update({
      where: { id: id as string },
      data: {
        ...body.data,
        ...(body.data.purchasedAt ? { purchasedAt: new Date(body.data.purchasedAt) } : {}),
      },
      include: { asset: true },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteTransaction(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tx = await prisma.transaction.findFirst({ where: { id: id as string, userId: req.userId } });
    if (!tx) return next(new AppError(404, 'Transaction not found'));

    await prisma.transaction.delete({ where: { id: id as string } });
    res.json({ success: true, message: 'Transaction deleted' });
  } catch (err) {
    next(err);
  }
}

export async function getTransactionHeatmap(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const { year, assetIds } = req.query as { year?: string; assetIds?: string };

    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    const startDate = new Date(`${targetYear}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${targetYear + 1}-01-01T00:00:00.000Z`);

    const where: Record<string, unknown> = {
      userId,
      type: 'BUY',
      purchasedAt: { gte: startDate, lt: endDate },
    };

    if (assetIds) {
      const ids = assetIds.split(',').filter(Boolean);
      if (ids.length > 0) where.assetId = { in: ids };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: { asset: true, dcaPlan: { select: { id: true } } },
      orderBy: { purchasedAt: 'asc' },
    });

    // Group by UTC date
    type AssetEntry = {
      assetId: string; symbol: string; name: string; color: string | null;
      totalQuantity: number; totalAmount: number; totalPriceWeighted: number;
      txCount: number; hasPlanned: boolean; hasManual: boolean;
    };
    type DayEntry = { date: string; totalAmount: number; assetMap: Map<string, AssetEntry> };
    const dayMap = new Map<string, DayEntry>();

    for (const tx of transactions) {
      const dateKey = tx.purchasedAt.toISOString().slice(0, 10);
      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, { date: dateKey, totalAmount: 0, assetMap: new Map() });
      }
      const day = dayMap.get(dateKey)!;
      day.totalAmount += tx.amountUsd;

      if (!day.assetMap.has(tx.assetId)) {
        day.assetMap.set(tx.assetId, {
          assetId: tx.assetId, symbol: tx.asset.symbol, name: tx.asset.name,
          color: tx.asset.color, totalQuantity: 0, totalAmount: 0,
          totalPriceWeighted: 0, txCount: 0, hasPlanned: false, hasManual: false,
        });
      }
      const a = day.assetMap.get(tx.assetId)!;
      a.totalQuantity += tx.quantity;
      a.totalAmount += tx.amountUsd;
      a.totalPriceWeighted += tx.pricePerUnit * tx.quantity;
      a.txCount += 1;
      if (tx.dcaPlanId) a.hasPlanned = true; else a.hasManual = true;
    }

    const days = Array.from(dayMap.values()).map((day) => ({
      date: day.date,
      totalAmount: day.totalAmount,
      assets: Array.from(day.assetMap.values()).map((a) => ({
        assetId: a.assetId, symbol: a.symbol, name: a.name, color: a.color,
        quantity: a.totalQuantity, amountUsd: a.totalAmount,
        avgPrice: a.totalQuantity > 0 ? a.totalPriceWeighted / a.totalQuantity : 0,
        txCount: a.txCount, hasPlanned: a.hasPlanned, hasManual: a.hasManual,
      })),
    }));

    // Current prices for tooltip "vs now"
    const symbols = [...new Set(transactions.map((t) => t.asset.symbol))];
    const prices = await prisma.priceCache.findMany({ where: { symbol: { in: symbols } } });
    const currentPrices = Object.fromEntries(prices.map((p) => [p.symbol, p.priceUsd]));

    // All user assets for filter chips
    const availableAssets = await prisma.asset.findMany({
      where: { userId },
      select: { id: true, symbol: true, name: true, color: true },
      orderBy: { symbol: 'asc' },
    });

    // Years range for year selector
    const firstTx = await prisma.transaction.findFirst({
      where: { userId, type: 'BUY' },
      orderBy: { purchasedAt: 'asc' },
      select: { purchasedAt: true },
    });
    const firstYear = firstTx ? firstTx.purchasedAt.getFullYear() : targetYear;
    const currentYear = new Date().getFullYear();
    const availableYears: number[] = [];
    for (let y = firstYear; y <= currentYear; y++) availableYears.push(y);

    res.json({
      success: true,
      data: { days, currentPrices, availableAssets, availableYears, year: targetYear },
    });
  } catch (err) {
    next(err);
  }
}
