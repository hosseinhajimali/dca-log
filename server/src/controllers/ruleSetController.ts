import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

// ─── Validation ───────────────────────────────────────────────────────────────

const drawdownRowSchema = z.object({
  minDrawdown: z.number().min(0).max(100),
  maxDrawdown: z.number().min(0).max(100),
}).refine(d => d.maxDrawdown > d.minDrawdown, {
  message: 'maxDrawdown must be greater than minDrawdown',
});

const buyingRowSchema = z.object({
  params:     z.record(z.unknown()), // strategy-specific; validated per strategyType below
  multiplier: z.number().positive(), // buy = multiplier × plan.amountUsd
  sortOrder:  z.number().int().optional(),
});

const sellRowSchema = z.object({
  params:        z.record(z.unknown()),
  sellAmount:    z.number().positive(),
  sellAmountType: z.enum(['USD', 'PCT']).default('USD'),
  sortOrder:     z.number().int().optional(),
});

const buyingRuleSetSchema = z.object({
  label:        z.string().min(1).max(80),
  strategyType: z.enum(['DRAWDOWN_ATH']).default('DRAWDOWN_ATH'),
  notes:        z.string().optional(),
  rows:         z.array(buyingRowSchema).min(1),
});

const sellRuleSetSchema = z.object({
  label:        z.string().min(1).max(80),
  strategyType: z.enum(['DRAWDOWN_ATH']).default('DRAWDOWN_ATH'),
  notes:        z.string().optional(),
  rows:         z.array(sellRowSchema).min(1),
});

function validateBuyingRows(rows: z.infer<typeof buyingRowSchema>[], strategyType: string) {
  if (strategyType === 'DRAWDOWN_ATH') {
    for (const row of rows) {
      const check = drawdownRowSchema.safeParse(row.params);
      if (!check.success) throw new AppError(400, `Row params invalid: ${check.error.errors[0].message}`);
    }
  }
}

function validateSellRows(rows: z.infer<typeof sellRowSchema>[], strategyType: string) {
  if (strategyType === 'DRAWDOWN_ATH') {
    for (const row of rows) {
      const profitSchema = z.object({ minProfit: z.number().min(0), maxProfit: z.number().min(0) })
        .refine(d => d.maxProfit > d.minProfit, { message: 'maxProfit must be greater than minProfit' });
      const check = profitSchema.safeParse(row.params);
      if (!check.success) throw new AppError(400, `Row params invalid: ${check.error.errors[0].message}`);
    }
  }
}

// ─── Buying Rule Sets ─────────────────────────────────────────────────────────

export async function getBuyingRuleSets(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sets = await prisma.buyingRuleSet.findMany({
      where: { userId: req.userId },
      include: { rows: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: sets });
  } catch (err) { next(err); }
}

export async function createBuyingRuleSet(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = buyingRuleSetSchema.safeParse(req.body);
    if (!body.success) return next(new AppError(400, body.error.errors[0].message));

    validateBuyingRows(body.data.rows, body.data.strategyType);

    const set = await prisma.buyingRuleSet.create({
      data: {
        userId:       req.userId!,
        label:        body.data.label,
        strategyType: body.data.strategyType,
        notes:        body.data.notes,
        rows: {
          create: body.data.rows.map((r, i) => ({
            params:    r.params as Prisma.InputJsonValue,
            multiplier: r.multiplier,
            sortOrder: r.sortOrder ?? i,
          })),
        },
      },
      include: { rows: { orderBy: { sortOrder: 'asc' } } },
    });

    res.status(201).json({ success: true, data: set });
  } catch (err) { next(err); }
}

export async function updateBuyingRuleSet(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const existing = await prisma.buyingRuleSet.findFirst({ where: { id, userId: req.userId } });
    if (!existing) return next(new AppError(404, 'Rule set not found'));

    const body = buyingRuleSetSchema.partial().safeParse(req.body);
    if (!body.success) return next(new AppError(400, body.error.errors[0].message));

    if (body.data.rows) {
      validateBuyingRows(body.data.rows, body.data.strategyType ?? existing.strategyType);
    }

    // Replace rows in a transaction
    const set = await prisma.$transaction(async (tx) => {
      if (body.data.rows) {
        await tx.buyingRuleSetRow.deleteMany({ where: { ruleSetId: id } });
        await tx.buyingRuleSetRow.createMany({
          data: body.data.rows.map((r, i) => ({
            ruleSetId: id,
            params:    r.params as Prisma.InputJsonValue,
            multiplier: r.multiplier,
            sortOrder: r.sortOrder ?? i,
          })),
        });
      }
      return tx.buyingRuleSet.update({
        where: { id },
        data: {
          label:        body.data.label,
          strategyType: body.data.strategyType,
          notes:        body.data.notes,
        },
        include: { rows: { orderBy: { sortOrder: 'asc' } } },
      });
    });

    res.json({ success: true, data: set });
  } catch (err) { next(err); }
}

export async function deleteBuyingRuleSet(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const existing = await prisma.buyingRuleSet.findFirst({ where: { id, userId: req.userId } });
    if (!existing) return next(new AppError(404, 'Rule set not found'));

    await prisma.buyingRuleSet.delete({ where: { id } });
    res.json({ success: true, message: 'Rule set deleted' });
  } catch (err) { next(err); }
}

// ─── Sell Rule Sets ───────────────────────────────────────────────────────────

export async function getSellRuleSets(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sets = await prisma.sellRuleSet.findMany({
      where: { userId: req.userId },
      include: { rows: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: sets });
  } catch (err) { next(err); }
}

export async function createSellRuleSet(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = sellRuleSetSchema.safeParse(req.body);
    if (!body.success) return next(new AppError(400, body.error.errors[0].message));

    validateSellRows(body.data.rows, body.data.strategyType);

    const set = await prisma.sellRuleSet.create({
      data: {
        userId:       req.userId!,
        label:        body.data.label,
        strategyType: body.data.strategyType,
        notes:        body.data.notes,
        rows: {
          create: body.data.rows.map((r, i) => ({
            params:        r.params as Prisma.InputJsonValue,
            sellAmount:    r.sellAmount,
            sellAmountType: r.sellAmountType,
            sortOrder:     r.sortOrder ?? i,
          })),
        },
      },
      include: { rows: { orderBy: { sortOrder: 'asc' } } },
    });

    res.status(201).json({ success: true, data: set });
  } catch (err) { next(err); }
}

export async function updateSellRuleSet(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const existing = await prisma.sellRuleSet.findFirst({ where: { id, userId: req.userId } });
    if (!existing) return next(new AppError(404, 'Rule set not found'));

    const body = sellRuleSetSchema.partial().safeParse(req.body);
    if (!body.success) return next(new AppError(400, body.error.errors[0].message));

    if (body.data.rows) {
      validateSellRows(body.data.rows, body.data.strategyType ?? existing.strategyType);
    }

    const set = await prisma.$transaction(async (tx) => {
      if (body.data.rows) {
        await tx.sellRuleSetRow.deleteMany({ where: { ruleSetId: id } });
        await tx.sellRuleSetRow.createMany({
          data: body.data.rows.map((r, i) => ({
            ruleSetId:     id,
            params:        r.params as Prisma.InputJsonValue,
            sellAmount:    r.sellAmount,
            sellAmountType: r.sellAmountType,
            sortOrder:     r.sortOrder ?? i,
          })),
        });
      }
      return tx.sellRuleSet.update({
        where: { id },
        data: {
          label:        body.data.label,
          strategyType: body.data.strategyType,
          notes:        body.data.notes,
        },
        include: { rows: { orderBy: { sortOrder: 'asc' } } },
      });
    });

    res.json({ success: true, data: set });
  } catch (err) { next(err); }
}

export async function deleteSellRuleSet(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const existing = await prisma.sellRuleSet.findFirst({ where: { id, userId: req.userId } });
    if (!existing) return next(new AppError(404, 'Rule set not found'));

    await prisma.sellRuleSet.delete({ where: { id } });
    res.json({ success: true, message: 'Rule set deleted' });
  } catch (err) { next(err); }
}

// ─── Plan - Rule Set assignments ──────────────────────────────────────────────

export async function assignBuyingRuleSet(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const planId = req.params.planId as string;
    const { ruleSetId, isActive } = req.body as { ruleSetId: string; isActive?: boolean };

    const plan = await prisma.dcaPlan.findFirst({ where: { id: planId, userId: req.userId } });
    if (!plan) return next(new AppError(404, 'Plan not found'));

    const ruleSet = await prisma.buyingRuleSet.findFirst({ where: { id: ruleSetId, userId: req.userId } });
    if (!ruleSet) return next(new AppError(404, 'Rule set not found'));

    const result = await prisma.$transaction(async (tx) => {
      // If activating this one, deactivate all others first
      if (isActive) {
        await tx.planBuyingRuleSet.updateMany({ where: { planId }, data: { isActive: false } });
      }
      return tx.planBuyingRuleSet.upsert({
        where: { planId_ruleSetId: { planId, ruleSetId } },
        create: { planId, ruleSetId, isActive: isActive ?? false },
        update: { isActive: isActive ?? false },
      });
    });

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function unassignBuyingRuleSet(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const planId = req.params.planId as string;
    const ruleSetId = req.params.ruleSetId as string;
    const plan = await prisma.dcaPlan.findFirst({ where: { id: planId, userId: req.userId } });
    if (!plan) return next(new AppError(404, 'Plan not found'));

    await prisma.planBuyingRuleSet.deleteMany({ where: { planId, ruleSetId } });
    res.json({ success: true, message: 'Rule set removed from plan' });
  } catch (err) { next(err); }
}

export async function assignSellRuleSet(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const planId = req.params.planId as string;
    const { ruleSetId, isActive } = req.body as { ruleSetId: string; isActive?: boolean };

    const plan = await prisma.dcaPlan.findFirst({ where: { id: planId, userId: req.userId } });
    if (!plan) return next(new AppError(404, 'Plan not found'));

    const ruleSet = await prisma.sellRuleSet.findFirst({ where: { id: ruleSetId, userId: req.userId } });
    if (!ruleSet) return next(new AppError(404, 'Rule set not found'));

    const result = await prisma.$transaction(async (tx) => {
      if (isActive) {
        await tx.planSellRuleSet.updateMany({ where: { planId }, data: { isActive: false } });
      }
      return tx.planSellRuleSet.upsert({
        where: { planId_ruleSetId: { planId, ruleSetId } },
        create: { planId, ruleSetId, isActive: isActive ?? false },
        update: { isActive: isActive ?? false },
      });
    });

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function unassignSellRuleSet(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const planId = req.params.planId as string;
    const ruleSetId = req.params.ruleSetId as string;
    const plan = await prisma.dcaPlan.findFirst({ where: { id: planId, userId: req.userId } });
    if (!plan) return next(new AppError(404, 'Plan not found'));

    await prisma.planSellRuleSet.deleteMany({ where: { planId, ruleSetId } });
    res.json({ success: true, message: 'Rule set removed from plan' });
  } catch (err) { next(err); }
}
