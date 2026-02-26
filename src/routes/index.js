import { Router } from 'express';
import authRoutes from './authRoutes.js';
import routeRoutes from './routeRoutes.js';
import bookingRoutes from './bookingRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import operatorRoutes from './operatorRoutes.js';
import adminRoutes from './adminRoutes.js';
import locationRoutes from './locationRoutes.js';
import configRoutes from './configRoutes.js';
import enquiryRoutes from './enquiryRoutes.js';
import enquiryPackageRoutes from './enquiryPackageRoutes.js';

const router = Router();

// API version info
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'MapsMyWay API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      routes: '/api/routes',
      bookings: '/api/bookings',
      payments: '/api/payments',
      operator: '/api/operator',
      admin: '/api/admin',
      health: '/api/health',
      locations: '/api/locations',
      config: '/api/config',
      enquiries: '/api/enquiries',
      enquiryPackages: '/api/enquiry-packages'
    }
  });
});

router.use('/auth', authRoutes);
router.use('/routes', routeRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/operator', operatorRoutes);
router.use('/admin', adminRoutes);
router.use('/locations', locationRoutes);
router.use('/config', configRoutes);
router.use('/enquiries', enquiryRoutes);
router.use('/enquiry-packages', enquiryPackageRoutes);

export default router;
