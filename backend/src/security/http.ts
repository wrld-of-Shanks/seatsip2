import crypto from 'crypto';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import sanitizeHtml from 'sanitize-html';
import { NextFunction, Request, Response } from 'express';
import { z, ZodSchema } from 'zod';
import { prisma } from '../db';
import { redactSensitive, secureLogger } from './logger';

export function parseAllowedOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .filter((origin) => origin !== '*');
}

const allowedOrigins = parseAllowedOrigins();

/** Fail fast in production when CORS allowlist is missing or invalid. */
export function validateCorsConfig(): void {
  if (process.env.NODE_ENV !== 'production') return;
  const origins = parseAllowedOrigins();
  if (origins.length === 0) {
    console.error('FATAL: ALLOWED_ORIGINS (or CORS_ORIGIN) must list at least one origin in production (comma-separated).');
    process.exit(1);
  }
  for (const o of origins) {
    try {
      new URL(o);
    } catch {
      console.error(`FATAL: Invalid origin in ALLOWED_ORIGINS: ${o}`);
      process.exit(1);
    }
  }
}

export const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    if (process.env.NODE_ENV !== 'production') {
      if (/^https?:\/\/localhost(:\d+)?$/i.test(origin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/i.test(origin)) {
        return callback(null, origin);
      }
      secureLogger.warn('CORS: non-localhost origin allowed in development', redactSensitive(origin));
      return callback(null, origin);
    }

    if (allowedOrigins.length === 0) {
      secureLogger.error('CORS: ALLOWED_ORIGINS empty in production');
      return callback(new Error('CORS not configured'));
    }

    return allowedOrigins.includes(origin) ? callback(null, true) : callback(new Error('CORS origin denied'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-ID', 'X-API-Version', 'Cookie', 'X-CSRF-Token'],
  exposedHeaders: ['X-Request-ID', 'X-API-Version'],
  maxAge: 86400,
});

export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.razorpay.com', ...allowedOrigins],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'no-referrer' },
  crossOriginResourcePolicy: { policy: 'same-site' },
});

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('X-Request-ID');
  const requestId = incoming && /^[a-zA-Z0-9._:-]{8,128}$/.test(incoming) ? incoming : crypto.randomUUID();
  (req as Request & { requestId: string }).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  res.setHeader('X-API-Version', '2026-05-11');
  next();
}

export const safeMorgan = morgan((tokens, req, res) => {
  return String(
    redactSensitive(
      [
        (req as Request & { requestId?: string }).requestId,
        tokens.method(req, res),
        tokens.url(req, res),
        tokens.status(req, res),
        `${tokens['response-time'](req, res)}ms`,
      ].join(' ')
    )
  );
});

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
  }
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeValue(item)]));
  }
  return value;
}

export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  req.body = sanitizeValue(req.body);
  req.query = sanitizeValue(req.query) as Request['query'];
  req.params = sanitizeValue(req.params) as Request['params'];
  next();
}

export function validate(schema: { body?: ZodSchema; params?: ZodSchema; query?: ZodSchema }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = z
      .object({
        body: schema.body || z.any(),
        params: schema.params || z.any(),
        query: schema.query || z.any(),
      })
      .safeParse({ body: req.body, params: req.params, query: req.query });

    if (!result.success) {
      const err = result.error;
      const first = err.issues[0];
      const pathTail = first?.path?.filter((p) => p !== 'body' && p !== 'query' && p !== 'params').join('.');
      const human =
        first?.message && pathTail
          ? `${pathTail}: ${first.message}`
          : first?.message || 'Invalid request';
      return res.status(400).json({ success: false, message: human, errors: err.flatten() });
    }

    req.body = result.data.body;
    req.params = result.data.params;
    req.query = result.data.query;
    next();
  };
}

export function audit(action: string, resourceType: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const started = Date.now();
    res.on('finish', () => {
      try {
        const authReq = req as Request & { user?: { userId: string }; requestId?: string };
        void prisma.auditLog
          .create({
            data: {
              id: crypto.randomUUID(),
              request_id: authReq.requestId || crypto.randomUUID(),
              user_id: authReq.user?.userId || null,
              action,
              resource_type: resourceType,
              resource_id: req.params?.id || null,
              ip_address: req.ip,
              user_agent: req.get('user-agent') || null,
              metadata: JSON.stringify({ statusCode: res.statusCode, durationMs: Date.now() - started }),
            },
          })
          .catch((error) => {
            console.error('audit log failed', error);
          });
      } catch (error) {
        console.error('audit handler failed', error);
      }
    });
    next();
  };
}

