import { Router } from 'express';
import { getDcaPlans, createDcaPlan, updateDcaPlan, deleteDcaPlan, getPlanStats, duplicateDcaPlan } from '../controllers/dcaPlansController';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/', getDcaPlans);
router.post('/', createDcaPlan);
router.get('/:id/stats', getPlanStats);
router.post('/:id/duplicate', duplicateDcaPlan);
router.patch('/:id', updateDcaPlan);
router.delete('/:id', deleteDcaPlan);

export default router;
