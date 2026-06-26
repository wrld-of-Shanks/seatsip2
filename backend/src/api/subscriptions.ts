import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticate } from '../common/auth';
import { AuthenticatedRequest } from '../types/authenticated-request';
import { validate } from '../security/http';
import { secureLogger } from '../security/logger';
import { razorpay, verifyRazorpayPaymentSignature } from '../payments/razorpay';
import { paymentLimiter } from '../security/rateLimit';

const subscriptionsRouter = Router();
subscriptionsRouter.use(authenticate);

// ─── Constants ─────────────────────────────────────────────────────────────────
const SUBSCRIPTION_PRICE = 199;
const SUBSCRIPTION_DURATION_DAYS = 30;

async function sendNotification(userId: string, title: string, body: string, data?: Record<string, string>) {
  try {
    await prisma.notification.create({
      data: {
        id: uuidv4(),
        user_id: userId,
        title,
        body,
        type: 'SUBSCRIPTION',
        data: JSON.stringify(data || {}),
      },
    });
  } catch {
    // silent
  }
}

// ─── GET /api/v1/subscriptions/status ──────────────────────────────────────────
subscriptionsRouter.get('/status', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { is_subscribed: true, subscription_expires_at: true, wallet_balance: true },
  });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const sub = await prisma.subscription.findUnique({
    where: { user_id: userId },
    select: { status: true, started_at: true, expires_at: true, auto_renew: true, plan_type: true, cancelled_at: true },
  });

  const isActive = user.is_subscribed && user.subscription_expires_at && user.subscription_expires_at > new Date();

  const durationDays = sub?.plan_type === 'YEARLY' ? 365 : SUBSCRIPTION_DURATION_DAYS;
  const price = sub?.plan_type === 'YEARLY' ? Math.round(SUBSCRIPTION_PRICE * 12 * 0.85) : SUBSCRIPTION_PRICE;

  secureLogger.info(`[Subscriptions] Status check for user ${userId}: ${isActive ? 'active' : 'inactive'}`);
  return res.json({
    success: true,
    isSubscribed: isActive,
    subscription: sub ? {
      planType: sub.plan_type,
      status: sub.status,
      startedAt: sub.started_at,
      expiresAt: sub.expires_at,
      autoRenew: sub.auto_renew,
      cancelledAt: sub.cancelled_at,
      daysRemaining: sub.expires_at ? Math.max(0, Math.floor((sub.expires_at.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0,
    } : null,
    benefits: {
      bonusEarning: '1.5x points multiplier on all earning events',
      noPointExpiry: 'Points never expire while subscription is active',
      priorityRedemption: 'Redeem points even if slightly below reward cost',
      birthdayMultiplier: '2x points on your birthday month',
      streakRewards: 'Bonus points for consecutive visits',
      promoBonus: 'Access to subscriber-only promotional codes',
    },
    walletBalance: Number(user.wallet_balance),
    subscriptionPrice: price,
  });
});

// ─── POST /api/v1/subscriptions/create-order ───────────────────────────────────
// Creates a Razorpay order for the subscription price so client can process payment
const createOrderSchema = z.object({
  planType: z.enum(['MONTHLY', 'YEARLY']).optional().default('MONTHLY'),
});

subscriptionsRouter.post('/create-order', paymentLimiter, validate({ body: createOrderSchema }), async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const { planType } = req.body;
  const amountPaise = (planType === 'YEARLY' ? Math.round(SUBSCRIPTION_PRICE * 12 * 0.85) : SUBSCRIPTION_PRICE) * 100;

  try {
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `sub_${userId.slice(0, 8)}_${Date.now()}`,
      notes: { userId, planType },
    });

    secureLogger.info(`[Subscriptions] Create order for user ${userId}: order ${order.id}, ₹${Number(order.amount) / 100}`);
    return res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err: any) {
    secureLogger.error(`[Subscriptions] Create order failed for user ${userId}`, err);
    return res.status(502).json({ success: false, message: 'Failed to create payment order', error: err.message });
  }
});

// ─── POST /api/v1/subscriptions/activate ───────────────────────────────────────
const activateSchema = z.object({
  planType: z.enum(['MONTHLY', 'YEARLY']).optional().default('MONTHLY'),
  paymentMethod: z.enum(['WALLET', 'RAZORPAY']),
  razorpay_payment_id: z.string().optional(),
  razorpay_order_id: z.string().optional(),
  razorpay_signature: z.string().optional(),
});

subscriptionsRouter.post('/activate', paymentLimiter, validate({ body: activateSchema }), async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const { planType, paymentMethod, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

  const durationDays = planType === 'YEARLY' ? 365 : SUBSCRIPTION_DURATION_DAYS;
  const price = planType === 'YEARLY' ? Math.round(SUBSCRIPTION_PRICE * 12 * 0.85) : SUBSCRIPTION_PRICE;

  // Verify payment for RAZORPAY method
  if (paymentMethod === 'RAZORPAY') {
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing Razorpay payment details' });
    }
    const isValid = verifyRazorpayPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) {
      return res.status(402).json({ success: false, message: 'Payment verification failed' });
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    if (paymentMethod === 'WALLET') {
      if (Number(user.wallet_balance) < price) {
        throw new Error(`Insufficient wallet balance. Need ₹${price}, have ₹${Number(user.wallet_balance)}`);
      }
    }

    if (user.is_subscribed && user.subscription_expires_at && user.subscription_expires_at > new Date()) {
      // Extend existing subscription
      const newExpiry = new Date(user.subscription_expires_at.getTime() + durationDays * 24 * 60 * 60 * 1000);

      if (paymentMethod === 'WALLET') {
        await tx.user.update({
          where: { id: userId },
          data: {
            subscription_expires_at: newExpiry,
            wallet_balance: { decrement: price },
          },
        });
        await tx.walletTransaction.create({
          data: {
            id: uuidv4(),
            user_id: userId,
            type: 'PURCHASE',
            amount: -price,
            description: `${planType} Subscription extension — ₹${price}`,
            balance_after: Number(user.wallet_balance) - price,
          },
        });
      } else {
        await tx.user.update({
          where: { id: userId },
          data: { subscription_expires_at: newExpiry },
        });
      }

      await tx.subscription.upsert({
        where: { user_id: userId },
        create: {
          id: uuidv4(),
          user_id: userId,
          plan_type: planType,
          started_at: new Date(),
          expires_at: newExpiry,
          auto_renew: true,
        },
        update: {
          expires_at: newExpiry,
          status: 'ACTIVE',
          auto_renew: true,
          cancelled_at: null,
        },
      });

      return { newExpiry, extended: true };
    }

    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    if (paymentMethod === 'WALLET') {
      await tx.user.update({
        where: { id: userId },
        data: {
          is_subscribed: true,
          subscription_expires_at: expiresAt,
          wallet_balance: { decrement: price },
          last_activity_at: new Date(),
        },
      });
      await tx.walletTransaction.create({
        data: {
          id: uuidv4(),
          user_id: userId,
          type: 'PURCHASE',
          amount: -price,
          description: `${planType} Subscription — ₹${price} (Wallet)`,
          balance_after: Number(user.wallet_balance) - price,
        },
      });
    } else {
      await tx.user.update({
        where: { id: userId },
        data: {
          is_subscribed: true,
          subscription_expires_at: expiresAt,
          last_activity_at: new Date(),
        },
      });
      if (razorpay_payment_id) {
        await tx.walletTransaction.create({
          data: {
            id: uuidv4(),
            user_id: userId,
            type: 'PURCHASE',
            amount: price,
            description: `${planType} Subscription — ₹${price} (Razorpay ${razorpay_payment_id.slice(0, 8)})`,
            balance_after: Number(user.wallet_balance),
          },
        });
      }
    }

    await tx.subscription.upsert({
      where: { user_id: userId },
      create: {
        id: uuidv4(),
        user_id: userId,
        plan_type: planType,
        started_at: new Date(),
        expires_at: expiresAt,
        auto_renew: true,
      },
      update: {
        plan_type: planType,
        status: 'ACTIVE',
        expires_at: expiresAt,
        started_at: new Date(),
        cancelled_at: null,
        auto_renew: true,
      },
    });

    return { expiresAt, extended: false };
  });

  await sendNotification(
    userId,
    result.extended ? 'Subscription Extended!' : 'Welcome to SeatSip Monthly!',
    result.extended
      ? `Your subscription has been extended to ${result.newExpiry.toLocaleDateString()}.`
      : `Your subscription is active until ${result.expiresAt.toLocaleDateString()}. Enjoy 1.5x points, no expiry, and more!`,
    { expiresAt: result.extended ? result.newExpiry!.toISOString() : result.expiresAt.toISOString() },
  );

  secureLogger.info(`[Subscriptions] Activated for user ${userId}: ${planType}, ₹${price}, ${result.extended ? 'extended' : 'new'}`);
  return res.json({
    success: true,
    message: result.extended ? 'Subscription extended successfully' : 'Subscription activated successfully',
    subscription: {
      planType,
      expiresAt: result.extended ? result.newExpiry : result.expiresAt,
      autoRenew: true,
      amount: price,
    },
  });
});

// ─── POST /api/v1/subscriptions/cancel ─────────────────────────────────────────
subscriptionsRouter.post('/cancel', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const result = await prisma.$transaction(async (tx) => {
    const sub = await tx.subscription.findUnique({ where: { user_id: userId } });
    if (!sub) throw new Error('No active subscription found');

    await tx.subscription.update({
      where: { user_id: userId },
      data: {
        auto_renew: false,
        cancelled_at: new Date(),
        status: 'CANCELLED',
      },
    });

    // Don't revoke benefits immediately — they last until expiry
    return { expiresAt: sub.expires_at };
  });

  await sendNotification(
    userId,
    'Subscription Cancelled',
    `Your subscription will remain active until ${result.expiresAt.toLocaleDateString()}. After that, points will expire after 12 months of inactivity.`,
  );

  secureLogger.info(`[Subscriptions] Cancelled for user ${userId}, benefits until ${result.expiresAt.toLocaleDateString()}`);
  return res.json({
    success: true,
    message: `Subscription cancelled. Benefits continue until ${result.expiresAt.toLocaleDateString()}.`,
    expiresAt: result.expiresAt,
  });
});

// ─── POST /api/v1/subscriptions/auto-renew-check ───────────────────────────────
subscriptionsRouter.post('/auto-renew-check', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const sub = await prisma.subscription.findUnique({ where: { user_id: userId } });
  if (!sub) return res.json({ success: true, needsRenewal: false });

  if (!sub.auto_renew || sub.status !== 'ACTIVE') {
    return res.json({ success: true, needsRenewal: false, message: 'Auto-renew is disabled or subscription is not active' });
  }

  const daysUntilExpiry = Math.max(0, Math.floor((sub.expires_at.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  if (daysUntilExpiry <= 0) {
    // Auto-renew: extend by the plan duration
    const durationDays = sub.plan_type === 'YEARLY' ? 365 : SUBSCRIPTION_DURATION_DAYS;
    const price = sub.plan_type === 'YEARLY' ? Math.round(SUBSCRIPTION_PRICE * 12 * 0.85) : SUBSCRIPTION_PRICE;
    const newExpiry = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { wallet_balance: true } });
      const balance = Number(user?.wallet_balance || 0);

      if (balance < price) {
        // Insufficient funds — disable auto-renew, expire subscription, notify user
        await tx.subscription.update({
          where: { user_id: userId },
          data: { auto_renew: false, status: 'EXPIRED' },
        });
        await tx.user.update({
          where: { id: userId },
          data: { is_subscribed: false, subscription_expires_at: null },
        });
        return { renewed: false, reason: 'insufficient_funds', newExpiry: null };
      }

      await tx.subscription.update({
        where: { user_id: userId },
        data: { expires_at: newExpiry, status: 'ACTIVE' },
      });
      await tx.user.update({
        where: { id: userId },
        data: {
          is_subscribed: true,
          subscription_expires_at: newExpiry,
          wallet_balance: { decrement: price },
        },
      });
      await tx.walletTransaction.create({
        data: {
          id: uuidv4(),
          user_id: userId,
          type: 'PURCHASE',
          amount: -price,
          description: `${sub.plan_type} Subscription Auto-Renew — ₹${price}`,
          balance_after: balance - price,
        },
      });

      return { renewed: true, reason: null, newExpiry };
    });

    if (result.renewed) {
      await sendNotification(
        userId,
        'Subscription Auto-Renewed',
        `Your ${sub.plan_type} subscription has been renewed until ${result.newExpiry!.toLocaleDateString()}. ₹${price} charged from wallet.`,
      );
      secureLogger.info(`[Subscriptions] Auto-renewed for user ${userId}: new expiry ${result.newExpiry}`);
      return res.json({ success: true, needsRenewal: false, renewed: true, newExpiry: result.newExpiry });
    }

    await sendNotification(
      userId,
      'Subscription Expired — Insufficient Wallet Balance',
      `Your ${sub.plan_type} subscription could not be auto-renewed. Please add funds to your wallet and re-subscribe.`,
    );
    secureLogger.warn(`[Subscriptions] Auto-renew failed for user ${userId}: insufficient wallet balance`);
    return res.json({ success: true, needsRenewal: false, renewed: false, reason: result.reason });
  }

  secureLogger.info(`[Subscriptions] Auto-renew check for user ${userId}: ${daysUntilExpiry} days left, autoRenew: ${sub.auto_renew}`);
  return res.json({
    success: true,
    needsRenewal: daysUntilExpiry <= 7,
    daysUntilExpiry,
    autoRenew: sub.auto_renew,
  });
});

export default subscriptionsRouter;
