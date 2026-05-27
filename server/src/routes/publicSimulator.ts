import { Router } from 'express';
import { runPublicSimulation, PUBLIC_ASSETS } from '../controllers/publicSimulatorController';

const router = Router();

// No auth — fully public
router.get('/', runPublicSimulation);

// Return the list of supported assets so the frontend doesn't hardcode it
router.get('/assets', (_req, res) => {
  res.json({
    success: true,
    data: Object.entries(PUBLIC_ASSETS).map(([symbol, name]) => ({ symbol, name })),
  });
});

export default router;
