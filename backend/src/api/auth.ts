import { Router, Response, Request } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { prisma } from '../db';
import {
  authenticate,
  clearFailedLogin,
  DbClient,
  generateTokens,
  hashRefreshToken,
  recordFailedLogin,
  revokeAccessToken,
  revokeAllUserTokens,
  storeRefreshToken,
  validatePasswordStrength,
  verifyRefreshToken,
} from '../common/auth';
import { AuthenticatedRequest } from '../types/authenticated-request';
import { audit, validate } from '../security/http';
import { authLoginLimiter, authRefreshLimiter, authRegisterLimiter } from '../security/rateLimit';
import { secureLogger } from '../security/logger';
import { isGoogleAuthConfigured, verifyGoogleIdToken } from '../services/googleVerify';
import {
  clearRefreshTokenCookie,
  REFRESH_COOKIE_NAME,
  setRefreshTokenCookie,
  useBrowserRefreshCookie,
} from '../common/refreshCookie';
import { generateAndSendOtp, verifyOtp } from '../services/otpService';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }).max(100),
  email: z.string().email({ message: 'Enter a valid email address' }).max(254).transform((email) => email.toLowerCase()),
  password: z
    .string()
    .min(10, { message: 'Password must be at least 10 characters' })
    .max(128, { message: 'Password is too long' }),
  phone: z.string().min(7).max(20).optional(),
});

const loginSchema = z.object({
  email: z.string().email({ message: 'Enter a valid email address' }).max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(1, { message: 'Password is required' }).max(128),
});

const refreshBodySchema = z.object({
  refreshToken: z.string().min(20).optional(),
});
const logoutSchema = z.object({ refreshToken: z.string().min(20).optional() });
const googleSignInSchema = z.object({ idToken: z.string().min(100) });

const cancelDeletionSchema = z
  .object({
    email: z.string().email().optional(),
    password: z.string().min(1).optional(),
    idToken: z.string().min(100).optional(),
  })
  .refine((b) => (b.email && b.password) || b.idToken, { message: 'Provide email and password, or idToken' });

const verifyPasswordSchema = z.object({ password: z.string().min(1).max(128) });

const requestForgotOtpSchema = z.object({
  email: z.string().email({ message: 'Enter a valid email address' }).max(254).transform((email) => email.toLowerCase()),
});

const resetPasswordWithOtpSchema = z.object({
  email: z.string().email({ message: 'Enter a valid email address' }).max(254).transform((email) => email.toLowerCase()),
  otp: z.string().min(6).max(6),
  password: z
    .string()
    .min(10, { message: 'Password must be at least 10 characters' })
    .max(128, { message: 'Password is too long' }),
});

const cafeOwnerApplicationSchema = z.object({
  ownerName: z.string().min(2).max(100),
  email: z.string().email().max(254).transform((email) => email.toLowerCase()),
  phone: z.string().min(7).max(20),
  password: z.string().min(8).max(128),
  cafeName: z.string().min(2).max(140),
  cafeAddress: z.string().min(5).max(300),
  description: z.string().max(1200).optional(),
  openingHours: z.string().max(80).optional(),
  cafePhotos: z.array(z.string().min(1).max(500)).max(8).optional(),
  governmentId: z.string().min(2).max(120),
  businessLicense: z.string().max(120).optional(),
  termsAccepted: z.literal(true),
  informationAccurate: z.literal(true),
  approvalRequired: z.literal(true),
});

/** Public user shape + `token` / `_id` for clients expecting a Mongo-style JWT payload. */
function authSuccessPayload(user: Record<string, unknown>, accessToken: string, refreshToken?: string) {
  const u = { ...user, _id: user.id } as Record<string, unknown>;
  return {
    success: true as const,
    token: accessToken,
    user: u,
    data: { user: u, accessToken, ...(refreshToken ? { refreshToken } : {}) },
  };
}

function userPublicFields(u: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  wallet_balance: number;
  loyalty_points: number;
  loyalty_tier: string;
  avatar: string | null;
  terms_accepted_at: Date | null;
  created_at: Date;
}) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    wallet_balance: u.wallet_balance,
    loyalty_points: u.loyalty_points,
    loyalty_tier: u.loyalty_tier,
    avatar: u.avatar,
    terms_accepted_at: u.terms_accepted_at,
    created_at: u.created_at,
  };
}

router.post('/register', authRegisterLimiter, validate({ body: registerSchema }), audit('REGISTER', 'auth'), async (req, res) => {
  try {
    const { name, email, password, phone } = req.body as z.infer<typeof registerSchema>;
    const passwordError = validatePasswordStrength(password, [name, email]);
    if (passwordError) return res.status(400).json({ success: false, message: passwordError });

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = uuidv4();
    const tokens = generateTokens({ userId, email, role: 'USER' });

    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id: userId,
          name,
          email,
          phone: phone || null,
          password_hash: passwordHash,
          role: 'USER',
        },
      });
      await storeRefreshToken(tx, userId, tokens.refreshToken, tokens.familyId);
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        wallet_balance: true,
        loyalty_points: true,
        loyalty_tier: true,
        avatar: true,
        terms_accepted_at: true,
        created_at: true,
      },
    });

    const payload = authSuccessPayload(userPublicFields(user!) as Record<string, unknown>, tokens.accessToken, tokens.refreshToken);
    if (useBrowserRefreshCookie(req as Request)) {
      setRefreshTokenCookie(res, tokens.refreshToken);
      return res.status(201).json({
        success: true,
        token: tokens.accessToken,
        user: payload.user,
        data: { user: payload.user, accessToken: tokens.accessToken },
      });
    }
    return res.status(201).json(payload);
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }
    secureLogger.error('registration failed', err);
    return res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

router.post(
  '/cafe-owner/register',
  authRegisterLimiter,
  validate({ body: cafeOwnerApplicationSchema }),
  audit('CAFE_OWNER_APPLICATION', 'auth'),
  async (req, res) => {
    try {
      const body = req.body as z.infer<typeof cafeOwnerApplicationSchema>;
      const passwordError = validatePasswordStrength(body.password, [body.ownerName, body.email, body.cafeName]);
      if (passwordError) return res.status(400).json({ success: false, message: passwordError });

      const existing = await prisma.user.findUnique({ where: { email: body.email }, select: { id: true } });
      if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

      const ownerId = uuidv4();
      const cafeId = uuidv4();
      const passwordHash = await bcrypt.hash(body.password, 12);
      const slug = `${body.cafeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${cafeId.slice(0, 8)}`;

      let openTime = '08:00';
      let closeTime = '22:00';
      if (body.openingHours) {
        const parts = body.openingHours.split('-');
        if (parts.length === 2) {
          openTime = parts[0].trim();
          closeTime = parts[1].trim();
        }
      }

      await prisma.$transaction(async (tx) => {
        await tx.user.create({
          data: {
            id: ownerId,
            name: body.ownerName,
            email: body.email,
            phone: body.phone,
            password_hash: passwordHash,
            role: 'CAFE_OWNER',
            is_active: 0,
            auth_provider: 'owner_pending',
            government_id: body.governmentId,
            business_license: body.businessLicense || null,
            verification_status: 'PENDING_APPROVAL',
          },
        });

        await tx.cafe.create({
          data: {
            id: cafeId,
            name: body.cafeName,
            slug,
            description: body.description || null,
            address: body.cafeAddress,
            city: 'Mumbai',
            phone: body.phone,
            email: body.email,
            owner_id: ownerId,
            image_url: body.cafePhotos?.[0] || null,
            images: JSON.stringify(body.cafePhotos || []),
            is_active: 0,
            open_time: openTime,
            close_time: closeTime,
            tags: JSON.stringify([
              `Government ID: ${body.governmentId}`,
              ...(body.businessLicense ? [`Business License: ${body.businessLicense}`] : []),
            ]),
          },
        });
      });

      return res.status(201).json({
        success: true,
        status: 'PENDING_APPROVAL',
        message: 'Application submitted for admin approval',
        data: { ownerId, cafeId },
      });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'P2002') {
        return res.status(409).json({ success: false, message: 'Email already registered' });
      }
      secureLogger.error('cafe owner application failed', err);
      return res.status(500).json({ success: false, message: 'Application submission failed' });
    }
  }
);

router.post(
  '/google',
  authLoginLimiter,
  validate({ body: googleSignInSchema }),
  audit('GOOGLE_SIGNIN', 'auth'),
  async (req, res) => {
    try {
      if (!isGoogleAuthConfigured()) {
        return res.status(503).json({ success: false, message: 'Google Sign-In is not configured on this server' });
      }
      const { idToken } = req.body as z.infer<typeof googleSignInSchema>;
      const profile = await verifyGoogleIdToken(idToken);

      let user = await prisma.user.findUnique({ where: { email: profile.email.toLowerCase() } });

      if (!user) {
        const userId = uuidv4();
        const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
        try {
          await prisma.user.create({
            data: {
              id: userId,
              name: profile.name,
              email: profile.email.toLowerCase(),
              phone: null,
              password_hash: passwordHash,
              role: 'USER',
              avatar: profile.picture,
              google_id: profile.googleId,
              auth_provider: 'google',
            },
          });
        } catch (e: unknown) {
          const meta = (e as { meta?: { target?: string[] } })?.meta;
          if ((e as { code?: string })?.code === 'P2002' && meta?.target?.includes('google_id')) {
            return res.status(409).json({ success: false, message: 'This Google account is already linked to another profile' });
          }
          throw e;
        }
        user = await prisma.user.findUnique({ where: { id: userId } });
      } else {
        if (user.is_active !== 1) {
          return res.status(403).json({ success: false, message: 'Account disabled' });
        }
        if (user.google_id && user.google_id !== profile.googleId) {
          return res.status(401).json({ success: false, message: 'Google account mismatch' });
        }
        if (user.auth_provider === 'password' && !profile.emailVerified) {
          return res.status(409).json({
            success: false,
            message:
              'This email is already registered with a password. Sign in with email and password first, or use Google with a verified email address.',
          });
        }
        await prisma.user.update({
          where: { id: user.id },
          data: {
            google_id: profile.googleId,
            ...(user.auth_provider !== 'password' ? { auth_provider: 'google' } : {}),
            avatar: profile.picture ?? user.avatar,
            name: profile.name,
          },
        });
        user = await prisma.user.findUnique({ where: { id: user.id } });
      }

      await clearFailedLogin(user!.id);
      const tokens = generateTokens({ userId: user!.id, email: user!.email, role: user!.role as 'USER' | 'ADMIN' | 'CAFE_OWNER' });
      await storeRefreshToken(prisma, user!.id, tokens.refreshToken, tokens.familyId);

      const { password_hash: _p, ...rest } = user!;
      const safeUser = rest as Record<string, unknown>;
      const payload = authSuccessPayload(safeUser, tokens.accessToken, tokens.refreshToken);
      if (useBrowserRefreshCookie(req as Request)) {
        setRefreshTokenCookie(res, tokens.refreshToken);
        return res.json({
          success: true,
          token: tokens.accessToken,
          user: payload.user,
          data: { user: payload.user, accessToken: tokens.accessToken },
        });
      }
      return res.json(payload);
    } catch (err: unknown) {
      secureLogger.error('google auth failed', err);
      return res.status(401).json({ success: false, message: (err as Error)?.message || 'Google authentication failed' });
    }
  }
);

router.post('/login', authLoginLimiter, validate({ body: loginSchema }), audit('LOGIN', 'auth'), async (req, res) => {
  try {
    const { email, password } = req.body as z.infer<typeof loginSchema>;
    const user = await prisma.user.findFirst({ where: { email, is_active: 1 } });

    if (!user) {
      const inactiveOwner = await prisma.user.findUnique({
        where: { email },
        select: { role: true, auth_provider: true },
      });
      if (inactiveOwner?.role === 'CAFE_OWNER') {
        const status = inactiveOwner.auth_provider === 'owner_rejected' ? 'REJECTED' : 'PENDING_APPROVAL';
        return res.status(403).json({
          success: false,
          status,
          message: status === 'REJECTED'
            ? 'Your cafe owner application was rejected.'
            : 'Your cafe owner application is pending admin approval.',
        });
      }
      await recordFailedLogin(email);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.lockout_until && user.lockout_until > new Date()) {
      return res.status(423).json({ success: false, message: 'Account temporarily locked', lockoutUntil: user.lockout_until });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const retryAfterSeconds = await recordFailedLogin(email);
      return res.status(401).json({ success: false, message: 'Invalid credentials', retryAfterSeconds: retryAfterSeconds || undefined });
    }

    await clearFailedLogin(user.id, req.ip);
    const tokens = generateTokens({ userId: user.id, email: user.email, role: user.role as 'USER' | 'ADMIN' | 'CAFE_OWNER' });
    await storeRefreshToken(prisma, user.id, tokens.refreshToken, tokens.familyId);

    const { password_hash: _p, ...safeUser } = user;
    const payload = authSuccessPayload(safeUser as Record<string, unknown>, tokens.accessToken, tokens.refreshToken);
    if (useBrowserRefreshCookie(req as Request)) {
      setRefreshTokenCookie(res, tokens.refreshToken);
      return res.json({
        success: true,
        token: tokens.accessToken,
        user: payload.user,
        data: { user: payload.user, accessToken: tokens.accessToken },
      });
    }
    return res.json(payload);
  } catch (err) {
    secureLogger.error('login failed', err);
    return res.status(500).json({ success: false, message: 'Login failed' });
  }
});

router.post('/refresh', authRefreshLimiter, validate({ body: refreshBodySchema }), audit('REFRESH', 'auth'), async (req, res) => {
  const body = req.body as z.infer<typeof refreshBodySchema>;
  const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.[REFRESH_COOKIE_NAME];
  const refreshToken = body.refreshToken || cookieToken;
  if (!refreshToken || refreshToken.length < 20) {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
  const tokenHash = hashRefreshToken(refreshToken);
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token_hash: tokenHash,
      },
      include: { user: true },
    });

  if (!storedToken) return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  if (storedToken.revoked_at || storedToken.replaced_by_hash || storedToken.expires_at <= new Date()) {
    await revokeAllUserTokens(storedToken.user_id, 'refresh_token_reuse_detected');
    return res.status(401).json({ success: false, message: 'Session compromised. Please log in again.' });
  }

  try {
    verifyRefreshToken(refreshToken);
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }

  const user = await prisma.user.findFirst({
    where: { id: storedToken.user_id, is_active: 1 },
    select: { id: true, email: true, role: true },
  });
  if (!user) return res.status(401).json({ success: false, message: 'User not found' });

  const tokens = generateTokens({ userId: user.id, email: user.email, role: user.role as 'USER' | 'ADMIN' }, storedToken.family_id || uuidv4());
  await prisma.$transaction(async (tx) => {
    await tx.refreshToken.update({
      where: { id: storedToken.id },
      data: { replaced_by_hash: tokens.refreshHash, revoked_at: new Date() },
    });
    await storeRefreshToken(tx, user.id, tokens.refreshToken, tokens.familyId);
  });

  if (useBrowserRefreshCookie(req as Request)) {
    setRefreshTokenCookie(res, tokens.refreshToken);
    return res.json({ success: true, data: { accessToken: tokens.accessToken } });
  }
  return res.json({ success: true, data: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken } });
});

router.post('/logout', authenticate, validate({ body: logoutSchema }), audit('LOGOUT', 'auth'), async (req: AuthenticatedRequest, res: Response) => {
  const { refreshToken } = req.body as z.infer<typeof logoutSchema>;
  const cookieTok = (req as Request & { cookies?: Record<string, string> }).cookies?.[REFRESH_COOKIE_NAME];

  const revokeTok = async (tx: DbClient, tok?: string) => {
    if (!tok || tok.length < 20) return;
    await tx.refreshToken.updateMany({
      where: {
        user_id: req.user.userId,
        OR: [{ token_hash: hashRefreshToken(tok) }, { token: tok }],
        revoked_at: null,
      },
      data: { revoked_at: new Date() },
    });
  };

  await prisma.$transaction(async (tx) => {
    await revokeAccessToken(tx, req.user.userId, req.user.jti!, 'logout');
    await revokeTok(tx, refreshToken);
    await revokeTok(tx, cookieTok);
  });
  clearRefreshTokenCookie(res);
  return res.json({ success: true, message: 'Logged out' });
});

router.get('/me', authenticate, audit('ME', 'auth'), async (req: AuthenticatedRequest, res: Response) => {
  const dbUser = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      wallet_balance: true,
      loyalty_points: true,
      loyalty_tier: true,
      avatar: true,
      terms_accepted_at: true,
      created_at: true,
    },
  });
  if (!dbUser) return res.status(404).json({ success: false, message: 'User not found' });
  return res.json({ success: true, data: dbUser });
});

router.post(
  '/verify-password',
  authenticate,
  validate({ body: verifyPasswordSchema }),
  audit('VERIFY_PASSWORD', 'auth'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const row = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { password_hash: true, auth_provider: true },
      });
      if (!row) return res.status(404).json({ success: false, message: 'User not found' });
      if (row.auth_provider === 'google') {
        return res.status(400).json({
          success: false,
          message: 'Password verification is not available for Google-only accounts.',
        });
      }
      const { password } = req.body as z.infer<typeof verifyPasswordSchema>;
      const valid = await bcrypt.compare(password, row.password_hash);
      return res.json({ success: true, data: { valid } });
    } catch (err) {
      secureLogger.error('verify-password failed', err);
      return res.status(500).json({ success: false, message: 'Verification failed' });
    }
  }
);

router.post(
  '/delete-account',
  authenticate,
  audit('ACCOUNT_DELETE_REQUEST', 'auth'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.userId;

      const pendingOrders = await prisma.order.count({
        where: {
          user_id: userId,
          status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] },
        },
      });
      if (pendingOrders > 0) {
        return res.status(409).json({
          success: false,
          message: 'Finish or cancel active orders before deleting your account.',
        });
      }

      const pendingResRows = await prisma.$queryRaw<{ c: bigint }[]>`
        SELECT COUNT(*)::bigint AS c
        FROM reservations
        WHERE user_id = ${userId}
          AND status = 'CONFIRMED'
          AND (date::text || ' ' || time)::timestamp > NOW()
      `;
      const pendingRes = Number(pendingResRows[0]?.c ?? 0);
      if (pendingRes > 0) {
        return res.status(409).json({
          success: false,
          message: 'Cancel upcoming reservations before deleting your account.',
        });
      }

      await revokeAllUserTokens(userId, 'account_deletion_requested');
      const graceEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await prisma.user.update({
        where: { id: userId },
        data: { is_active: 0, deletion_scheduled_at: graceEnd },
      });

      const row = await prisma.user.findUnique({
        where: { id: userId },
        select: { deletion_scheduled_at: true },
      });

      return res.json({
        success: true,
        data: {
          message: 'Account scheduled for deletion. You can restore it within 30 days using the same email.',
          deletionScheduledAt: row?.deletion_scheduled_at,
          gracePeriodDays: 30,
        },
      });
    } catch (err: unknown) {
      secureLogger.error('delete account failed', err);
      return res.status(500).json({ success: false, message: 'Could not process account deletion' });
    }
  }
);

router.post(
  '/accept-terms',
  authenticate,
  audit('ACCEPT_TERMS', 'auth'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.userId;
      await prisma.user.update({
        where: { id: userId },
        data: { terms_accepted_at: new Date() },
      });

      secureLogger.info(`User ${userId} accepted terms`);
      return res.json({ success: true, message: 'Terms accepted and recorded' });
    } catch (err: unknown) {
      secureLogger.error('accept terms failed', err);
      return res.status(500).json({ success: false, message: 'Could not record terms acceptance' });
    }
  }
);

router.post(
  '/cancel-account-deletion',
  authLoginLimiter,
  validate({ body: cancelDeletionSchema }),
  audit('ACCOUNT_DELETE_CANCEL', 'auth'),
  async (req, res) => {
    try {
      const body = req.body as z.infer<typeof cancelDeletionSchema>;
      let user: Awaited<ReturnType<typeof prisma.user.findUnique>>;

      if (body.idToken) {
        if (!isGoogleAuthConfigured()) {
          return res.status(503).json({ success: false, message: 'Google Sign-In is not configured on this server' });
        }
        const profile = await verifyGoogleIdToken(body.idToken);
        user = await prisma.user.findUnique({ where: { email: profile.email.toLowerCase() } });
      } else {
        const email = String(body.email || '').toLowerCase();
        user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          await recordFailedLogin(email);
          return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        const valid = await bcrypt.compare(String(body.password), user.password_hash);
        if (!valid) {
          await recordFailedLogin(email);
          return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
      }

      if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
      if (!user.deletion_scheduled_at) {
        return res.status(400).json({ success: false, message: 'No pending account deletion for this account.' });
      }

      if (!(user.deletion_scheduled_at > new Date())) {
        return res.status(400).json({
          success: false,
          message: 'The restoration window for this account has expired.',
        });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { is_active: 1, deletion_scheduled_at: null },
      });

      return res.json({ success: true, message: 'Account deletion cancelled. You can sign in again.' });
    } catch (err: unknown) {
      secureLogger.error('cancel account deletion failed', err);
      return res.status(500).json({ success: false, message: 'Could not cancel account deletion' });
    }
  }
);

router.post(
  '/forgot-password/request',
  validate({ body: requestForgotOtpSchema }),
  audit('FORGOT_PASSWORD_REQUEST', 'auth'),
  async (req, res) => {
    try {
      const { email } = req.body as z.infer<typeof requestForgotOtpSchema>;
      const user = await prisma.user.findUnique({ where: { email }, select: { id: true, is_active: true } });
      
      // For security, always return generic success message to prevent user enumeration
      if (user && user.is_active === 1) {
        await generateAndSendOtp(email);
      }
      
      return res.json({
        success: true,
        message: 'If this email is registered, we have sent a 6-digit OTP code to verify.',
      });
    } catch (err: unknown) {
      secureLogger.error('forgot password request failed', err);
      return res.status(500).json({ success: false, message: 'Failed to process request' });
    }
  }
);

router.post(
  '/forgot-password/reset',
  validate({ body: resetPasswordWithOtpSchema }),
  audit('FORGOT_PASSWORD_RESET', 'auth'),
  async (req, res) => {
    try {
      const { email, otp, password } = req.body as z.infer<typeof resetPasswordWithOtpSchema>;
      
      const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, is_active: true } });
      if (!user || user.is_active !== 1) {
        return res.status(400).json({ success: false, message: 'Invalid email or verification code' });
      }
      
      const passwordError = validatePasswordStrength(password, [user.name, email]);
      if (passwordError) {
        return res.status(400).json({ success: false, message: passwordError });
      }
      
      const isValid = verifyOtp(email, otp);
      if (!isValid) {
        return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
      }
      
      const passwordHash = await bcrypt.hash(password, 12);
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { password_hash: passwordHash },
        });
        // Revoke all existing sessions to enforce security after a password change
        await tx.refreshToken.updateMany({
          where: { user_id: user.id, revoked_at: null },
          data: { revoked_at: new Date() },
        });
      });
      
      return res.json({
        success: true,
        message: 'Password reset successfully. You can now log in with your new password.',
      });
    } catch (err: unknown) {
      secureLogger.error('forgot password reset failed', err);
      return res.status(500).json({ success: false, message: 'Failed to reset password' });
    }
  }
);

export default router;
