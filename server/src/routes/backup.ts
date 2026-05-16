import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { downloadBackup, restoreBackup } from '../controllers/backupController';

const router = Router();

router.use(requireAuth);

router.get('/',        downloadBackup);
router.post('/restore', restoreBackup);

export default router;
