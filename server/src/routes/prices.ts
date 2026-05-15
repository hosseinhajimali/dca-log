import { Router } from 'express';
import { getPrices, refreshPrices, getExchangeRates, getFearGreed } from '../controllers/pricesController';

const router = Router();

router.get('/', getPrices);
router.post('/refresh', refreshPrices);
router.get('/exchange-rates', getExchangeRates);
router.get('/fear-greed', getFearGreed);

export default router;
