import Razorpay from 'razorpay';
import config from './index.js';

if (!config.razorpay.keyId || !config.razorpay.keySecret) {
  throw new Error('Razorpay configuration missing. Check environment variables.');
}

const razorpayInstance = new Razorpay({
  key_id: config.razorpay.keyId,
  key_secret: config.razorpay.keySecret
});

export default razorpayInstance;

