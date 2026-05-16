import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { listGoals, createGoal, updateGoal, deleteGoal } from '../controllers/goalsController';

const router = Router();

router.use(requireAuth);

router.get('/',      listGoals);
router.post('/',     createGoal);
router.put('/:id',   updateGoal);
router.delete('/:id', deleteGoal);

export default router;
