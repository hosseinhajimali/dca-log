import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { downloadBackup, restoreBackup, clearAllData } from '../controllers/backupController';
import { portableImport } from '../controllers/portableImportController';

const router = Router();

router.use(requireAuth);

router.get('/',         downloadBackup);
router.post('/restore', restoreBackup);
router.post('/import',  portableImport);   // custom export v2 → add/merge
router.delete('/clear', clearAllData);

export default router;
