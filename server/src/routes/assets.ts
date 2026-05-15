import { Router } from 'express';
import { getAssets, createAsset, updateAsset, deleteAsset } from '../controllers/assetsController';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/', getAssets);
router.post('/', createAsset);
router.patch('/:id', updateAsset);
router.delete('/:id', deleteAsset);

export default router;
