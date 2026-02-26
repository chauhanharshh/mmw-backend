import User from '../models/User.js';
import Operator from '../models/Operator.js';

export async function getCurrentUser(userId) {
  return User.findById(userId);
}

/**
 * Returns the User and, if they are an operator, their linked Operator profile.
 * Used by GET /api/auth/me so the frontend always knows the operator status.
 */
export async function getCurrentUserWithOperator(userId) {
  const user = await User.findById(userId);
  if (!user || user.role !== 'operator') {
    return { user, operator: null };
  }
  const operator = await Operator.findOne({ user: userId }).select(
    'status commissionRate companyName licenseNumber rejectionReason suspensionReason approvedAt createdAt'
  );
  return { user, operator: operator || null };
}

export async function updateUserProfile(userId, { name, phone }) {
  const updates = {};
  if (name !== undefined && name !== '') updates.name = name;
  if (phone !== undefined) updates.phone = phone;

  return User.findByIdAndUpdate(
    userId,
    { $set: updates },
    { new: true, runValidators: true }
  );
}
