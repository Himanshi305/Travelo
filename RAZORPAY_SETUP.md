# Razorpay Payment Integration Setup

## Overview
Successfully integrated Razorpay payment gateway into your hotel booking system. Users can now complete payments through Razorpay's secure checkout before finalizing their bookings.

## Backend Changes

### 1. New Configuration File
- **File**: `backend/config/razorpay.js`
- Initializes Razorpay SDK with API keys from environment variables
- Throws error if keys are missing

### 2. Payment Controller
- **File**: `backend/controllers/paymentController.js`
- **Endpoints**:
  - `POST /api/payment/create-order` - Creates a Razorpay order
  - `POST /api/payment/verify-payment` - Verifies payment signature with HMAC-SHA256

### 3. Payment Routes
- **File**: `backend/routes/payment.js`
- Registered in `backend/app.js` under `/api/payment`
- Both endpoints require authentication via `auth` middleware

### 4. Booking Controller Updates
- Updated `validateBookingPayload()` to require `payment_id`
- Updated `normalizeBookingPayload()` to include `payment_id` field
- Modified insertion payload to store payment ID with booking

### 5. Environment Variables (Backend)
Add to `backend/.env`:
```
RAZORPAY_KEY_ID=rzp_test_YOUR_TEST_KEY_ID
RAZORPAY_KEY_SECRET=rzp_test_YOUR_TEST_KEY_SECRET
```
Replace with your actual test API keys from Razorpay dashboard.

## Frontend Changes

### 1. Razorpay Hook
- **File**: `frontend/src/hooks/useRazorpay.js`
- `useRazorpayScript()` - Loads Razorpay checkout script
- `useRazorpayPayment()` - Provides `initiatePayment()` function that:
  - Creates order via backend
  - Opens Razorpay checkout modal
  - Verifies payment signature
  - Returns payment ID on success

### 2. Hotels Page Updates
- **File**: `frontend/src/app/hotels/page.jsx`
- Imported and initialized Razorpay hooks
- Updated `handleBookingSubmit()` to:
  - Initiate Razorpay payment flow
  - Handle payment success/error
- Updated `handleConfirmPaymentAndBook()` to:
  - Accept payment ID from Razorpay
  - Include payment ID when saving booking
- Changed button text to "Pay Now with Razorpay"
- Simplified payment panel to show info about Razorpay

### 3. Environment Variables (Frontend)
Add to `frontend/.env.local`:
```
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_YOUR_TEST_KEY_ID
```
Replace with your actual test API key ID from Razorpay dashboard.

## Payment Flow

1. **User fills booking form** → clicks "Pay Now with Razorpay"
2. **Backend creates order** → Frontend receives order ID
3. **Razorpay checkout opens** → User enters payment details
4. **Payment processed** → User returns to app
5. **Signature verified** → Backend validates payment authenticity
6. **Booking saved** → Payment ID stored with booking
7. **User redirected** → Dashboard shows confirmed booking

## Database Schema Update
Note: Your `booking_details` table needs a `payment_id` column to store Razorpay payment IDs.
Add migration if needed:
```sql
ALTER TABLE booking_details ADD COLUMN payment_id VARCHAR(255);
CREATE INDEX idx_payment_id ON booking_details(payment_id);
```

## Testing with Razorpay Test Keys

Use these test credentials:
- **Card**: 4111 1111 1111 1111
- **Expiry**: Any future date
- **CVV**: Any 3 digits

## Security Features

✅ HMAC-SHA256 signature verification
✅ Bearer token authentication required
✅ User ID validation
✅ Order amount validation
✅ Payment status verification from Razorpay API

## API Request/Response Examples

### Create Order
```javascript
POST /api/payment/create-order
{
  "amount": 5000,        // Amount in rupees
  "email": "user@example.com",
  "phone": "9999999999",
  "name": "User Name"
}
Response:
{
  "success": true,
  "order": {
    "id": "order_xxxxx",
    "amount": 500000,    // In paise
    "currency": "INR"
  }
}
```

### Verify Payment
```javascript
POST /api/payment/verify-payment
{
  "razorpayOrderId": "order_xxxxx",
  "razorpayPaymentId": "pay_xxxxx",
  "razorpaySignature": "signature_hash"
}
Response:
{
  "success": true,
  "message": "Payment verified successfully",
  "paymentId": "pay_xxxxx"
}
```

## Troubleshooting

### "Razorpay script not loaded"
- Ensure `useRazorpayScript()` is called in component
- Check browser console for CORS errors

### "Missing Razorpay Key ID"
- Update `frontend/.env.local` with your test key ID
- Restart Next.js dev server

### "Payment verification failed"
- Verify `RAZORPAY_KEY_SECRET` in backend `.env` (not exposed)
- Check payment ID and order ID match

### Payments showing as "Authorized" not "Captured"
- In `paymentController.js`, payment capture is automatic with `payment_capture: 1`
- For manual capture, set to `payment_capture: 0` and capture separately

## Next Steps

1. Get Razorpay API keys from: https://dashboard.razorpay.com/
2. Update `.env` files with test keys
3. Run `npm start` in backend to restart server
4. Update booking_details table schema to include payment_id column
5. Test payment flow with test card numbers

