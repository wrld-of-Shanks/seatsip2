import 'express-async-errors';
import * as Sentry from '@sentry/node';
import { expressErrorHandler } from '@sentry/node';

const SENTRY_DSN = process.env.SENTRY_DSN || '';
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
  });
}

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
import { corsMiddleware, helmetMiddleware, requestId, sanitizeInput } from './security/http';
import { secureLogger, pinoLogger } from './security/logger';
import { redactObjectForLog } from './security/redaction';
import { apiGeneralLimiter, apiStrictLimiter, extractJwtUser, paymentLimiter } from './security/rateLimit';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './api/swagger';

export function createApp(): express.Application {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(requestId);
  app.use(cookieParser());
  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(compression());
  app.use(pinoHttp({
    logger: pinoLogger,
    genReqId: (req) => (req as any).requestId || crypto.randomUUID(),
  }));
  app.use(extractJwtUser);
  app.use('/api/v1/payments', paymentLimiter, paymentsRouter);
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(sanitizeInput);
  app.use('/api/v1', apiGeneralLimiter);

  app.get('/health', (_, res) =>
    res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'SeatSip API v1' })
  );

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api/docs.json', (_, res) => res.json(swaggerSpec));

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/admin/stats', apiStrictLimiter);
  app.use('/api/v1/admin/revenue', apiStrictLimiter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1/cafes', apiStrictLimiter, cafesRouter);
  app.use('/api/v1/menu', apiStrictLimiter, menuRouter);
  app.use('/api/v1/orders', apiStrictLimiter, ordersRouter);
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

  if (SENTRY_DSN) {
    app.use(expressErrorHandler() as any);
  }

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
