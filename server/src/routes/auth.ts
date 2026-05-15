import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import passport from '../services/passport';
import { register, login, getMe, updateMe, changePassword } from '../controllers/authController';
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
router.post('/change-password', requireAuth, changePassword);

// ── Google OAuth ──────────────────────────────────────────────────────────────
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${CLIENT_ORIGIN}/login?error=google_failed` }),
  (req: Request, res: Response) => {
    const { token } = req.user as { userId: string; token: string };
    res.redirect(`${CLIENT_ORIGIN}/auth/callback?token=${token}`);
  }
);

export default router;
