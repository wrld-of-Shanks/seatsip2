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

  app.listen(PORT, () => {
    if (process.env.NODE_ENV === 'production') {
      secureLogger.info('SeatSip API listening', { port: PORT });
      return;
    }
    console.log(`
🚀 SeatSip API running on http://localhost:${PORT}
📦 Database: PostgreSQL (Prisma)
📋 Endpoints:
   POST   /api/v1/auth/register
   POST   /api/v1/auth/login
   POST   /api/v1/auth/google
   GET    /api/v1/cafes
   GET    /api/v1/cafes/:id/menu
   POST   /api/v1/reservations
   POST   /api/v1/orders
   GET    /api/v1/cart
   
   /* Admin & Owner Panel integrations */
   GET    /api/v1/admin/stats
   GET    /api/v1/admin/revenue
   GET    /api/v1/admin/audit-logs
   GET    /api/v1/admin/settings
   PATCH  /api/v1/admin/settings/:id
   POST   /api/v1/admin/settings/batch
   GET    /api/v1/admin/feature-flags
   PATCH  /api/v1/admin/feature-flags/:id
   GET    /api/v1/admin/roles
   GET    /api/v1/admin/permissions
   PATCH  /api/v1/admin/roles/:selectedRole/permissions
   GET    /api/v1/admin/users
   POST   /api/v1/admin/users
   PATCH  /api/v1/admin/users/:id
   DELETE /api/v1/admin/users/:id
  `);
  });
}

boot().catch((err) => {
  secureLogger.error('Server failed to start', err);
  void prisma.$disconnect().finally(() => process.exit(1));
});

export default app;
