import { Router } from 'express';
import { getLocations } from '../controllers/locationController.js';

const router = Router();

// GET /api/locations – public, no auth required
router.get('/', getLocations);

export default router;
