import { Response, NextFunction } from 'express';
import { prisma as _prisma } from '../lib/prisma';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = _prisma as any;
import { AuthRequest } from '../types';

// ─── CREATE ──────────────────────────────────────────────────────────────────

export async function createSellRule(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const { dcaPlanId, minProfit, maxProfit, sellAmount, sellAmountType } = req.body;

    const plan = await prisma.dcaPlan.findFirst({ where: { id: dcaPlanId, userId } });
    if (!plan) {
      res.status(404).json({ success: false, error: 'Plan not found' });
      return;
    }

    const rule = await prisma.sellRule.create({
      data: {
        dcaPlanId,
        minProfit: Number(minProfit),
        maxProfit: Number(maxProfit),
        sellAmount: Number(sellAmount),
        sellAmountType: sellAmountType === 'PCT' ? 'PCT' : 'USD',
      },
    });

    res.status(201).json({ success: true, data: rule });
  } catch (err) {
    next(err);
  }
}

// ─── UPDATE ──────────────────────────────────────────────────────────────────

export async function updateSellRule(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { minProfit, maxProfit, sellAmount, sellAmountType } = req.body;

    const existing = await prisma.sellRule.findFirst({
      where: { id: id as string, dcaPlan: { userId } },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Rule not found' });
      return;
    }

    const rule = await prisma.sellRule.update({
      where: { id: id as string },
      data: {
        ...(minProfit      !== undefined && { minProfit:      Number(minProfit) }),
        ...(maxProfit      !== undefined && { maxProfit:      Number(maxProfit) }),
        ...(sellAmount     !== undefined && { sellAmount:     Number(sellAmount) }),
        ...(sellAmountType !== undefined && { sellAmountType: sellAmountType === 'PCT' ? 'PCT' : 'USD' }),
      },
    });

    res.json({ success: true, data: rule });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────

export async function deleteSellRule(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const existing = await prisma.sellRule.findFirst({
      where: { id: id as string, dcaPlan: { userId } },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Rule not found' });
      return;
    }

    await prisma.sellRule.delete({ where: { id: id as string } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
