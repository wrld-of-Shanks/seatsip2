import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../common/auth';

const redisUrl = process.env.REDIS_URL;

export const redisClient = redisUrl ? createClient({ url: redisUrl }) : null;
if (redisClient) {
  redisClient.on('error', (error) => console.error('redis rate-limit error', error));
  void redisClient.connect();
}

function store(prefix: string) {
  if (!redisClient) {
    if (process.env.NODE_ENV === 'production') throw new Error('REDIS_URL is required for production rate limiting');
    return undefined;
  }
  return new RedisStore({
    prefix,
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  });
}

/**
 * Global middleware to extract user from JWT if present.
 * This runs before rate limiters to allow dynamic auth/unauth limit splitting.
 */
export function extractJwtUser(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    try {
      const token = auth.split(' ')[1];
      const payload = verifyToken(token);
      (req as any).user = payload;
    } catch {
      // Ignored: invalid token will be blocked by auth middleware later
    }
  }
  next();
}

const resolveKey = (req: Request) => 
  (req as any).user?.userId ? `user:${(req as any).user.userId}` : `ip:${req.ip}`;

export const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: store('rl:auth:login:'),
  message: { success: false, message: 'Too many login attempts. Try again later.' },
  skip: () => process.env.NODE_ENV === 'test',
});

export const authRegisterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: store('rl:auth:register:'),
  message: { success: false, message: 'Too many registration attempts. Try again later.' },
  skip: () => process.env.NODE_ENV === 'test',
});

export const authRefreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: store('rl:auth:refresh:'),
  message: { success: false, message: 'Too many refresh attempts. Try again later.' },
  skip: () => process.env.NODE_ENV === 'test',
});

export const apiGeneralLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: (req) => ((req as any).user ? 120 : 60),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: resolveKey,
  store: store('rl:api:general:'),
  message: { success: false, message: 'Too many requests. Please slow down.' },
  skip: () => process.env.NODE_ENV === 'test',
});

export const apiStrictLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: (req) => ((req as any).user ? 40 : 20),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: resolveKey,
  store: store('rl:api:strict:'),
  message: { success: false, message: 'Too many requests. Please slow down.' },
  skip: () => process.env.NODE_ENV === 'test',
});

export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 5, // 5 requests
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: store('rl:auth:otp:'),
  message: { success: false, message: 'Too many OTP requests. Please try again after 10 minutes.' },
  skip: () => process.env.NODE_ENV === 'test',
});

export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: (req) => ((req as any).user ? 10 : 3), // Authenticated users get 10 attempts, guests get 3.
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: resolveKey,
  store: store('rl:payment:'),
  message: { success: false, message: 'Too many payment requests. Please try again after 15 minutes.' },
  skip: () => process.env.NODE_ENV === 'test',
});

