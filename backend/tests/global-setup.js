const { execSync } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

module.exports = async function (globalConfig, projectConfig) {
  process.env.NODE_ENV = 'test';

  // Load environment variables from .env
  dotenv.config({ path: path.resolve(__dirname, '../.env') });

  if (process.env.DATABASE_URL) {
    if (process.env.DATABASE_URL.includes('/seatsip?')) {
      process.env.DATABASE_URL = process.env.DATABASE_URL.replace('/seatsip?', '/seatsip_test?');
    } else if (process.env.DATABASE_URL.endsWith('/seatsip')) {
      process.env.DATABASE_URL = process.env.DATABASE_URL + '_test';
    }
  } else {
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/seatsip_test?schema=public';
  }

  console.log('\nSyncing Prisma test database schema...');
  try {
    const prismaBin = path.resolve(__dirname, '../node_modules/.bin/prisma');
    execSync(`"${prismaBin}" db push --accept-data-loss --skip-generate`, {
      env: process.env,
      stdio: 'inherit'
    });
    console.log('Prisma test database schema synced successfully!\n');
  } catch (error) {
    console.error('Failed to sync Prisma test database schema:', error.message);
    if (error.stdout) console.error('stdout:', error.stdout.toString());
    if (error.stderr) console.error('stderr:', error.stderr.toString());
    throw error;
  }
};
