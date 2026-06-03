import { Router, Request, Response } from 'express';
import authRoutes from './auth';
import assetsRoutes from './assets';
import dcaPlansRoutes from './dcaPlans';
import transactionsRoutes from './transactions';
import pricesRoutes from './prices';
import dashboardRoutes from './dashboard';
import simulatorRoutes from './simulator';
import goalsRoutes from './goals';
import backupRoutes from './backup';
import notificationsRoutes from './notifications';
import feedbackRoutes from './feedback';
import adminRoutes from './admin';
import publicSimulatorRoutes from './publicSimulator';
import ruleSetsRoutes from './ruleSets';

export const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'DCAlog API is running 🚀', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/assets', assetsRoutes);
router.use('/dca-plans', dcaPlansRoutes);
router.use('/transactions', transactionsRoutes);
router.use('/prices', pricesRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/simulator', simulatorRoutes);
router.use('/goals', goalsRoutes);
router.use('/backup', backupRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/admin', adminRoutes);
router.use('/public/simulator', publicSimulatorRoutes);
router.use('/rule-sets', ruleSetsRoutes);
