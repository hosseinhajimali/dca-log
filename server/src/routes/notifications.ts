import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
} from '../controllers/notificationsController';

const router = Router();

router.use(requireAuth);

router.get('/',                  getNotifications);
router.patch('/read-all',        markAllAsRead);
router.patch('/:id/read',        markAsRead);
router.delete('/clear-all',      clearAllNotifications);
router.delete('/:id',            deleteNotification);

export default router;
