import mongoose from 'mongoose';

const operatorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    companyName: {
      type: String,
      required: true
    },
    licenseNumber: {
      type: String,
      required: true,
      unique: true
    },
    contactPerson: {
      type: String
    },
    phone: {
      type: String
    },
    documents: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      // 'approved' kept for backward compatibility during migration, removed after
      enum: ['pending', 'active', 'rejected', 'suspended', 'approved'],
      default: 'pending',
      index: true
    },
    commissionRate: {
      type: Number,
      default: 10,
      min: 0,
      max: 100
    },
    rejectionReason: {
      type: String
    },
    suspensionReason: {
      type: String
    },
    approvedAt: {
      type: Date
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    // Cached aggregation stats — updated periodically, safe defaults for existing docs
    totalRevenue: { type: Number, default: 0 },
    totalBookings: { type: Number, default: 0 },
    activeRoutesCount: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 }
  },
  { timestamps: true }
);

const Operator = mongoose.model('Operator', operatorSchema);
export default Operator;
