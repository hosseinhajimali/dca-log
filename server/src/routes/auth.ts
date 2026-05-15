import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, getMe, updateMe } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Max 10 auth attempts per IP per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many attempts, please try again later' },
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', requireAuth, getMe);
router.patch('/me', requireAuth, updateMe);

export default router;
