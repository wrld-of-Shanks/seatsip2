import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';

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

export const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: store('rl:auth:login:'),
  message: { success: false, message: 'Too many login attempts. Try again later.' },
});

export const authRegisterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: store('rl:auth:register:'),
  message: { success: false, message: 'Too many registration attempts. Try again later.' },
});

export const authRefreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: store('rl:auth:refresh:'),
  message: { success: false, message: 'Too many refresh attempts. Try again later.' },
});

export const apiGeneralLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: store('rl:api:general:'),
  message: { success: false, message: 'Too many requests. Please slow down.' },
});

export const apiStrictLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: store('rl:api:strict:'),
  message: { success: false, message: 'Too many requests. Please slow down.' },
});

