# Frontend Integration Guide

This guide explains how to integrate the MapsMyWay backend with your React/React Native frontend.

## Prerequisites

1. **Firebase Client SDK** configured in your frontend
2. **Axios** or similar HTTP client library
3. **Environment variables** configured

## Setup

### 1. Install Dependencies

```bash
npm install axios
# or
yarn add axios
```

### 2. Configure Environment Variables

Create a `.env` file in your frontend project:

```env
REACT_APP_API_URL=http://localhost:4000/api
# For production:
# REACT_APP_API_URL=https://api.mapsmyway.com/api
```

### 3. Firebase Authentication Setup

#### React (Web)

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  // Your Firebase config
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

#### React Native

```bash
npm install @react-native-firebase/app @react-native-firebase/auth
```

```javascript
import auth from '@react-native-firebase/auth';
```

### 4. API Service Layer

Copy the example API service from `src/utils/frontend-api-service.js` to your frontend project and customize:

1. Update `getAuthToken()` function to use your Firebase client SDK
2. Update `API_BASE_URL` to match your backend URL
3. Customize error handling based on your app's needs

## Usage Examples

### Search Routes

```javascript
import { apiService } from './services/api-service';

// In your component
const handleSearch = async () => {
  try {
    const data = await apiService.searchRoutes({
      from: 'Mumbai',
      to: 'Goa',
      date: '2024-12-25',
      seats: 2
    });
    
    console.log('Available routes:', data.routes);
    console.log('Pagination:', data.pagination);
  } catch (error) {
    console.error('Search failed:', error.message);
  }
};
```

### Create Booking

```javascript
const handleBooking = async (routeId, seats) => {
  try {
    const booking = await apiService.createBooking({
      routeId,
      seats
    });
    
    console.log('Booking created:', booking);
    // Proceed to payment
    await handlePayment(booking._id);
  } catch (error) {
    console.error('Booking failed:', error.message);
  }
};
```

### Payment Flow

```javascript
const handlePayment = async (bookingId) => {
  try {
    // Step 1: Create Razorpay order
    const { order, paymentId } = await apiService.createPaymentOrder({
      bookingId
    });
    
    // Step 2: Initialize Razorpay Checkout (frontend)
    const options = {
      key: process.env.REACT_APP_RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      name: 'MapsMyWay',
      description: 'Helicopter Booking',
      order_id: order.id,
      handler: async (response) => {
        // Step 3: Verify payment on backend
        try {
          await apiService.verifyPayment({
            bookingId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          });
          
          console.log('Payment successful!');
          // Redirect to success page
        } catch (error) {
          console.error('Payment verification failed:', error.message);
        }
      },
      prefill: {
        name: user.name,
        email: user.email
      }
    };
    
    const razorpay = new window.Razorpay(options);
    razorpay.open();
  } catch (error) {
    console.error('Payment initialization failed:', error.message);
  }
};
```

### React Hook Example

```javascript
import { useState, useEffect } from 'react';
import { apiService } from './services/api-service';

export function useRoutes({ from, to, date, seats }) {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    async function fetchRoutes() {
      if (!from || !to) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const data = await apiService.searchRoutes({
          from,
          to,
          date,
          seats
        });
        
        setRoutes(data.routes);
        setPagination(data.pagination);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchRoutes();
  }, [from, to, date, seats]);

  return { routes, loading, error, pagination };
}
```

## Error Handling

All API responses follow a standardized format:

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE",
    "statusCode": 400,
    "requestId": "unique-request-id"
  }
}
```

### Common Error Codes

- `UNAUTHORIZED` (401): Token missing or expired
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `VALIDATION_ERROR` (400): Invalid input data
- `INTERNAL_ERROR` (500): Server error

## Request ID Tracking

Each API response includes an `X-Request-ID` header. Use this for debugging:

```javascript
apiClient.interceptors.response.use(
  (response) => {
    const requestId = response.headers['x-request-id'];
    console.log('Request ID:', requestId);
    return response;
  }
);
```

## Session Management

The API service automatically:
1. Attaches Firebase ID token to all requests
2. Handles token expiration (401 errors)
3. Retries requests with refreshed tokens (if implemented)

## CORS Configuration

Ensure your backend CORS settings include your frontend origin:

```env
CORS_ORIGINS=http://localhost:3000,https://mapsmyway.com
```

## Rate Limiting

The backend implements rate limiting. If you encounter 429 errors:
- Implement exponential backoff
- Show user-friendly messages
- Reduce request frequency

## Testing

### Mock Service for Development

```javascript
// mock-api-service.js
export const apiService = {
  async searchRoutes() {
    return {
      routes: [
        {
          _id: '1',
          from: 'Mumbai',
          to: 'Goa',
          departureTime: '2024-12-25T10:00:00Z',
          basePrice: 5000,
          availableSeats: 5
        }
      ],
      pagination: { page: 1, limit: 20, total: 1, pages: 1 }
    };
  }
  // ... other methods
};
```

## Production Checklist

- [ ] Update `API_BASE_URL` to production URL
- [ ] Configure Firebase production project
- [ ] Set up Razorpay production keys
- [ ] Implement proper error boundaries
- [ ] Add loading states for all async operations
- [ ] Implement retry logic for failed requests
- [ ] Add request cancellation for unmounted components
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Test payment flow end-to-end
- [ ] Verify CORS configuration
- [ ] Test authentication flow
- [ ] Verify all API endpoints work correctly

## Support

For issues or questions:
1. Check API documentation: `docs/api.md`
2. Review error messages and request IDs
3. Check backend logs for detailed error information
