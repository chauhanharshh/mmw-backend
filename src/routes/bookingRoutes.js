import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import {
  create,
  cancel,
  listUserBookings,
  validateCreate,
  validateCancel
} from '../controllers/bookingController.js';

const router = Router();

router.post('/create', authenticate, validateCreate, create);
router.post('/cancel', authenticate, validateCancel, cancel);
router.get('/user', authenticate, listUserBookings);

export default router;

