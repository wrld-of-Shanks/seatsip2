import crypto from 'crypto';
import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import zxcvbn from 'zxcvbn';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { env } from '../security/env';
import { AuthenticatedRequest, AuthUser, UserRole } from '../types/authenticated-request';

const isProd = process.env.NODE_ENV === 'production';
const DEV_ACCESS_FALLBACK = 'dev-access-secret-change-me-32chars!!';

export type DbClient = Prisma.TransactionClient | typeof prisma;

function readAccessSecret(): string {
  const v = (env('JWT_ACCESS_SECRET_CURRENT') || env('JWT_SECRET') || '').trim();
  if (v.length >= 32) return v;
  if (isProd) {
    console.error('FATAL: JWT_ACCESS_SECRET_CURRENT or JWT_SECRET is required in production (min 32 characters).');
    process.exit(1);
  }
  return v || DEV_ACCESS_FALLBACK;
}

function readRefreshSecret(accessForDevDefault: string): string {
  const v = (env('JWT_REFRESH_SECRET_CURRENT') || env('JWT_REFRESH_SECRET') || '').trim();
  if (v.length >= 32) return v;
  if (isProd) {
    console.error('FATAL: JWT_REFRESH_SECRET_CURRENT is required in production (min 32 characters).');
    process.exit(1);
  }
  return `${accessForDevDefault}-refresh-32chars-min`;
}

const ACCESS_SECRET_CURRENT = readAccessSecret();
const ACCESS_SECRET_PREVIOUS = env('JWT_ACCESS_SECRET_PREVIOUS');
const REFRESH_SECRET_CURRENT = (() => {
  const r = readRefreshSecret(ACCESS_SECRET_CURRENT);
  if (isProd && r === ACCESS_SECRET_CURRENT) {
    console.error('FATAL: JWT refresh secret must differ from access secret in production.');
    process.exit(1);
  }
  return r;
})();
const REFRESH_SECRET_PREVIOUS = env('JWT_REFRESH_SECRET_PREVIOUS');
const ACCESS_TTL_SECONDS = Number(process.env.JWT_ACCESS_TTL_SECONDS || 15 * 60);
const REFRESH_TTL_SECONDS = Number(process.env.JWT_REFRESH_TTL_SECONDS || 30 * 24 * 60 * 60);

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  jti?: string;
}

function tokenHash(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function secrets(current: string, previous?: string): string[] {
  return previous ? [current, previous] : [current];
}

export function hashRefreshToken(token: string): string {
  return tokenHash(token);
}

export function validatePasswordStrength(password: string, userInputs: string[] = []): string | null {
  const result = zxcvbn(password, userInputs);
  if (result.score >= 3) return null;
  return result.feedback.warning || 'Password is too weak. Use a longer, less common password.';
}

export function generateTokens(payload: JwtPayload, familyId = uuidv4()) {
  const accessJti = uuidv4();
  const refreshJti = uuidv4();
  const accessToken = jwt.sign(
    { userId: payload.userId, email: payload.email, role: payload.role, jti: accessJti },
    ACCESS_SECRET_CURRENT,
    { expiresIn: ACCESS_TTL_SECONDS }
  );
  const refreshToken = jwt.sign(
    { userId: payload.userId, familyId, jti: refreshJti },
    REFRESH_SECRET_CURRENT,
    { expiresIn: REFRESH_TTL_SECONDS }
  );

  return {
    accessToken,
    refreshToken,
    accessJti,
    refreshHash: tokenHash(refreshToken),
    familyId,
  };
}

export function verifyToken(token: string): AuthUser {
  let lastError: unknown;
  for (const secret of secrets(ACCESS_SECRET_CURRENT, ACCESS_SECRET_PREVIOUS)) {
    try {
      const payload = jwt.verify(token, secret) as AuthUser;
      if (!payload.jti) payload.jti = tokenHash(token);
      return payload;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Invalid token');
}

export function verifyRefreshToken(token: string): { userId: string; familyId?: string; jti?: string } {
  let lastError: unknown;
  for (const secret of secrets(REFRESH_SECRET_CURRENT, REFRESH_SECRET_PREVIOUS)) {
    try {
      return jwt.verify(token, secret) as { userId: string; familyId?: string; jti?: string };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Invalid refresh token');
}

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  try {
    const token = auth.split(' ')[1];
    const payload = verifyToken(token);
    const revoked = await prisma.revokedToken.findFirst({
      where: { jti: payload.jti!, expires_at: { gt: new Date() } },
    });
    if (revoked) return res.status(401).json({ success: false, message: 'Token revoked' });
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    next();
  };
}

export async function storeRefreshToken(
  db: DbClient,
  userId: string,
  refreshToken: string,
  familyId: string
): Promise<void> {
  await db.refreshToken.create({
    data: {
      id: uuidv4(),
      token: refreshToken,
      token_hash: hashRefreshToken(refreshToken),
      family_id: familyId,
      expires_at: new Date(Date.now() + REFRESH_TTL_SECONDS * 1000),
      user: { connect: { id: userId } },
    },
  });
}

export async function revokeAccessToken(db: DbClient, userId: string, jti: string, reason: string): Promise<void> {
  const expiresAt = new Date(Date.now() + ACCESS_TTL_SECONDS * 1000);
  try {
    await db.revokedToken.create({
      data: { jti, user_id: userId, expires_at: expiresAt, reason },
    });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code !== 'P2002') throw e;
  }
}

export async function revokeAllUserTokens(userId: string, reason: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { user_id: userId, revoked_at: null },
    data: { revoked_at: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      id: uuidv4(),
      request_id: uuidv4(),
      user_id: userId,
      action: 'TOKEN_COMPROMISE',
      resource_type: 'auth',
      metadata: JSON.stringify({ reason }),
    },
  });
}

export async function recordFailedLogin(email: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, failed_login_count: true },
  });
  if (!user) return 0;
  const count = Number(user.failed_login_count || 0) + 1;
  const lockSeconds = count >= 5 ? Math.min(3600, 2 ** (count - 5) * 60) : 0;
  const lockoutUntil = lockSeconds > 0 ? new Date(Date.now() + lockSeconds * 1000) : undefined;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failed_login_count: count,
      last_failed_login_at: new Date(),
      ...(lockoutUntil ? { lockout_until: lockoutUntil } : {}),
    },
  });
  return lockSeconds;
}

export async function clearFailedLogin(userId: string, ip?: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failed_login_count: 0,
      lockout_until: null,
      last_failed_login_at: null,
    },
  });
}
