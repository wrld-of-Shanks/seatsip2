import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticate, DbClient } from '../common/auth';
import { AuthenticatedRequest } from '../types/authenticated-request';
import { audit, validate } from '../security/http';
import { secureLogger } from '../security/logger';
import { razorpay, razorpayKeyId, verifyRazorpayPaymentSignature } from '../payments/razorpay';
import { sendPushToUser } from '../services/pushNotifications';

const router = Router();

router.use(authenticate);

const ORDER_TYPES = new Set(['DINE_IN', 'TAKEOUT', 'DELIVERY']);
const PAYMENT_METHODS = new Set(['WALLET', 'UPI', 'CARD']);

const createOrderSchema = z.object({
  cafe_id: z.string().min(1),
  items: z.array(z.object({ menu_item_id: z.string().min(1), quantity: z.number().int().min(1).max(20) })).min(1),
  order_type: z.enum(['DINE_IN', 'TAKEOUT', 'DELIVERY']).default('DINE_IN'),
  special_instructions: z.string().max(500).optional(),
  payment_method: z.enum(['WALLET', 'UPI', 'CARD']).default('WALLET'),
  payment_details: z
    .object({
      razorpay_order_id: z.string().optional(),
      razorpay_payment_id: z.string().optional(),
      razorpay_signature: z.string().optional(),
    })
    .optional(),
  reservation_id: z.string().optional(),
});

const listQuerySchema = z.object({
  limit: z.string().regex(/^\d+$/).default('20'),
  offset: z.string().regex(/^\d+$/).default('0'),
});

const idParamsSchema = z.object({ id: z.string().min(1) });
const refundSchema = z.object({ amount: z.number().positive(), reason: z.string().max(200).optional() });
const paymentIntentSchema = z.object({
  cafe_id: z.string().min(1),
  order_type: z.enum(['DINE_IN', 'TAKEOUT', 'DELIVERY']).default('DINE_IN'),
});

// GET /orders
router.get('/', validate({ query: listQuerySchema }), audit('ORDER_LIST', 'order'), async (req: AuthenticatedRequest, res: Response) => {
  const { limit, offset } = req.query as z.infer<typeof listQuerySchema>;

  const rows = await prisma.order.findMany({
    where: { user_id: req.user.userId },
    include: {
      cafe: { select: { name: true, image_url: true } },
    },
    orderBy: { created_at: 'desc' },
    take: parseInt(limit, 10),
    skip: parseInt(offset, 10),
  });

  const orders = rows.map(({ cafe: c, ...o }) => ({
    ...o,
    items: JSON.parse(o.items || '[]'),
    cafe_name: c.name,
    cafe_image: c.image_url,
  }));

  secureLogger.info(`[Orders] List for user ${req.user.userId}: ${orders.length} orders found`);
  return res.json({ success: true, data: orders });
});

// GET /orders/:id
router.get('/:id', validate({ params: idParamsSchema }), audit('ORDER_READ', 'order'), async (req: AuthenticatedRequest, res: Response) => {
  const order = await prisma.order.findFirst({
    where: { id: req.params.id, user_id: req.user.userId },
    include: {
      cafe: { select: { name: true, image_url: true, address: true, phone: true } },
    },
  });

  if (!order) {
    secureLogger.warn(`[Orders] Get order ${req.params.id}: not found for user ${req.user.userId}`);
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  secureLogger.info(`[Orders] Get order ${req.params.id}: found for user ${req.user.userId}`);
  const { cafe, ...rest } = order;
  return res.json({
    success: true,
    data: {
      ...rest,
      items: JSON.parse(order.items || '[]'),
      cafe_name: cafe.name,
      cafe_image: cafe.image_url,
      cafe_address: cafe.address,
      cafe_phone: cafe.phone,
    },
  });
});

router.post('/payment-intent', validate({ body: paymentIntentSchema }), audit('ORDER_PAYMENT_INTENT', 'order'), async (req: AuthenticatedRequest, res: Response) => {
  const { cafe_id, order_type } = req.body as z.infer<typeof paymentIntentSchema>;
  const cafe = await prisma.cafe.findUnique({ where: { id: cafe_id }, select: { id: true, delivery_fee: true } });
  if (!cafe) return res.status(404).json({ success: false, message: 'Cafe not found' });

  const cart = await prisma.cartItem.findMany({
    where: { user_id: req.user.userId, cafe_id },
    include: { menu_item: { select: { price: true, stock_quantity: true, is_available: true, name: true } } },
  });
  if (!cart.length) return res.status(400).json({ success: false, message: 'Cart is empty' });
  for (const item of cart) {
    const mi = item.menu_item;
    if (!mi.is_available || item.quantity > mi.stock_quantity) {
      return res.status(409).json({ success: false, message: `Insufficient stock for ${mi.name}` });
    }
  }

  const subtotal = cart.reduce((sum, item) => sum + item.menu_item.price * item.quantity, 0);
  const tax = subtotal * 0.05;
  const deliveryFee = order_type === 'DELIVERY' ? cafe.delivery_fee : 0;
  const total = subtotal + tax + deliveryFee;
  const order = await razorpay.orders.create({
    amount: Math.round(total * 100),
    currency: 'INR',
    receipt: `order_${req.user.userId}_${Date.now()}`,
    notes: { purpose: 'order_payment', userId: req.user.userId, cafeId: cafe_id },
  });

  secureLogger.info(`[Orders] Payment intent created for user ${req.user.userId}, cafe ${cafe_id}: order ${order.id}`);
  return res.status(201).json({ success: true, data: { orderId: order.id, amount: order.amount, currency: order.currency, keyId: razorpayKeyId() } });
});

function assertPayment(input: z.infer<typeof createOrderSchema>): string | null {
  if (!PAYMENT_METHODS.has(input.payment_method)) return 'Please choose a valid payment method';

  if (input.payment_method === 'CARD') {
    return 'Direct card payment is disabled. Use Razorpay Checkout/tokenized card processing; raw card data must never be sent to SeatSip.';
  }

  if (input.payment_method === 'UPI') {
    const details = input.payment_details;
    if (!details?.razorpay_order_id || !details.razorpay_payment_id || !details.razorpay_signature) {
      return 'Verified Razorpay UPI payment is required';
    }
    if (!verifyRazorpayPaymentSignature(details.razorpay_order_id, details.razorpay_payment_id, details.razorpay_signature)) {
      return 'Invalid Razorpay payment signature';
    }
  }

  return null;
}

// POST /orders
router.post('/', validate({ body: createOrderSchema }), audit('ORDER_CREATE', 'order'), async (req: AuthenticatedRequest, res: Response) => {
  const input = req.body as z.infer<typeof createOrderSchema>;
  const paymentError = assertPayment(input);
  if (paymentError) return res.status(400).json({ success: false, message: paymentError });
  if (!ORDER_TYPES.has(input.order_type)) return res.status(400).json({ success: false, message: 'Please choose a valid order type' });

  const cafe = await prisma.cafe.findUnique({ where: { id: input.cafe_id } });
  if (!cafe) return res.status(404).json({ success: false, message: 'Cafe not found' });

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      const orderItems: Record<string, unknown>[] = [];

      for (const item of input.items) {
        const menuItem = await tx.menuItem.findFirst({
          where: { id: item.menu_item_id, cafe_id: input.cafe_id },
        });
        if (!menuItem || !menuItem.is_available) throw new Error(`Menu item unavailable: ${item.menu_item_id}`);
        if (item.quantity > menuItem.stock_quantity) throw new Error(`Insufficient stock for ${menuItem.name}`);
        const lineTotal = menuItem.price * item.quantity;
        subtotal += lineTotal;
        orderItems.push({
          id: uuidv4(),
          menu_item_id: menuItem.id,
          name: menuItem.name,
          unit_price: menuItem.price,
          quantity: item.quantity,
          subtotal: lineTotal,
        });
      }

      const tax = subtotal * 0.05;
      const delivery_fee = input.order_type === 'DELIVERY' ? cafe.delivery_fee : 0;
      const total = subtotal + tax + delivery_fee;
      const orderId = uuidv4();

      if (input.payment_method === 'WALLET') {
        const dbUser = await tx.user.findUnique({
          where: { id: req.user.userId },
          select: { wallet_balance: true },
        });
        if (!dbUser || Number(dbUser.wallet_balance) < total) throw new Error('Insufficient wallet balance');
        await tx.user.update({
          where: { id: req.user.userId },
          data: { wallet_balance: { decrement: total } },
        });
        const updated = await tx.user.findUnique({
          where: { id: req.user.userId },
          select: { wallet_balance: true },
        });
        await tx.walletTransaction.create({
          data: {
            id: uuidv4(),
            user_id: req.user.userId,
            type: 'DEBIT',
            amount: total,
            description: `Order payment at ${cafe.name}`,
            reference_id: orderId,
            balance_after: Number(updated!.wallet_balance),
          },
        });
      }

      for (const item of input.items) {
        const r = await tx.menuItem.updateMany({
          where: { id: item.menu_item_id, stock_quantity: { gte: item.quantity } },
          data: { stock_quantity: { decrement: item.quantity } },
        });
        if (r.count === 0) throw new Error(`Insufficient stock for item ${item.menu_item_id}`);
      }

      const estimatedMinutes = cafe.prep_time_minutes || 15;
      const estimatedAt = new Date(Date.now() + estimatedMinutes * 60000);
      const razorpayOrderId = input.payment_details?.razorpay_order_id || null;
      const razorpayPaymentId = input.payment_details?.razorpay_payment_id || null;

      await tx.order.create({
        data: {
          id: orderId,
          user_id: req.user.userId,
          cafe_id: input.cafe_id,
          reservation_id: input.reservation_id || null,
          status: 'CONFIRMED',
          order_type: input.order_type,
          subtotal,
          tax,
          delivery_fee,
          total,
          payment_status: 'PAID',
          payment_method: input.payment_method,
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
          special_instructions: input.special_instructions || null,
          estimated_ready_at: estimatedAt,
          items: JSON.stringify(orderItems),
        },
      });

      if (input.payment_method === 'UPI') {
        await tx.paymentEvent.create({
          data: {
            id: uuidv4(),
            user_id: req.user.userId,
            order_id: orderId,
            event_type: 'ORDER_PAYMENT_CAPTURED',
            payment_method: 'UPI',
            amount: total,
            razorpay_order_id: razorpayOrderId,
            razorpay_payment_id: razorpayPaymentId,
            status: 'CAPTURED',
          },
        });
      }

      await tx.cartItem.deleteMany({ where: { user_id: req.user.userId, cafe_id: input.cafe_id } });

      const inserted = await tx.order.findUnique({
        where: { id: orderId },
      });
      const pointsEarned = Math.floor(total / 10);
      return { inserted: inserted!, pointsEarned, estimatedMinutes };
    });

    try {
      await prisma.user.update({
        where: { id: req.user.userId },
        data: {
          loyalty_points: { increment: outcome.pointsEarned },
        },
      });
      await prisma.notification.create({
        data: {
          id: uuidv4(),
          user_id: req.user.userId,
          title: 'Order Confirmed',
          body: `Your order at ${cafe.name} is confirmed. Ready in ~${outcome.estimatedMinutes} mins. You earned ${outcome.pointsEarned} points.`,
          type: 'ORDER',
        },
      });
    } catch (sideErr) {
      secureLogger.error('post-order loyalty/notification failed', sideErr);
    }

    void sendPushToUser(req.user.userId, 'Order confirmed', `Your order at ${cafe.name} is confirmed.`, {
      type: 'ORDER',
      orderId: String(outcome.inserted.id),
    });

    secureLogger.info(`[Orders] Order created: ${outcome.inserted.id} for user ${req.user.userId}, cafe ${input.cafe_id}, ₹${outcome.inserted.total}`);
    return res.status(201).json({ success: true, data: outcome.inserted });
  } catch (error: unknown) {
    secureLogger.warn(`[Orders] Order creation failed for user ${req.user.userId}: ${(error as Error).message}`);
    return res.status(409).json({ success: false, message: (error as Error).message || 'Order failed' });
  }
});

async function refundOrder(req: AuthenticatedRequest, res: Response, orderId: string, amount: number, reason: string) {
  const order = await prisma.order.findFirst({ where: { id: orderId, user_id: req.user.userId } });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (amount <= 0 || amount > order.total) return res.status(400).json({ success: false, message: 'Invalid refund amount' });

  if (order.payment_method === 'WALLET') {
    const walletBalance = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: req.user.userId },
        data: { wallet_balance: { increment: amount } },
      });
      const updated = await tx.user.findUnique({
        where: { id: req.user.userId },
        select: { wallet_balance: true },
      });
      await tx.walletTransaction.create({
        data: {
          id: uuidv4(),
          user_id: req.user.userId,
          type: 'REFUND',
          amount,
          description: reason,
          reference_id: order.id,
          balance_after: Number(updated!.wallet_balance),
        },
      });
      return Number(updated!.wallet_balance);
    });
    secureLogger.info(`[Orders] Wallet refund for order ${orderId}: ₹${amount} -> wallet balance ₹${walletBalance}`);
    return res.json({ success: true, data: { wallet_balance: walletBalance } });
  }

  if (!['UPI', 'CARD'].includes(order.payment_method || '') || !order.razorpay_payment_id) {
    return res.status(409).json({ success: false, message: 'Refund is not available for this payment' });
  }

  const refund = await razorpay.payments.refund(order.razorpay_payment_id, {
    amount: Math.round(amount * 100),
    notes: { orderId: order.id, reason },
  });
  await prisma.paymentEvent.create({
    data: {
      id: uuidv4(),
      user_id: req.user.userId,
      order_id: order.id,
      event_type: 'REFUND_CREATED',
      payment_method: order.payment_method || 'RAZORPAY',
      amount,
      razorpay_payment_id: order.razorpay_payment_id,
      razorpay_refund_id: refund.id,
      status: String(refund.status || 'CREATED'),
    },
  });
  secureLogger.info(`[Orders] Razorpay refund for order ${orderId}: ₹${amount}, refund id: ${refund.id}`);
  return res.json({ success: true, data: refund });
}

router.post('/:id/refund', validate({ params: idParamsSchema, body: refundSchema }), audit('ORDER_REFUND', 'order'), async (req: AuthenticatedRequest, res: Response) => {
  const { amount, reason } = req.body as z.infer<typeof refundSchema>;
  return refundOrder(req, res, req.params.id, amount, reason || 'Partial order refund');
});

// PATCH /orders/:id/cancel
router.patch('/:id/cancel', validate({ params: idParamsSchema }), audit('ORDER_CANCEL', 'order'), async (req: AuthenticatedRequest, res: Response) => {
  const order = await prisma.order.findFirst({
    where: { id: req.params.id, user_id: req.user.userId },
  });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
    return res.status(400).json({ success: false, message: 'Order cannot be cancelled at this stage' });
  }
 
  const restoreStock = async (tx: DbClient) => {
    const items = JSON.parse(order.items || '[]') as any[];
    for (const item of items) {
      await tx.menuItem.updateMany({
        where: { id: item.menu_item_id },
        data: { stock_quantity: { increment: item.quantity } },
      });
    }
  };

  if (order.payment_method === 'WALLET') {
    try {
      const walletBalance = await prisma.$transaction(async (tx) => {
        await restoreStock(tx);
        await tx.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
        await tx.user.update({
          where: { id: req.user.userId },
          data: { wallet_balance: { increment: order.total } },
        });
        const updated = await tx.user.findUnique({
          where: { id: req.user.userId },
          select: { wallet_balance: true },
        });
        await tx.walletTransaction.create({
          data: {
            id: uuidv4(),
            user_id: req.user.userId,
            type: 'REFUND',
            amount: order.total,
            description: 'Order cancellation refund',
            reference_id: order.id,
            balance_after: Number(updated!.wallet_balance),
          },
        });
        return Number(updated!.wallet_balance);
      });
      secureLogger.info(`[Orders] Order ${order.id} cancelled (wallet refund): ₹${order.total} returned to user ${req.user.userId}`);
      return res.json({ success: true, data: { order_id: order.id, status: 'CANCELLED', wallet_balance: walletBalance } });
    } catch (error: unknown) {
      return res.status(409).json({ success: false, message: (error as Error)?.message || 'Cancellation failed' });
    }
  }

  if (['UPI', 'CARD'].includes(order.payment_method || '') && order.razorpay_payment_id) {
    try {
      const refund = await razorpay.payments.refund(order.razorpay_payment_id, {
        amount: Math.round(Number(order.total) * 100),
        notes: { orderId: order.id, reason: 'Order cancellation refund' },
      });
      await prisma.$transaction(async (tx) => {
        await restoreStock(tx);
        await tx.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
        await tx.paymentEvent.create({
          data: {
            id: uuidv4(),
            user_id: req.user.userId,
            order_id: order.id,
            event_type: 'REFUND_CREATED',
            payment_method: order.payment_method || 'RAZORPAY',
            amount: order.total,
            razorpay_payment_id: order.razorpay_payment_id,
            razorpay_refund_id: refund.id,
            status: String(refund.status || 'CREATED'),
          },
        });
      });
      secureLogger.info(`[Orders] Order ${order.id} cancelled (Razorpay refund): ₹${order.total} refund id ${refund.id}`);
      return res.json({ success: true, data: { order_id: order.id, status: 'CANCELLED', refund } });
    } catch (error: unknown) {
      return res.status(502).json({
        success: false,
        message: (error as Error)?.message || 'Refund failed; order was not cancelled. Try again or contact support.',
      });
    }
  }

  secureLogger.warn(`[Orders] Cancel rejected for order ${order.id}: unsupported payment type ${order.payment_method}`);
  return res.status(409).json({ success: false, message: 'Cancellation is not available for this payment type' });
});

export default router;
