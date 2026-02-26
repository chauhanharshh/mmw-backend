import { Router } from 'express';
import { search, validateSearch } from '../controllers/routeController.js';

const router = Router();

router.get('/search', validateSearch, search);

export default router;

