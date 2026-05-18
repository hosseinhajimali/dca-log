import { Router } from 'express';
import { updateBuyingRule, deleteBuyingRule } from '../controllers/buyingRulesController';
import { requireAuth } from '../middleware/auth';

// Mounted at /buying-rules, handles individual rule operations
const router = Router();
router.use(requireAuth);

router.patch('/:ruleId',  updateBuyingRule);
router.delete('/:ruleId', deleteBuyingRule);

export default router;
