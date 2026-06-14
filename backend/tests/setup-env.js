/** Runs before any test file (Jest setupFiles). */
const { execSync } = require('child_process');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET_CURRENT = 'jest-access-secret-min-32-chars-long!!';
process.env.JWT_REFRESH_SECRET_CURRENT = 'jest-refresh-secret-min-32-chars-long!!';

/** Razorpay test keys for payment-related tests. */
process.env.RAZORPAY_KEY_ID = 'rzp_test_jest';
process.env.RAZORPAY_KEY_SECRET = 'jest-razorpay-secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'test-webhook-secret';

/** SQLite URL for integration tests (override in CI). */
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./test.db';
}

// Run prisma db push to ensure test database schema is up-to-date
try {
  const prismaBin = path.resolve(__dirname, '../node_modules/.bin/prisma');
  execSync(`"${prismaBin}" db push --accept-data-loss --skip-generate`, {
    env: process.env,
    stdio: 'pipe'
  });
} catch (error) {
  console.error('Failed to sync Prisma test database schema:', error.message);
  if (error.stdout) console.error('stdout:', error.stdout.toString());
  if (error.stderr) console.error('stderr:', error.stderr.toString());
}

