import crypto from 'crypto';
import request from 'supertest';
import { createApp } from '../src/app';

jest.mock('../src/db', () => {
  const mockPrisma = {
    idempotencyKey: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    paymentEvent: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn(async (fn: any) => fn(mockPrisma)),
    $disconnect: jest.fn(),
  };
  return {
    prisma: mockPrisma,
    initDb: jest.fn().mockResolvedValue(undefined),
  };
});

const app = createApp();

beforeEach(() => {
  jest.clearAllMocks();
});

function computeSignature(rawBody: string): string {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test-webhook-secret';
  return crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
}

describe('Payments Webhook API', () => {
  it('POST /api/v1/payments/razorpay/webhook returns 200 with valid signature', async () => {
    const payload = {
      event: 'payment.captured',
      created_at: Date.now(),
      payload: {
        payment: {
          entity: {
            id: 'pay_test_valid',
            amount: 50000,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    };
    const rawBody = JSON.stringify(payload);
    const signature = computeSignature(rawBody);

    const res = await request(app)
      .post('/api/v1/payments/razorpay/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .send(rawBody);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 200 idempotent: true for duplicate razorpay_payment_id', async () => {
    const { prisma } = require('../src/db');
    (prisma.idempotencyKey.findUnique as jest.Mock).mockResolvedValue({
      id: 'existing-key',
      razorpay_payment_id: 'pay_test_dup',
    });

    const payload = {
      event: 'payment.captured',
      created_at: Date.now(),
      payload: {
        payment: {
          entity: { id: 'pay_test_dup', amount: 50000, status: 'captured' },
        },
      },
    };
    const rawBody = JSON.stringify(payload);
    const signature = computeSignature(rawBody);

    const res = await request(app)
      .post('/api/v1/payments/razorpay/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .send(rawBody);
    expect(res.status).toBe(200);
    expect(res.body.idempotent).toBe(true);
  });

  it('returns 400 with invalid signature', async () => {
    const payload = {
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_test_invalid' } } },
    };
    const rawBody = JSON.stringify(payload);

    const res = await request(app)
      .post('/api/v1/payments/razorpay/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', 'invalid-signature')
      .send(rawBody);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when signature header is missing', async () => {
    const payload = { event: 'payment.captured', payload: {} };
    const rawBody = JSON.stringify(payload);

    const res = await request(app)
      .post('/api/v1/payments/razorpay/webhook')
      .set('Content-Type', 'application/json')
      .send(rawBody);
    expect(res.status).toBe(400);
  });

  it('returns 200 for refund webhook event', async () => {
    const payload = {
      event: 'refund.created',
      created_at: Date.now(),
      payload: {
        refund: {
          entity: {
            id: 'rfnd_test_1',
            payment_id: 'pay_test_refund',
            amount: 25000,
            status: 'processed',
          },
        },
      },
    };
    const rawBody = JSON.stringify(payload);
    const signature = computeSignature(rawBody);

    const res = await request(app)
      .post('/api/v1/payments/razorpay/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .send(rawBody);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
