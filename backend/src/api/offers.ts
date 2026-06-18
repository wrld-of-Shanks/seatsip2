import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticate } from '../common/auth';
import { AuthenticatedRequest } from '../types/authenticated-request';
import { validate } from '../security/http';
import { secureLogger } from '../security/logger';

const offersRouter = Router();
offersRouter.use(authenticate);

// ─── Constants ─────────────────────────────────────────────────────────────────
const TIER_ORDER: Record<string, number> = { silver: 1, gold: 2, platinum: 3 };
const TIER_MULTIPLIERS: Record<string, number> = { silver: 1.01, gold: 1.03, platinum: 1.05 };

function getTierName(tier: string): string {
  const names: Record<string, string> = { silver: 'Coffee', gold: 'Caramel', platinum: 'Cream' };
  return names[tier.toLowerCase()] || 'Coffee';
}

// ─── GET /api/v1/offers ────────────────────────────────────────────────────────
offersRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { loyalty_tier: true, is_subscribed: true, subscription_expires_at: true, total_lifetime_points: true, created_at: true },
  });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const now = new Date();
  const isSubscribed = user.is_subscribed && user.subscription_expires_at && user.subscription_expires_at > now;

  // Check birthday month (from user creation date as proxy, or actual DOB if available)
  const birthMonth = user.created_at?.getMonth();

  const offers = await prisma.offer.findMany({
    where: {
      is_active: true,
      valid_from: { lte: now },
      valid_until: { gte: now },
      ...(isSubscribed ? {} : { subscriber_only: false }),
    },
    orderBy: { valid_until: 'asc' },
  });

  // Also check what the user has already redeemed
  const redeemedOfferIds = new Set(
    (await prisma.redeemedOffer.findMany({
      where: { user_id: userId },
      select: { offer_id: true },
    })).map((r) => r.offer_id),
  );

  const enriched = offers
    .filter((offer) => {
      // Check min tier
      if (offer.min_tier && (TIER_ORDER[user.loyalty_tier.toLowerCase()] || 0) < (TIER_ORDER[offer.min_tier.toLowerCase()] || 0)) {
        return false;
      }
      // Check max redemptions per user
      if (offer.max_redemptions > 0 && offer.times_redeemed >= offer.max_redemptions) {
        return false;
      }
      return true;
    })
    .map((offer) => {
      const tierMultiplier = TIER_MULTIPLIERS[user.loyalty_tier.toLowerCase()] || 1.01;
      const totalMultiplier = (offer.multiplier || 1) * tierMultiplier * (isSubscribed ? 1.5 : 1);

      return {
        ...offer,
        isRedeemed: redeemedOfferIds.has(offer.id),
        subscriberOnly: offer.subscriber_only,
        canRedeem: !redeemedOfferIds.has(offer.id) && (!offer.subscriber_only || isSubscribed),
        effectiveMultiplier: totalMultiplier,
      };
    });

  secureLogger.info(`[Offers] List for user ${userId}: ${enriched.length} offers available`);
  return res.json({
    success: true,
    offers: enriched,
    userTier: getTierName(user.loyalty_tier),
    isSubscribed,
  });
});

// ─── POST /api/v1/offers/redeem ────────────────────────────────────────────────
const redeemOfferSchema = z.object({
  offerId: z.string(),
});

offersRouter.post('/redeem', validate({ body: redeemOfferSchema }), async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const { offerId } = req.body;

  const result = await prisma.$transaction(async (tx) => {
    const offer = await tx.offer.findUnique({ where: { id: offerId } });
    if (!offer) throw new Error('Offer not found');
    if (!offer.is_active) throw new Error('Offer is no longer active');
    if (offer.valid_from > new Date() || offer.valid_until < new Date()) throw new Error('Offer has expired');
    if (offer.max_redemptions > 0 && offer.times_redeemed >= offer.max_redemptions) throw new Error('Offer fully redeemed');

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    if (offer.subscriber_only) {
      if (!user.is_subscribed || !user.subscription_expires_at || user.subscription_expires_at <= new Date()) {
        throw new Error('This offer is for subscribers only');
      }
    }

    if (offer.min_tier) {
      const userTierOrder = TIER_ORDER[user.loyalty_tier.toLowerCase()] || 0;
      const minTierOrder = TIER_ORDER[offer.min_tier.toLowerCase()] || 0;
      if (userTierOrder < minTierOrder) {
        throw new Error(`This offer requires at least ${getTierName(offer.min_tier)} tier`);
      }
    }

    // Check if already redeemed
    const existing = await tx.redeemedOffer.findFirst({
      where: { user_id: userId, offer_id: offerId },
    });
    if (existing) throw new Error('Offer already redeemed');

    const tierMultiplier = TIER_MULTIPLIERS[user.loyalty_tier.toLowerCase()] || 1.01;
    const subBoost = (user.is_subscribed && user.subscription_expires_at && user.subscription_expires_at > new Date()) ? 1.5 : 1;
    const effectiveMultiplier = (offer.multiplier || 1) * tierMultiplier * subBoost;

    let pointsEarned = offer.points_bonus || 0;
    if (pointsEarned > 0) {
      pointsEarned = Math.round(pointsEarned * effectiveMultiplier);
    }

    if (pointsEarned > 0) {
      const newBalance = Math.min(user.loyalty_points + pointsEarned, user.points_cap || 50000);
      const newLifetime = user.total_lifetime_points + pointsEarned;

      await tx.user.update({
        where: { id: userId },
        data: {
          loyalty_points: newBalance,
          total_lifetime_points: newLifetime,
          last_activity_at: new Date(),
        },
      });

      await tx.pointsTransaction.create({
        data: {
          id: uuidv4(),
          user_id: userId,
          type: 'EARN',
          amount: pointsEarned,
          balance_before: user.loyalty_points,
          balance_after: newBalance,
          description: `Offer: ${offer.title}`,
          reference_type: 'OFFER',
          reference_id: offerId,
          multiplier: effectiveMultiplier,
        },
      });
    }

    const redeemed = await tx.redeemedOffer.create({
      data: {
        id: uuidv4(),
        user_id: userId,
        offer_id: offerId,
        points_earned: pointsEarned,
        multiplier: effectiveMultiplier,
      },
    });

    await tx.offer.update({
      where: { id: offerId },
      data: { times_redeemed: { increment: 1 } },
    });

    return { redeemed, offer, pointsEarned, effectiveMultiplier };
  });

  // Send notification
  try {
    await prisma.notification.create({
      data: {
        id: uuidv4(),
        user_id: userId,
        title: result.pointsEarned > 0 ? `🎉 ${result.offer.title} — +${result.pointsEarned} pts` : `🎉 ${result.offer.title}`,
        body: result.pointsEarned > 0
          ? `You earned ${result.pointsEarned} pts${result.effectiveMultiplier > 1 ? ` (${result.effectiveMultiplier.toFixed(2)}x multiplier)` : ''}`
          : 'Offer redeemed successfully!',
        type: 'OFFER',
        data: JSON.stringify({ offerId, pointsEarned: result.pointsEarned }),
      },
    });
  } catch {
    // silent
  }

  secureLogger.info(`[Offers] Redeemed ${offerId} for user ${userId}: ${result.pointsEarned > 0 ? `+${result.pointsEarned} pts` : 'no points'}`);
  return res.json({
    success: true,
    message: result.pointsEarned > 0
      ? `🎉 ${result.offer.title} — +${result.pointsEarned} points!`
      : `🎉 ${result.offer.title} redeemed!`,
    pointsEarned: result.pointsEarned,
    multiplier: result.effectiveMultiplier,
  });
});

// ─── Admin: POST /api/v1/offers/create ─────────────────────────────────────────
const createOfferSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['BIRTHDAY_BONUS', 'STREAK_REWARD', 'PROMO_CODE', 'SUBSCRIBER_ONLY']),
  multiplier: z.number().positive().optional().default(1.0),
  pointsBonus: z.number().int().positive().optional(),
  code: z.string().optional(),
  minTier: z.enum(['silver', 'gold', 'platinum']).optional(),
  subscriberOnly: z.boolean().optional().default(false),
  maxRedemptions: z.number().int().optional().default(-1),
  validFrom: z.string(),
  validUntil: z.string(),
});

offersRouter.post('/create', validate({ body: createOfferSchema }), async (req: AuthenticatedRequest, res: Response) => {
  const adminId = req.user?.userId;
  const adminUser = await prisma.user.findUnique({ where: { id: adminId } });
  if (!adminUser || adminUser.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Admin only' });

  const { validFrom, validUntil, pointsBonus, subscriberOnly, minTier, maxRedemptions, multiplier, ...rest } = req.body;

  const offer = await prisma.offer.create({
    data: {
      id: uuidv4(),
      ...rest,
      subscriber_only: subscriberOnly ?? false,
      min_tier: minTier || null,
      max_redemptions: maxRedemptions ?? -1,
      multiplier: multiplier ?? 1.0,
      points_bonus: pointsBonus || null,
      valid_from: new Date(validFrom),
      valid_until: new Date(validUntil),
    },
  });

  secureLogger.info(`[Offers] Created offer ${offer.id}: ${offer.title}`);
  return res.json({ success: true, message: 'Offer created', offer });
});

// ─── Admin: GET /api/v1/offers/admin/all ───────────────────────────────────────
offersRouter.get('/admin/all', async (req: AuthenticatedRequest, res: Response) => {
  const adminId = req.user?.userId;
  const adminUser = await prisma.user.findUnique({ where: { id: adminId } });
  if (!adminUser || adminUser.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Admin only' });

  const offers = await prisma.offer.findMany({
    orderBy: { valid_from: 'desc' },
  });

  secureLogger.info(`[Offers] Admin list: ${offers.length} offers found`);
  return res.json({ success: true, offers });
});

export default offersRouter;
