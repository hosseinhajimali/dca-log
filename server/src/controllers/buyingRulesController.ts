import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

const ruleBase = z.object({
  minDrawdown: z.number().min(0).max(100),
  maxDrawdown: z.number().min(0).max(100),
  buyAmount:   z.number().positive(),
});

// Full schema with cross-field validation (used for create)
const ruleSchema = ruleBase.refine((d) => d.maxDrawdown > d.minDrawdown, {
  message: 'maxDrawdown must be greater than minDrawdown',
});

// Partial schema for updates (.partial() isn't available on ZodEffects)
const ruleUpdateSchema = ruleBase.partial().refine(
  (d) => d.minDrawdown === undefined || d.maxDrawdown === undefined || d.maxDrawdown > d.minDrawdown,
  { message: 'maxDrawdown must be greater than minDrawdown' }
);

export async function createBuyingRule(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { planId } = req.params;

    // Verify plan belongs to user
    const plan = await prisma.dcaPlan.findFirst({ where: { id: planId, userId: req.userId } });
    if (!plan) return next(new AppError(404, 'Plan not found'));

    const body = ruleSchema.safeParse(req.body);
    if (!body.success) return next(new AppError(400, body.error.errors[0].message));

    const rule = await prisma.buyingRule.create({
      data: { dcaPlanId: planId, ...body.data },
    });

    res.status(201).json({ success: true, data: rule });
  } catch (err) {
    next(err);
  }
}

export async function updateBuyingRule(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { ruleId } = req.params;

    // Verify ownership via plan
    const rule = await prisma.buyingRule.findFirst({
      where: { id: ruleId, dcaPlan: { userId: req.userId } },
    });
    if (!rule) return next(new AppError(404, 'Rule not found'));

    const body = ruleUpdateSchema.safeParse(req.body);
    if (!body.success) return next(new AppError(400, body.error.errors[0].message));

    const updated = await prisma.buyingRule.update({ where: { id: ruleId }, data: body.data });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteBuyingRule(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { ruleId } = req.params;

    const rule = await prisma.buyingRule.findFirst({
      where: { id: ruleId, dcaPlan: { userId: req.userId } },
    });
    if (!rule) return next(new AppError(404, 'Rule not found'));

    await prisma.buyingRule.delete({ where: { id: ruleId } });
    res.json({ success: true, message: 'Rule deleted' });
  } catch (err) {
    next(err);
  }
}
