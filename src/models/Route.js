import mongoose from 'mongoose';

const routeSchema = new mongoose.Schema(
  {
    operator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Operator',
      required: true,
      index: true
    },
    from: {
      type: String,
      required: true,
      index: true
    },
    to: {
      type: String,
      required: true,
      index: true
    },
    departureTime: {
      type: Date,
      required: true,
      index: true
    },
    arrivalTime: {
      type: Date,
      required: true
    },
    basePrice: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'INR'
    },
    totalSeats: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true
    }
  },
  { timestamps: true }
);

routeSchema.index({ from: 1, to: 1, departureTime: 1, status: 1 });

const Route = mongoose.model('Route', routeSchema);
export default Route;

