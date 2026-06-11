/** Runs before any test file (Jest setupFiles). */
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET_CURRENT = 'jest-access-secret-min-32-chars-long!!';
process.env.JWT_REFRESH_SECRET_CURRENT = 'jest-refresh-secret-min-32-chars-long!!';

/** SQLite URL for integration tests (override in CI). */
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./test.db';
}
