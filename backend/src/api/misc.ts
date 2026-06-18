import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticate } from '../common/auth';
import { AuthenticatedRequest } from '../types/authenticated-request';
import { audit, validate } from '../security/http';
import { secureLogger } from '../security/logger';
import { razorpay, razorpayKeyId, verifyRazorpayPaymentSignature } from '../payments/razorpay';
import { savePushToken } from '../services/pushNotifications';

// ===== CART =====
export const cartRouter = Router();
cartRouter.use(authenticate);

const MAX_CART_QUANTITY = 20;
const addCartSchema = z.object({
  cafe_id: z.string().min(1),
  menu_item_id: z.string().min(1),
  quantity: z.number().int().min(1).max(MAX_CART_QUANTITY).default(1),
});
const updateCartSchema = z.object({ quantity: z.number().int().min(0).max(MAX_CART_QUANTITY) });
const idParamsSchema = z.object({ id: z.string().min(1) });
const walletTopupOrderSchema = z.object({ amount: z.number().positive().max(500000) });
const walletTopupVerifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(20),
});
const pushTokenSchema = z.object({ token: z.string().min(10).max(512) });

const e164Phone = /^\+[1-9]\d{6,14}$/;
const profilePatchSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    phone: z.union([z.string().regex(e164Phone), z.literal('')]).optional(),
    avatar: z
      .string()
      .max(1_500_000)
      .refine(
        (s) =>
          /^https?:\/\//i.test(s) ||
          /^data:image\/(png|jpeg|jpg|webp);base64,/i.test(s),
        'avatar must be an https URL or a small base64 image data URL'
      )
      .optional(),
  })
  .strict();

async function getCartPayload(userId: string) {
  const items = await prisma.cartItem.findMany({
    where: { user_id: userId },
    include: {
      menu_item: { select: { name: true, price: true, image_url: true, is_veg: true, description: true, stock_quantity: true, is_available: true } },
      cafe: { select: { name: true, id: true } },
    },
  });

  const flat = items.map(({ menu_item: mi, cafe: c, ...ci }) => ({
    ...ci,
    name: mi.name,
    price: mi.price,
    image_url: mi.image_url,
    is_veg: mi.is_veg,
    description: mi.description,
    stock_quantity: mi.stock_quantity,
    is_available: mi.is_available,
    cafe_name: c.name,
    cafe_id: c.id,
  }));

  const subtotal = flat.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;
  return { items: flat, subtotal, tax, total };
}

function cleanupExpiredCarts(): void {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  void prisma.cartItem.deleteMany({ where: { updated_at: { lt: cutoff } } }).catch((error) => {
    console.error('cart cleanup failed', error);
  });
}

setInterval(cleanupExpiredCarts, 60 * 60 * 1000).unref();

cartRouter.get('/', audit('CART_READ', 'cart'), async (req: AuthenticatedRequest, res: Response) => {
  const payload = await getCartPayload(req.user.userId);
  secureLogger.info(`[Cart] Read for user ${req.user.userId}: ${payload.items.length} items, ₹${payload.total}`);
  return res.json({ success: true, data: payload });
});

cartRouter.post('/add', validate({ body: addCartSchema }), audit('CART_ADD', 'cart'), async (req: AuthenticatedRequest, res: Response) => {
  const { cafe_id, menu_item_id, quantity } = req.body as z.infer<typeof addCartSchema>;

  try {
    const menuItem = await prisma.menuItem.findFirst({
      where: { id: menu_item_id, cafe_id },
      select: { id: true, cafe_id: true, price: true, stock_quantity: true, is_available: true },
    });
    
    if (!menuItem || !menuItem.is_available) return res.status(404).json({ success: false, message: 'Item unavailable' });

    await prisma.$transaction(async (tx) => {
      const existing = await tx.cartItem.findFirst({ where: { user_id: req.user.userId }, select: { cafe_id: true } });
      if (existing && existing.cafe_id !== cafe_id) {
        await tx.cartItem.deleteMany({ where: { user_id: req.user.userId } });
      }

      const existingItem = await tx.cartItem.findFirst({
        where: { user_id: req.user.userId, menu_item_id },
      });
      const nextQuantity = Math.min(MAX_CART_QUANTITY, (existingItem?.quantity || 0) + quantity);
      if (nextQuantity > menuItem.stock_quantity) throw new Error('Insufficient stock');

      if (existingItem) {
        await tx.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: nextQuantity },
        });
      } else {
        await tx.cartItem.create({
          data: {
            id: uuidv4(),
            user_id: req.user.userId,
            cafe_id,
            menu_item_id,
            quantity: nextQuantity,
          },
        });
      }
    });

    secureLogger.info(`[Cart] Added item ${menu_item_id} x${quantity} for user ${req.user.userId}`);
  secureLogger.info(`[Cart] Updated cart item ${req.params.id} to qty ${quantity} for user ${req.user.userId}`);
  return res.json({ success: true, data: await getCartPayload(req.user.userId) });
  } catch (err: unknown) {
    secureLogger.error('[Cart] Add failed', err);
    return res.status(409).json({ success: false, message: (err as Error).message || 'Error adding to cart' });
  }
});

cartRouter.patch('/:id', validate({ params: idParamsSchema, body: updateCartSchema }), audit('CART_UPDATE', 'cart'), async (req: AuthenticatedRequest, res: Response) => {
  const { quantity } = req.body as z.infer<typeof updateCartSchema>;
  const cartItem = await prisma.cartItem.findFirst({
    where: { id: req.params.id, user_id: req.user.userId },
    include: { menu_item: { select: { stock_quantity: true } } },
  });

  if (!cartItem) return res.status(404).json({ success: false, message: 'Cart item not found' });
  if (quantity > cartItem.menu_item.stock_quantity) return res.status(409).json({ success: false, message: 'Insufficient stock' });

  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: cartItem.id } });
  } else {
    await prisma.cartItem.update({
      where: { id: cartItem.id },
      data: { quantity },
    });
  }

  return res.json({ success: true, data: await getCartPayload(req.user.userId) });
});

cartRouter.delete('/clear', audit('CART_CLEAR', 'cart'), async (req: AuthenticatedRequest, res: Response) => {
  await prisma.cartItem.deleteMany({ where: { user_id: req.user.userId } });
  secureLogger.info(`[Cart] Cleared for user ${req.user.userId}`);
  return res.json({ success: true, data: await getCartPayload(req.user.userId) });
});

cartRouter.delete('/:id', validate({ params: idParamsSchema }), audit('CART_DELETE', 'cart'), async (req: AuthenticatedRequest, res: Response) => {
  const result = await prisma.cartItem.deleteMany({ where: { id: req.params.id, user_id: req.user.userId } });
  if (!result.count) {
    secureLogger.warn(`[Cart] Delete item ${req.params.id}: not found for user ${req.user.userId}`);
    return res.status(404).json({ success: false, message: 'Cart item not found' });
  }
  secureLogger.info(`[Cart] Deleted item ${req.params.id} for user ${req.user.userId}`);
  return res.json({ success: true, data: await getCartPayload(req.user.userId) });
});

// ===== USERS =====
export const usersRouter = Router();
usersRouter.use(authenticate);

usersRouter.get('/profile', audit('USER_PROFILE_READ', 'user'), async (req: AuthenticatedRequest, res: Response) => {
  const dbUser = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      wallet_balance: true,
      loyalty_points: true,
      loyalty_tier: true,
      avatar: true,
      created_at: true,
    },
  });
  secureLogger.info(`[Profile] Read for user ${req.user.userId}`);
  return res.json({ success: true, data: dbUser });
});

usersRouter.post(
  '/push-token',
  validate({ body: pushTokenSchema }),
  audit('PUSH_TOKEN', 'user'),
  async (req: AuthenticatedRequest, res: Response) => {
    await savePushToken(req.user.userId, (req.body as z.infer<typeof pushTokenSchema>).token);
    secureLogger.info(`[Profile] Push token saved for user ${req.user.userId}`);
  secureLogger.info(`[Notifications] Marked all as read for user ${req.user.userId}`);
  return res.json({ success: true });
  }
);

usersRouter.patch(
  '/profile',
  validate({ body: profilePatchSchema }),
  audit('USER_PROFILE_UPDATE', 'user'),
  async (req: AuthenticatedRequest, res: Response) => {
    const { name, phone, avatar } = req.body as z.infer<typeof profilePatchSchema>;
    await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(phone !== undefined ? { phone: phone === '' ? null : phone } : {}),
        ...(avatar !== undefined ? { avatar } : {}),
      },
    });
    const updated = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        wallet_balance: true,
        loyalty_points: true,
        loyalty_tier: true,
        avatar: true,
      },
    });
    secureLogger.info(`[Profile] Updated for user ${req.user.userId}: name=${name !== undefined}, phone=${phone !== undefined}, avatar=${avatar !== undefined}`);
    return res.json({ success: true, data: updated });
  }
);

usersRouter.post('/wallet/topup', (_req: Request, res: Response) => {
  secureLogger.warn('[Wallet] Direct top-up attempted (disabled)');
  return res.status(410).json({
    success: false,
    message: 'Direct wallet top-up is disabled. Create a Razorpay top-up order and verify the payment before crediting wallet.',
  });
});

usersRouter.post('/wallet/topup/order', validate({ body: walletTopupOrderSchema }), audit('WALLET_TOPUP_ORDER', 'wallet'), async (req: AuthenticatedRequest, res: Response) => {
  const { amount } = req.body as z.infer<typeof walletTopupOrderSchema>;
  const receiptId = `wal_${req.user.userId.slice(-12)}_${Date.now()}`;
  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency: 'INR',
    receipt: receiptId,
    notes: { purpose: 'wallet_topup', userId: req.user.userId },
  });

  await prisma.paymentEvent.create({
    data: {
      id: uuidv4(),
      user_id: req.user.userId,
      event_type: 'WALLET_TOPUP_CREATED',
      payment_method: 'RAZORPAY',
      amount,
      razorpay_order_id: order.id,
      status: 'CREATED',
    },
  });

  secureLogger.info(`[Wallet] Top-up order created for user ${req.user.userId}: order ${order.id}, ₹${amount}`);
  return res.status(201).json({ success: true, data: { orderId: order.id, amount: order.amount, currency: order.currency, keyId: razorpayKeyId() } });
});

usersRouter.post('/wallet/topup/verify', validate({ body: walletTopupVerifySchema }), audit('WALLET_TOPUP_VERIFY', 'wallet'), async (req: AuthenticatedRequest, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body as z.infer<typeof walletTopupVerifySchema>;
  if (!verifyRazorpayPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    return res.status(400).json({ success: false, message: 'Invalid payment signature' });
  }

  const event = await prisma.paymentEvent.findFirst({
    where: { razorpay_order_id, user_id: req.user.userId, status: 'CREATED' },
  });
  if (!event) return res.status(404).json({ success: false, message: 'Top-up order not found' });

  const existing = await prisma.walletTransaction.findFirst({
    where: { razorpay_payment_id },
    select: { id: true },
  });
  if (existing) return res.status(409).json({ success: false, message: 'Payment already credited' });

  const walletBalance = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: req.user.userId },
      data: { wallet_balance: { increment: event.amount } },
    });
    const updated = await tx.user.findUnique({
      where: { id: req.user.userId },
      select: { wallet_balance: true },
    });
    await tx.walletTransaction.create({
      data: {
        id: uuidv4(),
        user_id: req.user.userId,
        type: 'TOPUP',
        amount: event.amount,
        description: 'Wallet top-up via Razorpay',
        balance_after: Number(updated!.wallet_balance),
        razorpay_order_id,
        razorpay_payment_id,
      },
    });
    await tx.paymentEvent.update({
      where: { id: event.id },
      data: { status: 'CAPTURED', razorpay_payment_id },
    });
    return updated!.wallet_balance;
  });

  secureLogger.info(`[Wallet] Top-up verified for user ${req.user.userId}: ₹${event.amount} added, new balance ₹${walletBalance}`);
  return res.json({ success: true, data: { wallet_balance: walletBalance } });
});

usersRouter.get('/wallet/transactions', audit('WALLET_TRANSACTIONS_READ', 'wallet'), async (req: AuthenticatedRequest, res: Response) => {
  const transactions = await prisma.walletTransaction.findMany({
    where: { user_id: req.user.userId },
    orderBy: { created_at: 'desc' },
    take: 50,
  });
  secureLogger.info(`[Wallet] Transactions read for user ${req.user.userId}: ${transactions.length} entries`);
  return res.json({ success: true, data: transactions });
});

// ===== NOTIFICATIONS =====
export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

notificationsRouter.get('/unread-count', audit('NOTIFICATIONS_UNREAD', 'notification'), async (req: AuthenticatedRequest, res: Response) => {
  const count = await prisma.notification.count({
    where: { user_id: req.user.userId, is_read: false },
  });
  secureLogger.info(`[Notifications] Unread count for user ${req.user.userId}: ${count}`);
  return res.json({ success: true, data: { count } });
});

notificationsRouter.get('/', audit('NOTIFICATIONS_READ', 'notification'), async (req: AuthenticatedRequest, res: Response) => {
  const [notifs, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { user_id: req.user.userId },
      orderBy: { created_at: 'desc' },
      take: 50,
    }),
    prisma.notification.count({ where: { user_id: req.user.userId, is_read: false } }),
  ]);
  secureLogger.info(`[Notifications] List for user ${req.user.userId}: ${notifs.length} notifications, ${unread} unread`);
  return res.json({ success: true, data: notifs, unread });
});

notificationsRouter.patch('/read-all', audit('NOTIFICATIONS_READ_ALL', 'notification'), async (req: AuthenticatedRequest, res: Response) => {
  await prisma.notification.updateMany({
    where: { user_id: req.user.userId },
    data: { is_read: true },
  });
  return res.json({ success: true });
});
