import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { createSellRule, updateSellRule, deleteSellRule } from '../controllers/sellRulesController';

const router = Router();

router.use(requireAuth);

router.post('/',     createSellRule);
router.patch('/:id', updateSellRule);
router.delete('/:id', deleteSellRule);

export default router;
