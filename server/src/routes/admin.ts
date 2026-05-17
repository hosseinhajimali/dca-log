import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import {
  getUsers,
  disableUser,
  deleteUser,
  getStats,
  getFeedback,
  markFeedbackRead,
  markAllFeedbackRead,
  deleteFeedback,
} from '../controllers/adminController';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/users',                 getUsers);
router.patch('/users/:id/disable',   disableUser);
router.delete('/users/:id',          deleteUser);
router.get('/stats',                 getStats);
router.get('/feedback',              getFeedback);
router.patch('/feedback/read-all',   markAllFeedbackRead);
router.patch('/feedback/:id/read',   markFeedbackRead);
router.delete('/feedback/:id',       deleteFeedback);

export default router;
