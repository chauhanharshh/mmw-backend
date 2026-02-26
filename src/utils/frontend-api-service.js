/**
 * Frontend API Service Layer Example
 * 
 * This is a reference implementation for integrating the MapsMyWay backend
 * with a React/React Native frontend.
 * 
 * Usage:
 * 1. Copy this file to your frontend project
 * 2. Install axios: npm install axios
 * 3. Configure your Firebase client SDK
 * 4. Update API_BASE_URL to match your backend URL
 * 5. Use the service methods in your components
 */

import axios from 'axios';

// Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30 seconds
});

/**
 * Get Firebase ID token and attach to requests
 * Replace this with your Firebase client SDK implementation
 */
async function getAuthToken() {
  // Example for Firebase Web SDK:
  // const auth = getAuth();
  // const user = auth.currentUser;
  // if (user) {
  //   return await user.getIdToken();
  // }
  // return null;
  
  // For React Native, use Firebase React Native SDK:
  // import auth from '@react-native-firebase/auth';
  // return await auth().currentUser?.getIdToken();
  
  throw new Error('Implement Firebase auth token retrieval');
}

/**
 * Request interceptor to add auth token
 */
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Failed to get auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor for error handling
 */
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized - token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Try to refresh token (implement based on your auth flow)
      // const newToken = await refreshAuthToken();
      // if (newToken) {
      //   originalRequest.headers.Authorization = `Bearer ${newToken}`;
      //   return apiClient(originalRequest);
      // }
      
      // Redirect to login or show auth modal
      // window.location.href = '/login';
    }

    // Extract error message from standardized response
    const errorMessage =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';

    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      data: error.response?.data,
      requestId: error.response?.headers['x-request-id']
    });
  }
);

/**
 * API Service Methods
 */
export const apiService = {
  // Health Check
  async checkHealth() {
    const response = await apiClient.get('/health');
    return response.data;
  },

  // Authentication
  async getCurrentUser() {
    const response = await apiClient.get('/auth/me');
    return response.data.data.user;
  },

  // Routes
  async searchRoutes({ from, to, date, seats, page = 1, limit = 20 }) {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (date) params.append('date', date);
    if (seats) params.append('seats', seats);
    params.append('page', page);
    params.append('limit', limit);

    const response = await apiClient.get(`/routes/search?${params.toString()}`);
    return response.data.data;
  },

  // Bookings
  async createBooking({ routeId, seats }) {
    const response = await apiClient.post('/bookings/create', {
      routeId,
      seats
    });
    return response.data.data.booking;
  },

  async cancelBooking({ bookingId }) {
    const response = await apiClient.post('/bookings/cancel', {
      bookingId
    });
    return response.data.data.booking;
  },

  async getUserBookings() {
    const response = await apiClient.get('/bookings/user');
    return response.data.data.bookings;
  },

  // Payments
  async createPaymentOrder({ bookingId }) {
    const response = await apiClient.post('/payments/order', {
      bookingId
    });
    return response.data.data;
  },

  async verifyPayment({ bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
    const response = await apiClient.post('/payments/verify', {
      bookingId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    });
    return response.data.data.payment;
  },

  async refundPayment({ paymentId, amount, reason }) {
    const response = await apiClient.post('/payments/refund', {
      paymentId,
      amount,
      reason
    });
    return response.data.data;
  },

  // Operator endpoints
  async createOrUpdateRoute({ routeId, ...routeData }) {
    const response = await apiClient.post('/operator/route', {
      routeId,
      ...routeData
    });
    return response.data.data.route;
  },

  async getOperatorBookings() {
    const response = await apiClient.get('/operator/bookings');
    return response.data.data.bookings;
  },

  // Admin endpoints
  async approveOperator({ operatorId, commissionRate }) {
    const response = await apiClient.post('/admin/approve', {
      operatorId,
      commissionRate
    });
    return response.data.data.operator;
  },

  async getRevenue() {
    const response = await apiClient.get('/admin/revenue');
    return response.data.data.revenue;
  }
};

/**
 * React Hook Example
 * 
 * import { useState, useEffect } from 'react';
 * import { apiService } from './api-service';
 * 
 * function useRoutes({ from, to, date, seats }) {
 *   const [routes, setRoutes] = useState([]);
 *   const [loading, setLoading] = useState(false);
 *   const [error, setError] = useState(null);
 * 
 *   useEffect(() => {
 *     async function fetchRoutes() {
 *       setLoading(true);
 *       setError(null);
 *       try {
 *         const data = await apiService.searchRoutes({ from, to, date, seats });
 *         setRoutes(data.routes);
 *       } catch (err) {
 *         setError(err.message);
 *       } finally {
 *         setLoading(false);
 *       }
 *     }
 * 
 *     if (from && to) {
 *       fetchRoutes();
 *     }
 *   }, [from, to, date, seats]);
 * 
 *   return { routes, loading, error };
 * }
 */

export default apiService;
