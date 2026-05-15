import { Router } from 'express';
import { getDcaPlans, createDcaPlan, updateDcaPlan, deleteDcaPlan } from '../controllers/dcaPlansController';
import { createBuyingRule } from '../controllers/buyingRulesController';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/', getDcaPlans);
router.post('/', createDcaPlan);
router.patch('/:id', updateDcaPlan);
router.delete('/:id', deleteDcaPlan);

// Buying rules nested under a plan
router.post('/:planId/rules', createBuyingRule);

export default router;
