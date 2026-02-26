import Joi from 'joi';
import admin from '../config/firebase.js';
import asyncHandler from '../utils/asyncHandler.js';
import { validate } from '../middlewares/validateMiddleware.js';
import { successResponse } from '../utils/response.js';
import User from '../models/User.js';
import Operator from '../models/Operator.js';

const registerOperatorSchema = {
    body: Joi.object({
        email: Joi.string().email().required().messages({
            'any.required': 'Email is required',
            'string.email': 'Please enter a valid email address'
        }),
        password: Joi.string().min(8).required().messages({
            'any.required': 'Password is required',
            'string.min': 'Password must be at least 8 characters'
        }),
        name: Joi.string().trim().min(2).max(100).required().messages({
            'any.required': 'Your name is required'
        }),
        phone: Joi.string().trim().max(20).required().messages({
            'any.required': 'Phone number is required'
        }),
        companyName: Joi.string().trim().min(2).max(200).required().messages({
            'any.required': 'Company name is required'
        }),
        licenseNumber: Joi.string().trim().min(3).max(50).required().messages({
            'any.required': 'License number is required'
        }),
        contactPerson: Joi.string().trim().min(2).max(100).optional()
    })
};

export const validateRegisterOperator = validate(registerOperatorSchema);

/**
 * POST /api/auth/register-operator
 * Public endpoint — no authentication required.
 * Creates a Firebase Auth user + pending Operator + User records.
 */
export const registerOperator = asyncHandler(async (req, res) => {
    const { email, password, name, phone, companyName, licenseNumber, contactPerson } = req.body;

    // Check for duplicate license or email
    const existingOperator = await Operator.findOne({ licenseNumber });
    if (existingOperator) {
        return res.status(409).json({
            success: false,
            message: 'An operator with this license number already exists'
        });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(409).json({
            success: false,
            message: 'An account with this email already exists'
        });
    }

    // Create Firebase Auth user
    let firebaseUser;
    try {
        firebaseUser = await admin.auth().createUser({
            email,
            password,
            displayName: name,
            emailVerified: false
        });
    } catch (err) {
        if (err.code === 'auth/email-already-exists') {
            return res.status(409).json({
                success: false,
                message: 'An account with this email already exists'
            });
        }
        throw err;
    }

    // Create MongoDB User
    const user = await User.create({
        firebaseUid: firebaseUser.uid,
        email,
        name,
        phone,
        role: 'operator',
        status: 'active',
        verified: false
    });

    // Create Operator profile (pending approval)
    const operator = await Operator.create({
        user: user._id,
        companyName,
        licenseNumber,
        contactPerson: contactPerson || name,
        phone,
        status: 'pending'
    });

    return successResponse(
        res,
        {
            operator: {
                id: operator._id,
                companyName: operator.companyName,
                status: operator.status
            },
            user: { id: user._id, email: user.email, role: user.role }
        },
        'Operator registration successful. Your account is pending admin approval.',
        201
    );
});
