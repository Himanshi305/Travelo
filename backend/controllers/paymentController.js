import crypto from 'crypto';
import getRazorpayClient from '../config/razorpay.js';
import supabase from '../config/supabase.js';

const extractBearerToken = (req) => {
  const authHeader = req.headers?.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice(7).trim() || null;
};

const resolveAuthenticatedUser = async (req) => {
  if (req.user?.id) {
    return req.user;
  }

  const token = extractBearerToken(req);
  if (!token) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return null;
  }

  return data.user;
};

export const createOrder = async (req, res) => {
  try {
    const razorpay = getRazorpayClient();
    const user = await resolveAuthenticatedUser(req);
    if (!user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { amount, email, phone, name } = req.body;

    // Validate amount (convert to paise for Razorpay)
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount',
      });
    }

    const amountInPaise = Math.round(Number(amount) * 100);
    const receipt = `bk_${String(user.id).replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)}_${Date.now().toString().slice(-8)}`;

    try {
      const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt,
        payment_capture: 1,
        notes: {
          userId: user.id,
          email,
          phone,
          name,
        },
      });

      return res.status(200).json({
        success: true,
        order: {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
          receipt: order.receipt,
        },
      });
    } catch (razorpayError) {
      console.error('[createOrder] Razorpay API error:', razorpayError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create payment order',
        details:
          razorpayError?.response?.data?.error?.description ||
          razorpayError?.response?.data?.error?.reason ||
          razorpayError?.message ||
          'Unknown Razorpay error',
      });
    }
  } catch (err) {
    console.error('[createOrder] Error:', err);
    return res.status(500).json({
      success: false,
      error: 'Server error while creating order',
      details: err.message,
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const razorpay = getRazorpayClient();
    const user = await resolveAuthenticatedUser(req);
    if (!user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        error: 'Missing payment verification details',
      });
    }

    // Verify signature
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
    if (!keySecret) {
      return res.status(500).json({
        success: false,
        error: 'Missing RAZORPAY_KEY_SECRET',
      });
    }

    const hmac = crypto.createHmac('sha256', keySecret);
    hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== razorpaySignature) {
      console.warn('[verifyPayment] Signature mismatch:', {
        expected: generatedSignature,
        received: razorpaySignature,
      });
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed',
      });
    }

    // Optional: Fetch payment details from Razorpay to confirm
    try {
      const payment = await razorpay.payments.fetch(razorpayPaymentId);
      
      if (payment.status !== 'captured' && payment.status !== 'authorized') {
        return res.status(400).json({
          success: false,
          error: 'Payment not successfully processed',
          status: payment.status,
        });
      }
    } catch (fetchError) {
      console.error('[verifyPayment] Failed to fetch payment details:', fetchError);
      // Continue anyway as signature verification passed
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      paymentId: razorpayPaymentId,
      orderId: razorpayOrderId,
    });
  } catch (err) {
    console.error('[verifyPayment] Error:', err);
    return res.status(500).json({
      success: false,
      error: 'Server error while verifying payment',
      details: err.message,
    });
  }
};
