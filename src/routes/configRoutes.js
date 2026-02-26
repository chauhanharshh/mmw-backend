import { Router } from 'express';
import { getConfigController } from '../controllers/configController.js';

const router = Router();

// Public — no authentication required
router.get('/', getConfigController);

export default router;
