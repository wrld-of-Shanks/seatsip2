import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../src/app';

const TEST_USER = {
  id: 'reserve-test-user-id',
  name: 'Reservation Test',
  email: 'reserve-test@example.com',
};

const TEST_CAFE = {
  id: 'reserve-test-cafe-id',
  name: 'Test Cafe',
  slug: 'test-cafe-reserve',
  address: '123 Test St',
  city: 'Test City',
  prep_time_minutes: 10,
  delivery_fee: 0,
};

const TEST_TABLE = {
  id: 'reserve-test-table-id',
  cafe_id: TEST_CAFE.id,
  table_number: 'T1',
  capacity: 4,
  floor: 'Ground',
};

function buildToken(): string {
  return jwt.sign(
    { userId: TEST_USER.id, email: TEST_USER.email, role: 'USER', jti: 'reserve-test-jti' },
    process.env.JWT_ACCESS_SECRET_CURRENT || 'jest-access-secret-min-32-chars-long!!',
    { expiresIn: 60 },
  );
}

const mockTx: any = {
  reservation: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
  },
  user: { findUnique: jest.fn() },
  notification: { create: jest.fn() },
};

jest.mock('../src/db', () => {
  const tx: any = {};
  tx.reservation = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
  };
  tx.user = { findUnique: jest.fn() };
  tx.notification = { create: jest.fn() };

  return {
    prisma: {
      revokedToken: { findFirst: jest.fn().mockResolvedValue(null) },
      devicePushToken: { findMany: jest.fn().mockResolvedValue([]) },
      cafe: { findUnique: jest.fn() },
      table: { findFirst: jest.fn() },
      reservation: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
      menuItem: { findUnique: jest.fn() },
      notification: { create: jest.fn() },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      user: { findUnique: jest.fn() },
      $transaction: jest.fn(async (fn: any) => {
        if (typeof fn === 'function') return fn(tx);
        return fn;
      }),
      $disconnect: jest.fn(),
    },
    initDb: jest.fn().mockResolvedValue(undefined),
  };
});

const app = createApp();
const token = buildToken();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Reservations API', () => {
  it('POST /api/v1/reservations creates a reservation', async () => {
    const { prisma } = require('../src/db');
    (prisma.cafe.findUnique as jest.Mock).mockResolvedValue(TEST_CAFE);
    (prisma.table.findFirst as jest.Mock).mockResolvedValue(TEST_TABLE);
    (prisma.reservation.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.reservation.findFirst as jest.Mock).mockResolvedValue({
      id: 'new-res-1',
      user_id: TEST_USER.id,
      cafe_id: TEST_CAFE.id,
      table_id: TEST_TABLE.id,
      date: '2026-07-01',
      time: '10:00',
      duration_minutes: 90,
      party_size: 2,
      status: 'CONFIRMED',
      special_requests: null,
      pre_order_items: '[]',
      pre_order_total: 0,
      confirmation_code: 'SSTEST01',
      cafe: { name: TEST_CAFE.name, address: TEST_CAFE.address },
      table: null,
    });

    const res = await request(app)
      .post('/api/v1/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        cafe_id: TEST_CAFE.id,
        date: '2026-07-01',
        time: '10:00',
        party_size: 2,
        table_id: TEST_TABLE.id,
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.confirmation_code).toMatch(/^SS/);
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).post('/api/v1/reservations').send({
      cafe_id: TEST_CAFE.id,
      date: '2026-07-01',
      time: '12:00',
      party_size: 2,
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 for nonexistent cafe', async () => {
    const { prisma } = require('../src/db');
    (prisma.cafe.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        cafe_id: 'nonexistent-cafe',
        date: '2026-07-01',
        time: '12:00',
        party_size: 2,
      });
    expect(res.status).toBe(404);
  });

  it('detects overlapping reservation conflict', async () => {
    const { prisma } = require('../src/db');
    (prisma.cafe.findUnique as jest.Mock).mockResolvedValue(TEST_CAFE);
    (prisma.table.findFirst as jest.Mock).mockResolvedValue(TEST_TABLE);
    (prisma.reservation.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'existing-res',
        user_id: 'other-user',
        cafe_id: TEST_CAFE.id,
        table_id: TEST_TABLE.id,
        date: '2026-07-02',
        time: '10:00',
        duration_minutes: 120,
        party_size: 2,
        status: 'CONFIRMED',
      },
    ]);

    const res = await request(app)
      .post('/api/v1/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        cafe_id: TEST_CAFE.id,
        date: '2026-07-02',
        time: '11:00',
        party_size: 2,
        table_id: TEST_TABLE.id,
        duration_minutes: 60,
      });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('PATCH /api/v1/reservations/:id/cancel cancels an active reservation', async () => {
    const { prisma } = require('../src/db');
    (prisma.reservation.findFirst as jest.Mock).mockResolvedValue({
      id: 'active-res',
      user_id: TEST_USER.id,
      status: 'CONFIRMED',
    });

    const res = await request(app)
      .patch('/api/v1/reservations/active-res/cancel')
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Change of plans' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 400 when cancelling an already cancelled reservation', async () => {
    const { prisma } = require('../src/db');
    (prisma.reservation.findFirst as jest.Mock).mockResolvedValue({
      id: 'cancelled-res',
      user_id: TEST_USER.id,
      status: 'CANCELLED',
    });

    const res = await request(app)
      .patch('/api/v1/reservations/cancelled-res/cancel')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('GET /api/v1/reservations lists user reservations', async () => {
    const { prisma } = require('../src/db');
    (prisma.reservation.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'res-1',
        user_id: TEST_USER.id,
        cafe_id: TEST_CAFE.id,
        date: '2026-07-05',
        time: '18:00',
        duration_minutes: 90,
        party_size: 2,
        status: 'CONFIRMED',
        pre_order_items: '[]',
        pre_order_total: 0,
        confirmation_code: 'SSABC01',
        cafe: { name: TEST_CAFE.name, image_url: null, address: TEST_CAFE.address },
        table: null,
      },
    ]);

    const res = await request(app)
      .get('/api/v1/reservations')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].cafe_name).toBe(TEST_CAFE.name);
  });
});
