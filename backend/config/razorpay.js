import Razorpay from 'razorpay';

export const getRazorpayClient = () => {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

  if (!keyId) {
    throw new Error('Missing RAZORPAY_KEY_ID');
  }

  if (!keySecret) {
    throw new Error('Missing RAZORPAY_KEY_SECRET');
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

export default getRazorpayClient;
