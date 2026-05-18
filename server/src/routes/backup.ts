import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { downloadBackup, restoreBackup, clearAllData } from '../controllers/backupController';

const router = Router();

router.use(requireAuth);

router.get('/',        downloadBackup);
router.post('/restore', restoreBackup);
router.delete('/clear', clearAllData);

export default router;
