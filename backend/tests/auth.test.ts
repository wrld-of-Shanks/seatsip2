import request from 'supertest';
import { initDb, prisma } from '../src/db';
import { createApp } from '../src/app';

const app = createApp();

beforeAll(async () => {
  await initDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Auth API', () => {
  const email = `jest-${Date.now()}@example.com`;
  const password = 'CorrectHorseBatteryStaple99!';
  const name = 'Jest User';

  it('POST /api/v1/auth/register creates a user', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ name, email, password });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.token).toBe(res.body.data.accessToken);
    expect(res.body.user._id).toBe(res.body.data.user.id);
  });

  it('POST /api/v1/auth/login returns tokens', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  it('GET /api/v1/auth/me returns profile with Bearer token', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email, password });
    const token = login.body.data.accessToken;
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(email);
  });

  it('GET /api/v1/auth/check-email returns available: true for unregistered email', async () => {
    const unregisteredEmail = `check-${Date.now()}@example.com`;
    const res = await request(app).get(`/api/v1/auth/check-email?email=${encodeURIComponent(unregisteredEmail)}`);
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(true);
  });

  it('GET /api/v1/auth/check-email returns available: false for registered email', async () => {
    const res = await request(app).get(`/api/v1/auth/check-email?email=${encodeURIComponent(email)}`);
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
  });

  it('GET /api/v1/auth/check-email returns 400 for invalid email structure', async () => {
    const res = await request(app).get('/api/v1/auth/check-email?email=invalid-email');
    expect(res.status).toBe(400);
  });

  it('POST /api/v1/auth/cafe-owner/register handles weak password, validation errors, and success', async () => {
    const emailCheck = `owner-${Date.now()}@example.com`;
    
    // 1. Short password (fails Zod schema validation)
    const resShort = await request(app)
      .post('/api/v1/auth/cafe-owner/register')
      .send({
        ownerName: 'Test Owner',
        email: emailCheck,
        phone: '1234567890',
        password: 'weak',
        cafeName: 'Test Cafe',
        cafeAddress: 'Test Cafe Address',
        description: 'Test Cafe Description',
        openingHours: '09:00 - 22:00',
        cafePhotos: ['photo.jpg'],
        governmentId: 'govt-id-123',
        businessLicense: 'license-123',
        termsAccepted: true,
        informationAccurate: true,
        approvalRequired: true,
      });
    expect(resShort.status).toBe(400);

    // 1.2. Weak password of length >= 8 (passes Zod, but fails zxcvbn check)
    const resWeak = await request(app)
      .post('/api/v1/auth/cafe-owner/register')
      .send({
        ownerName: 'Test Owner',
        email: emailCheck,
        phone: '1234567890',
        password: 'password',
        cafeName: 'Test Cafe',
        cafeAddress: 'Test Cafe Address',
        description: 'Test Cafe Description',
        openingHours: '09:00 - 22:00',
        cafePhotos: ['photo.jpg'],
        governmentId: 'govt-id-123',
        businessLicense: 'license-123',
        termsAccepted: true,
        informationAccurate: true,
        approvalRequired: true,
      });
    expect(resWeak.status).toBe(400);
    expect(resWeak.body.success).toBe(false);
    expect(resWeak.body.message).toMatch(/(weak|password)/i);
    
    // 2. Strong password and correct payload
    const resSuccess = await request(app)
      .post('/api/v1/auth/cafe-owner/register')
      .send({
        ownerName: 'Test Owner',
        email: emailCheck,
        phone: '1234567890',
        password: 'CorrectHorseBatteryStaple99!',
        cafeName: 'Test Cafe',
        cafeAddress: 'Test Cafe Address',
        description: 'Test Cafe Description',
        openingHours: '09:00 - 22:00',
        cafePhotos: ['photo.jpg'],
        governmentId: 'govt-id-123',
        businessLicense: 'license-123',
        termsAccepted: true,
        informationAccurate: true,
        approvalRequired: true,
        latitude: 12.3456,
        longitude: 78.9012,
      });
    expect(resSuccess.status).toBe(201);
    expect(resSuccess.body.success).toBe(true);
    expect(resSuccess.body.status).toBe('PENDING_APPROVAL');

    // Query DB to verify coordinates were stored
    const cafe = await prisma.cafe.findFirst({
      where: { email: emailCheck },
    });
    expect(cafe).toBeDefined();
    expect(cafe?.latitude).toBe(12.3456);
    expect(cafe?.longitude).toBe(78.9012);
  });
});

