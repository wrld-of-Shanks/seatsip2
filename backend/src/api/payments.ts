import express, { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db';
import { secureLogger } from '../security/logger';
import { verifyWebhookSignature } from '../payments/razorpay';

const router = Router();

router.post('/razorpay/webhook', express.raw({ type: 'application/json', limit: '50kb' }), async (req, res) => {
  const signature = req.header('x-razorpay-signature');
  if (!signature || !verifyWebhookSignature(req.body as Buffer, signature)) {
    secureLogger.warn('[Payments] Razorpay webhook rejected: invalid signature');
    return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
  }

  const event = JSON.parse((req.body as Buffer).toString('utf8'));
  const payment = event.payload?.payment?.entity;
  const refund = event.payload?.refund?.entity;
  const razorpayPaymentId = payment?.id || refund?.payment_id || null;

  // Idempotency check: skip if this payment_id has already been processed
  if (razorpayPaymentId) {
    const existing = await prisma.idempotencyKey.findUnique({
      where: { razorpay_payment_id: razorpayPaymentId },
    });
    if (existing) {
      secureLogger.info(`[Payments] Webhook idempotent skip: ${razorpayPaymentId}`);
      return res.json({ success: true, idempotent: true });
    }
  }

  const rawEventId = event.id || `${event.event}:${event.created_at}`;

  await prisma.$transaction(async (tx) => {
    if (razorpayPaymentId) {
      await tx.idempotencyKey.create({
        data: {
          id: uuidv4(),
          razorpay_payment_id: razorpayPaymentId,
          raw_event_id: rawEventId,
        },
      });
    }

    await tx.paymentEvent.create({
      data: {
        id: uuidv4(),
        user_id: null,
        order_id: null,
        event_type: event.event,
        payment_method: 'RAZORPAY',
        amount: (payment?.amount || refund?.amount || 0) / 100,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_refund_id: refund?.id || null,
        raw_event_id: rawEventId,
        status: payment?.status || refund?.status || 'RECEIVED',
      },
    });
  });

  secureLogger.info(`[Payments] Webhook processed: ${event.event}, payment: ${razorpayPaymentId}`);
  return res.json({ success: true });
});

export default router;
