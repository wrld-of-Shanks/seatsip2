/** Runs before any test file (Jest setupFiles). */
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET_CURRENT = 'jest-access-secret-min-32-chars-long!!';
process.env.JWT_REFRESH_SECRET_CURRENT = 'jest-refresh-secret-min-32-chars-long!!';

/** Razorpay test keys for payment-related tests. */
process.env.RAZORPAY_KEY_ID = 'rzp_test_jest';
process.env.RAZORPAY_KEY_SECRET = 'jest-razorpay-secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'test-webhook-secret';

// Load environment variables from .env
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/** PostgreSQL URL for integration tests (override in CI, dynamically sets dedicated test DB). */
if (process.env.DATABASE_URL) {
  if (process.env.DATABASE_URL.includes('/seatsip?')) {
    process.env.DATABASE_URL = process.env.DATABASE_URL.replace('/seatsip?', '/seatsip_test?');
  } else if (process.env.DATABASE_URL.endsWith('/seatsip')) {
    process.env.DATABASE_URL = process.env.DATABASE_URL + '_test';
  }
} else {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/seatsip_test?schema=public';
}

