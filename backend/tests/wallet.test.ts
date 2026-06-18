import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../src/app';

function buildToken(): string {
  return jwt.sign(
    { userId: 'wallet-test-user-id', email: 'wallet-test@example.com', role: 'USER', jti: 'wallet-test-jti' },
    process.env.JWT_ACCESS_SECRET_CURRENT || 'jest-access-secret-min-32-chars-long!!',
    { expiresIn: 60 },
  );
}

jest.mock('../src/db', () => {
  const m = {
    revokedToken: { findFirst: jest.fn().mockResolvedValue(null) },
    user: { findUnique: jest.fn(), update: jest.fn() },
    walletTransaction: {
      create: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([
        { id: 'tx-1', type: 'TOPUP', amount: 100, description: 'test', created_at: new Date().toISOString() },
      ]),
    },
    pointsTransaction: { create: jest.fn() },
    loyaltyTierHistory: { create: jest.fn() },
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

function setupDefaultUser() {
  const { prisma } = require('../src/db');
  const defaultUser = {
    id: 'wallet-test-user-id',
    wallet_balance: 500,
    loyalty_points: 1000,
    loyalty_tier: 'silver',
    total_lifetime_points: 1000,
    points_cap: 50000,
    is_subscribed: false,
    subscription_expires_at: null,
    last_activity_at: null,
    role: 'USER',
    name: 'Wallet Test',
    email: 'wallet-test@example.com',
  };
  (prisma.user.findUnique as jest.Mock).mockResolvedValue(defaultUser);
}

beforeEach(() => {
  jest.clearAllMocks();
  setupDefaultUser();
});

describe('Wallet API', () => {
  describe('POST /api/v1/points/convert-to-wallet', () => {
    it('converts points to wallet credit', async () => {
      const res = await request(app)
        .post('/api/v1/points/convert-to-wallet')
        .set('Authorization', `Bearer ${token}`)
        .send({ points: 200 });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.walletCredit).toBe(100);
    });

    it('rejects conversion below minimum 100 points', async () => {
      const res = await request(app)
        .post('/api/v1/points/convert-to-wallet')
        .set('Authorization', `Bearer ${token}`)
        .send({ points: 50 });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects conversion with insufficient points', async () => {
      const { prisma } = require('../src/db');
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'wallet-test-user-id', wallet_balance: 0, loyalty_points: 50,
        loyalty_tier: 'silver', total_lifetime_points: 50, points_cap: 50000,
        is_subscribed: false, subscription_expires_at: null, last_activity_at: null,
      });

      const res = await request(app)
        .post('/api/v1/points/convert-to-wallet')
        .set('Authorization', `Bearer ${token}`)
        .send({ points: 99999 });
      expect(res.status).toBe(500);
    });

    it('rejects negative points value', async () => {
      const res = await request(app)
        .post('/api/v1/points/convert-to-wallet')
        .set('Authorization', `Bearer ${token}`)
        .send({ points: -10 });
      expect(res.status).toBe(400);
    });

    it('rejects zero points', async () => {
      const res = await request(app)
        .post('/api/v1/points/convert-to-wallet')
        .set('Authorization', `Bearer ${token}`)
        .send({ points: 0 });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/users/profile shows wallet balance', () => {
    it('includes wallet_balance in profile response', async () => {
      const res = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('wallet_balance');
    });
  });

  describe('GET /api/v1/users/wallet/transactions', () => {
    it('lists wallet transactions', async () => {
      const res = await request(app)
        .get('/api/v1/users/wallet/transactions')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
