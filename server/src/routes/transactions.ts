import { Router } from 'express';
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, getTransactionHeatmap } from '../controllers/transactionsController';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/heatmap', getTransactionHeatmap);
router.get('/', getTransactions);
router.post('/', createTransaction);
router.patch('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;
