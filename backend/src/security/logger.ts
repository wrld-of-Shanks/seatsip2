import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.cvv',
      'req.body.cardNumber',
      'req.body.number',
      'req.body.accessToken',
      'req.body.refreshToken',
    ],
    censor: '[REDACTED]',
  },
});

export function redactSensitive(input: unknown): unknown {
  if (typeof input === 'string') {
    return input
      .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [REDACTED]')
      .replace(/"accessToken"\s*:\s*"[^"]+"/gi, '"accessToken":"[REDACTED]"')
      .replace(/"refreshToken"\s*:\s*"[^"]+"/gi, '"refreshToken":"[REDACTED]"')
      .replace(/"password"\s*:\s*"[^"]+"/gi, '"password":"[REDACTED]"')
      .replace(/"cvv"\s*:\s*"[^"]+"/gi, '"cvv":"[REDACTED]"')
      .replace(/"cardNumber"\s*:\s*"[^"]+"/gi, '"cardNumber":"[REDACTED]"')
      .replace(/"number"\s*:\s*"\d{12,19}"/gi, '"number":"[REDACTED]"');
  }

  if (Array.isArray(input)) return input.map(redactSensitive);

  if (input && typeof input === 'object') {
    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => [
        key,
        /token|password|cvv|card|authorization/i.test(key) ? '[REDACTED]' : redactSensitive(value),
      ])
    );
  }

  return input;
}

function toPinoMerge(value: unknown): unknown {
  if (value instanceof Error) return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return { detail: value };
    }
  }
  return value;
}

export { logger as pinoLogger };

export const secureLogger = {
  info: (message: string, ...args: unknown[]) => {
    const data = args.length > 0 ? redactSensitive(args[0]) : undefined;
    data ? logger.info(toPinoMerge(data), message) : logger.info(message);
  },
  warn: (message: string, ...args: unknown[]) => {
    const data = args.length > 0 ? redactSensitive(args[0]) : undefined;
    data ? logger.warn(toPinoMerge(data), message) : logger.warn(message);
  },
  error: (message: string, ...args: unknown[]) => {
    const data = args.length > 0 ? redactSensitive(args[0]) : undefined;
    data ? logger.error(toPinoMerge(data), message) : logger.error(message);
  },
};
