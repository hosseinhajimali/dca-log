import { Router } from 'express';
import { getPrices, refreshPrices, getExchangeRates } from '../controllers/pricesController';

const router = Router();

router.get('/', getPrices);
router.post('/refresh', refreshPrices);
router.get('/exchange-rates', getExchangeRates);

export default router;
