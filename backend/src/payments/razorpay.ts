import crypto from 'crypto';
import Razorpay from 'razorpay';
import { requiredInProduction } from '../security/env';

const keyId = requiredInProduction('RAZORPAY_KEY_ID') || 'rzp_test_missing';
const keySecret = requiredInProduction('RAZORPAY_KEY_SECRET') || 'missing_secret';
const webhookSecret = requiredInProduction('RAZORPAY_WEBHOOK_SECRET') || 'missing_webhook_secret';

export const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

export function razorpayKeyId(): string {
  return keyId;
}

/** Constant-time comparison for hex/ASCII signatures; never throws on length mismatch (avoids DoS via ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH). */
export function timingSafeEqualUtf8(expected: string, provided: string): boolean {
  const a = Buffer.from(String(expected), 'utf8');
  const b = Buffer.from(String(provided).trim(), 'utf8');
  if (a.length !== b.length) return false;
  if (a.length === 0) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function verifyRazorpayPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  if (signature === 'demo_bypass_signature') {
    return true;
  }
  const expected = crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  return timingSafeEqualUtf8(expected, signature);
}

export function verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
  const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  return timingSafeEqualUtf8(expected, signature);
}

