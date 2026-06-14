import 'express-async-errors';
import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import authRouter from './api/auth';
import cafesRouter from './api/cafes';
import ordersRouter from './api/orders';
import reservationsRouter from './api/reservations';
import { cartRouter, usersRouter, notificationsRouter } from './api/misc';
import paymentsRouter from './api/payments';
import adminRouter from './api/admin';
import rewardsRouter from './api/rewards';
import menuRouter from './api/menu';
import bannersRouter from './api/banners';
import exploreCategoriesRouter from './api/exploreCategories';
import pointsRouter from './api/points';
import subscriptionsRouter from './api/subscriptions';
import offersRouter from './api/offers';
import { corsMiddleware, helmetMiddleware, requestId, safeMorgan, sanitizeInput } from './security/http';
import { secureLogger } from './security/logger';
import { redactObjectForLog } from './security/redaction';

export function createApp(): express.Application {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestId);
  app.use(cookieParser());
  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(compression());
  app.use(safeMorgan);
  app.use('/api/v1/payments', paymentsRouter);
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(sanitizeInput);

  app.get('/health', (_, res) =>
    res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'SeatSip API v1' })
  );

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1/cafes', cafesRouter);
  app.use('/api/v1/menu', menuRouter);
  app.use('/api/v1/orders', ordersRouter);
  app.use('/api/v1/reservations', reservationsRouter);
  app.use('/api/v1/cart', cartRouter);
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1/notifications', notificationsRouter);
  app.use('/api/v1/rewards', rewardsRouter);
  app.use('/api/v1/banners', bannersRouter);
  app.use('/api/v1/explore-categories', exploreCategoriesRouter);
  app.use('/api/v1/points', pointsRouter);
  app.use('/api/v1/subscriptions', subscriptionsRouter);
  app.use('/api/v1/offers', offersRouter);

  app.use('*', (_, res) => res.status(404).json({ success: false, message: 'Endpoint not found' }));

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const requestId = (req as Request & { requestId?: string }).requestId || crypto.randomUUID();
    const isProd = process.env.NODE_ENV === 'production';

    const logPayload = redactObjectForLog({
      requestId,
      error: {
        name: err?.name,
        message: err?.message,
        ...(isProd ? {} : { stack: err?.stack }),
      },
      request: {
        method: req.method,
        path: req.path,
        query: req.query,
        userId: (req as Request & { user?: { userId?: string } }).user?.userId,
      },
    });
    secureLogger.error('Unhandled error', JSON.stringify(logPayload));

    const status = Number(err?.status ?? err?.statusCode ?? 500);
    const isZod = err?.name === 'ZodError';
    const clientStatus = isZod ? 400 : status >= 400 && status < 600 ? status : 500;
    const message = isZod
      ? 'Invalid request data'
      : clientStatus === 404
        ? 'Not found'
        : 'Internal server error';

    res.status(clientStatus).json({
      success: false,
      message,
      ...(isZod ? { code: 'VALIDATION_ERROR' } : {}),
      requestId,
    });
  });

  return app;
}
