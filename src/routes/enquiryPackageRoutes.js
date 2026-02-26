import { Router } from 'express';
import * as controller from '../controllers/enquiryPackageController.js';
import { authenticate, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = Router();

// Public route to get active packages for the enquiry form
router.get('/active', controller.getActivePackages);

// Protected admin routes
router.use(authenticate);
router.use(authorizeRoles('admin'));

router.get('/', controller.getAllPackages);
router.post('/', controller.createPackage);
router.patch('/:id', controller.updatePackage);
router.delete('/:id', controller.deletePackage);

export default router;
