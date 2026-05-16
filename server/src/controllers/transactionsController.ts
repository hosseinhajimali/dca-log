import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest, TransactionQuery } from '../types';
import { AppError } from '../middleware/errorHandler';

const txSchema = z.object({
  assetId: z.string().cuid(),
  dcaPlanId: z.string().cuid().optional().nullable(),
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
    const { assetId, from, to, page = '1', limit = '50', sortBy = 'purchasedAt', sortOrder = 'desc' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Validate sort field to prevent injection
    const safeSortBy: SortableField = SORTABLE_FIELDS.includes(sortBy as SortableField)
      ? (sortBy as SortableField)
      : 'purchasedAt';
    const safeOrder = sortOrder === 'asc' ? 'asc' : 'desc';

    const where: Record<string, unknown> = { userId: req.userId };
    if (assetId) where.assetId = assetId;
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
    if (!body.success) return next(new AppError(400, body.error.errors[0].message));

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
