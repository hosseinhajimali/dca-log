import { Router } from 'express';
import { runBacktestEndpoint, getBacktestAvailability } from '../controllers/backtestController';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/availability', getBacktestAvailability);
router.get('/', runBacktestEndpoint);

export default router;
