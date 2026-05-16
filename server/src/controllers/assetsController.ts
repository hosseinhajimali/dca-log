import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

const assetSchema = z.object({
  symbol: z.string().min(1).max(20).toUpperCase(),
  name: z.string().min(1),
  assetType: z.enum(['CRYPTO', 'METAL', 'STOCK', 'ETF', 'OTHER']),
  coingeckoId: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
});

export async function getAssets(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const assets = await prisma.asset.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: assets });
  } catch (err) {
    next(err);
  }
}

export async function createAsset(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = assetSchema.safeParse(req.body);
    if (!body.success) return next(new AppError(400, body.error.errors[0].message));

    const existing = await prisma.asset.findUnique({
      where: { userId_symbol: { userId: req.userId!, symbol: body.data.symbol } },
    });
    if (existing) return next(new AppError(409, `Asset ${body.data.symbol} already exists`));

    const asset = await prisma.asset.create({
      data: { ...body.data, userId: req.userId! },
    });
    res.status(201).json({ success: true, data: asset });
  } catch (err) {
    next(err);
  }
}

export async function updateAsset(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const asset = await prisma.asset.findFirst({ where: { id: id as string, userId: req.userId } });
    if (!asset) return next(new AppError(404, 'Asset not found'));

    const updateSchema = assetSchema.partial();
    const body = updateSchema.safeParse(req.body);
    if (!body.success) return next(new AppError(400, body.error.errors[0].message));

    const updated = await prisma.asset.update({ where: { id: id as string }, data: body.data });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteAsset(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const asset = await prisma.asset.findFirst({ where: { id: id as string, userId: req.userId } });
    if (!asset) return next(new AppError(404, 'Asset not found'));

    await prisma.asset.delete({ where: { id: id as string } });
    res.json({ success: true, message: 'Asset deleted' });
  } catch (err) {
    next(err);
  }
}
