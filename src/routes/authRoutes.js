import { Router } from 'express';
import Joi from 'joi';
import { authenticate } from '../middlewares/authMiddleware.js';
import { getMe, updateProfile } from '../controllers/authController.js';
import { registerOperator, validateRegisterOperator } from '../controllers/registerController.js';
import { validate } from '../middlewares/validateMiddleware.js';

const router = Router();

const profileSchema = {
    body: Joi.object({
        name: Joi.string().trim().min(2).max(100).optional(),
        phone: Joi.string().trim().max(20).optional().allow('')
    })
};

// Authenticated routes
router.get('/me', authenticate, getMe);
router.patch('/profile', authenticate, validate(profileSchema), updateProfile);

// Public operator registration
router.post('/register-operator', validateRegisterOperator, registerOperator);

export default router;
