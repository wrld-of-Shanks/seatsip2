import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../src/app';

const MOCK_USER_ID = 'order-test-user-id';

function buildToken(): string {
  return jwt.sign(
    { userId: MOCK_USER_ID, email: 'order-test@example.com', role: 'USER', jti: 'order-test-jti' },
    process.env.JWT_ACCESS_SECRET_CURRENT || 'jest-access-secret-min-32-chars-long!!',
    { expiresIn: 60 },
  );
}

jest.mock('../src/db', () => {
  const m = {
    revokedToken: { findFirst: jest.fn().mockResolvedValue(null) },
    order: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    cafe: { findUnique: jest.fn() },
    user: { findUnique: jest.fn(), update: jest.fn() },
    menuItem: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    cartItem: { deleteMany: jest.fn() },
    walletTransaction: { create: jest.fn() },
    paymentEvent: { create: jest.fn() },
    notification: { create: jest.fn() },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    devicePushToken: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn(async (fn: any) => {
      if (typeof fn === 'function') return fn(m);
      return fn;
    }),
    $disconnect: jest.fn(),
  };
  return { prisma: m, initDb: jest.fn().mockResolvedValue(undefined) };
});

const app = createApp();
const token = buildToken();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Orders API', () => {
  describe('POST /api/v1/orders', () => {
    it('returns 401 without auth token', async () => {
      const res = await request(app).post('/api/v1/orders').send({
        cafe_id: 'cafe-1', items: [{ menu_item_id: 'item-1', quantity: 2 }],
      });
      expect(res.status).toBe(401);
    });

    it('returns 400 when items are missing', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ cafe_id: 'cafe-1' });
      expect(res.status).toBe(400);
    });

    it('returns 404 when cafe does not exist', async () => {
      const { prisma } = require('../src/db');
      (prisma.cafe.findUnique as jest.Mock).mockResolvedValue(null);
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ cafe_id: 'nonexistent', items: [{ menu_item_id: 'item-1', quantity: 1 }] });
      expect(res.status).toBe(404);
    });

    it('creates an order with WALLET payment successfully', async () => {
      const { prisma } = require('../src/db');
      // For menu item lookup inside $transaction
      (prisma.menuItem.findFirst as jest.Mock).mockResolvedValue({
        id: 'item-1', name: 'Coffee', price: 100, stock_quantity: 10,
        is_available: true, cafe_id: 'cafe-1',
      });
      // For wallet balance check inside $transaction
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: MOCK_USER_ID, wallet_balance: 1000,
      });
      // For cafe lookup (outside transaction)
      (prisma.cafe.findUnique as jest.Mock).mockResolvedValue({
        id: 'cafe-1', name: 'Test Cafe', delivery_fee: 20, prep_time_minutes: 15,
      });
      // For order.findUnique after creation
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: 'new-order', user_id: MOCK_USER_ID, cafe_id: 'cafe-1',
        status: 'CONFIRMED', total: 125, items: JSON.stringify([]),
      });

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cafe_id: 'cafe-1',
          items: [{ menu_item_id: 'item-1', quantity: 1 }],
          payment_method: 'WALLET',
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('rejects order when wallet balance is insufficient', async () => {
      const { prisma } = require('../src/db');
      (prisma.cafe.findUnique as jest.Mock).mockResolvedValue({
        id: 'cafe-1', name: 'Test Cafe', delivery_fee: 20, prep_time_minutes: 15,
      });
      (prisma.menuItem.findFirst as jest.Mock).mockResolvedValue({
        id: 'item-1', name: 'Expensive', price: 2000, stock_quantity: 10,
        is_available: true, cafe_id: 'cafe-1',
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: MOCK_USER_ID, wallet_balance: 10,
      });

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cafe_id: 'cafe-1',
          items: [{ menu_item_id: 'item-1', quantity: 1 }],
          payment_method: 'WALLET',
        });
      expect(res.status).toBe(409);
    });
  });

  describe('PATCH /api/v1/orders/:id/cancel', () => {
    it('returns 404 when order does not exist', async () => {
      const { prisma } = require('../src/db');
      (prisma.order.findFirst as jest.Mock).mockResolvedValue(null);
      const res = await request(app)
        .patch('/api/v1/orders/nonexistent/cancel')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });

    it('cancels a WALLET order and refunds balance', async () => {
      const { prisma } = require('../src/db');
      (prisma.order.findFirst as jest.Mock).mockResolvedValue({
        id: 'order-to-cancel', user_id: MOCK_USER_ID,
        cafe_id: 'cafe-1', status: 'CONFIRMED', total: 125,
        payment_method: 'WALLET',
        items: JSON.stringify([{ menu_item_id: 'item-1', quantity: 1 }]),
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: MOCK_USER_ID, wallet_balance: 1000,
      });

      const res = await request(app)
        .patch('/api/v1/orders/order-to-cancel/cancel')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CANCELLED');
    });

    it('returns 400 for already cancelled order', async () => {
      const { prisma } = require('../src/db');
      (prisma.order.findFirst as jest.Mock).mockResolvedValue({
        id: 'cancelled-order', user_id: MOCK_USER_ID,
        status: 'CANCELLED', payment_method: 'WALLET',
      });
      const res = await request(app)
        .patch('/api/v1/orders/cancelled-order/cancel')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/orders', () => {
    it('lists orders for the authenticated user', async () => {
      const { prisma } = require('../src/db');
      (prisma.order.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'order-1', user_id: MOCK_USER_ID, cafe_id: 'cafe-1',
          status: 'CONFIRMED', total: 125,
          items: JSON.stringify([{ name: 'Coffee', price: 100, quantity: 1 }]),
          cafe: { name: 'Test Cafe', image_url: null },
        },
      ]);
      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });
});
