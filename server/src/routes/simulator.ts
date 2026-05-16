import { Router } from 'express';
import { runSimulation } from '../controllers/simulatorController';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/', runSimulation);

export default router;
