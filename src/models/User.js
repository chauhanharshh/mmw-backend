import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      index: true
    },
    name: {
      type: String
    },
    phone: {
      type: String
    },
    role: {
      type: String,
      enum: ['user', 'operator', 'admin'],
      default: 'user',
      index: true
    },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
      index: true
    },
    verified: {
      type: Boolean,
      default: false
    },
    // Legacy field — superseded by status; kept for backwards compat
    isOperatorApproved: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);
export default User;
