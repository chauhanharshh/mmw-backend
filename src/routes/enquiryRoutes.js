import { Router } from 'express';
import * as enquiryController from '../controllers/enquiryController.js';
// Assuming there's an auth middleware, but requirements say "Protect admin routes"
// I'll check adminRoutes.js to see how protection is handled
import { authenticate, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = Router();

// Public route for enquiry submission
router.post('/', enquiryController.createEnquiry);

// Protected admin routes
router.use(authenticate);
router.use(authorizeRoles('admin'));

router.get('/', enquiryController.getEnquiries);
router.patch('/:id', enquiryController.updateEnquiryStatus);
router.delete('/:id', enquiryController.deleteEnquiry);

export default router;
