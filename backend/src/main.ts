import { initDb, prisma } from './db';
import { createApp } from './app';
import { validateProductionSecrets } from './security/productionSecrets';
import { validateCorsConfig } from './security/http';
import { purgeAccountsPastDeletionDeadline } from './services/accountLifecycle';
import { secureLogger } from './security/logger';

const PORT = process.env.PORT || 3000;
const PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000;

validateProductionSecrets();
validateCorsConfig();

const app = createApp();

async function boot() {
  await initDb();
  try {
    await purgeAccountsPastDeletionDeadline();
  } catch (e) {
    secureLogger.error('Account purge on boot failed', e);
  }
  setInterval(() => {
    void purgeAccountsPastDeletionDeadline().catch((err) => {
      secureLogger.error('Scheduled account purge failed', err);
    });
  }, PURGE_INTERVAL_MS);

  // Subscription expiry check every 6 hours
  const SUBSCRIPTION_EXPIRY_INTERVAL_MS = 6 * 60 * 60 * 1000;
  async function expireStaleSubscriptions() {
    try {
      const now = new Date();
      const result = await prisma.user.updateMany({
        where: { is_subscribed: true, subscription_expires_at: { lt: now } },
        data: { is_subscribed: false },
      });
      if (result.count > 0) {
        secureLogger.info('Expired stale subscriptions', { count: result.count });
      }
    } catch (err) {
      secureLogger.error('Subscription expiry cron failed', err);
    }
  }
  void expireStaleSubscriptions();
  setInterval(expireStaleSubscriptions, SUBSCRIPTION_EXPIRY_INTERVAL_MS);

  const server = app.listen(PORT, () => {
    if (process.env.NODE_ENV === 'production') {
      secureLogger.info('SeatSip API worker started', { port: PORT, pid: process.pid });
      return;
    }
    console.log(`
🚀 SeatSip API worker (pid ${process.pid}) running on http://localhost:${PORT}
📦 Database: PostgreSQL (Prisma)
  `);
  });

  const shutdown = async (signal: string) => {
    secureLogger.info(`Worker ${process.pid} shutting down (${signal})`, { pid: process.pid });
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    setTimeout(() => {
      secureLogger.error('Forced shutdown after timeout', { pid: process.pid });
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('message', (msg) => {
    if (msg === 'shutdown') void shutdown('PM2_SHUTDOWN');
  });
}

boot().catch((err) => {
  secureLogger.error('Server failed to start', err);
  void prisma.$disconnect().finally(() => process.exit(1));
});

export default app;
