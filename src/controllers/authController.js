import asyncHandler from '../utils/asyncHandler.js';
import { getCurrentUserWithOperator, updateUserProfile } from '../services/authService.js';
import { successResponse } from '../utils/response.js';

export const getMe = asyncHandler(async (req, res) => {
  const { user, operator } = await getCurrentUserWithOperator(req.user._id);

  // Remove internal fields from user
  const userResponse = user.toObject ? user.toObject() : { ...user };
  delete userResponse.__v;

  // Remove internal fields from operator (if present)
  let operatorResponse = null;
  if (operator) {
    operatorResponse = operator.toObject ? operator.toObject() : { ...operator };
    delete operatorResponse.__v;
  }

  return successResponse(res, { user: userResponse, operator: operatorResponse }, null);
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const user = await updateUserProfile(req.user._id, { name, phone });

  const userResponse = user.toObject ? user.toObject() : { ...user };
  delete userResponse.__v;

  return successResponse(res, { user: userResponse }, 'Profile updated successfully');
});
