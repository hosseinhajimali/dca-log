import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { createFeedback } from '../controllers/feedbackController';

const router = Router();

router.post('/', requireAuth, createFeedback);

export default router;
