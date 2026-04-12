'use client';

import { useEffect } from 'react';
import axios from '../services/axios';

// Load Razorpay script
export const useRazorpayScript = () => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);
};

// Hook to handle Razorpay payment
export const useRazorpayPayment = () => {
  const initiatePayment = async (bookingData, onSuccess, onError) => {
    try {
      // Step 1: Create order on backend
      const { data: orderResponse } = await axios.post('/api/payment/create-order', {
        amount: bookingData.amount,
        email: bookingData.email,
        phone: bookingData.phone_no,
        name: bookingData.guest_name,
      });

      if (!orderResponse.success || !orderResponse.order?.id) {
        throw new Error(orderResponse?.error || 'Failed to create payment order');
      }

      const order = orderResponse.order;
      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

      if (!keyId) {
        throw new Error('Razorpay Key ID not configured');
      }

      // Step 2: Open Razorpay checkout
      const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Hotel Booking',
        description: 'Complete your hotel booking payment',
        order_id: order.id,
        handler: async (response) => {
          try {
            // Step 3: Verify payment on backend
            const { data: verifyResponse } = await axios.post('/api/payment/verify-payment', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            if (verifyResponse.success) {
              // Payment verified, proceed with booking
              onSuccess(response.razorpay_payment_id);
            } else {
              onError('Payment verification failed');
            }
          } catch (verifyError) {
            console.error('Payment verification error:', verifyError);
            onError(verifyError?.response?.data?.error || 'Payment verification failed');
          }
        },
        modal: {
          ondismiss: () => {
            onError('Payment was cancelled');
          },
        },
        prefill: {
          name: bookingData.guest_name,
          email: bookingData.email,
          contact: bookingData.phone_no,
        },
        theme: {
          color: '#10b981', // emerald-500
        },
      };

      const window_object = window;
      if (!window_object.Razorpay) {
        throw new Error('Razorpay script not loaded');
      }

      const razorpay = new window_object.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Payment initiation error:', error);
      onError(
        error?.response?.data?.details ||
        error?.response?.data?.error ||
        error.message ||
        'Failed to initiate payment'
      );
    }
  };

  return { initiatePayment };
};
