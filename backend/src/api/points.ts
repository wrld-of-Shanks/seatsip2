import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticate } from '../common/auth';
import { AuthenticatedRequest } from '../types/authenticated-request';
import { validate } from '../security/http';
import { secureLogger } from '../security/logger';

const pointsRouter = Router();
pointsRouter.use(authenticate);

// ─── Constants ─────────────────────────────────────────────────────────────────
const TIER_ORDER: Record<string, number> = { silver: 1, gold: 2, platinum: 3 };
const TIER_NAMES: Record<string, string> = { silver: 'Coffee', gold: 'Caramel', platinum: 'Cream' };
const TIER_THRESHOLDS: Record<string, number> = { silver: 0, gold: 1000, platinum: 5000 };
const TIER_MULTIPLIERS: Record<string, number> = { silver: 1.01, gold: 1.03, platinum: 1.05 };
const EARN_RULES: Record<string, { points: number; description: string; referenceType: string }> = {
  ORDER_SPEND: { points: 10, description: 'Order spend — 10 pts per ₹100', referenceType: 'ORDER' },
  RESERVATION: { points: 50, description: 'Reservation completed', referenceType: 'RESERVATION' },
  WRITE_REVIEW: { points: 30, description: 'Wrote a review', referenceType: 'REVIEW' },
  REFER_FRIEND: { points: 100, description: 'Referred a friend who joined', referenceType: 'REFERRAL' },
};
const SUBSCRIBER_BOOST = 1.5;
const MAX_POINTS_BALANCE = 50000;
const INACTIVITY_EXPIRY_DAYS = 365;

function getTier(points: number): string {
  if (points >= TIER_THRESHOLDS.platinum) return 'platinum';
  if (points >= TIER_THRESHOLDS.gold) return 'gold';
  return 'silver';
}

function getTierName(tier: string): string {
  return TIER_NAMES[tier.toLowerCase()] || 'Coffee';
}

async function getSubscriptionBoost(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { is_subscribed: true, subscription_expires_at: true },
  });
  if (user?.is_subscribed && user.subscription_expires_at && user.subscription_expires_at > new Date()) {
    return SUBSCRIBER_BOOST;
  }
  if (user?.is_subscribed && (!user.subscription_expires_at || user.subscription_expires_at <= new Date())) {
    await prisma.user.update({ where: { id: userId }, data: { is_subscribed: false } });
  }
  return 1.0;
}

async function calculatePoints(
  userId: string,
  basePoints: number,
  tier: string,
  subscriptionBoost: number,
): Promise<{ points: number; multiplier: number }> {
  const tierMultiplier = TIER_MULTIPLIERS[tier.toLowerCase()] || 1.01;
  const multiplier = tierMultiplier * subscriptionBoost;
  let points = Math.round(basePoints * multiplier);
  return { points, multiplier };
}

async function updateTierIfNeeded(userId: string, newLifetimePoints: number, tx: any): Promise<string | null> {
  const newTier = getTier(newLifetimePoints);
  const user = await tx.user.findUnique({ where: { id: userId }, select: { loyalty_tier: true } });
  if (user && user.loyalty_tier.toLowerCase() !== newTier) {
    await tx.loyaltyTierHistory.create({
      data: {
        id: uuidv4(),
        user_id: userId,
        from_tier: user.loyalty_tier,
        to_tier: newTier,
        points_at: newLifetimePoints,
        reason: 'points_threshold',
      },
    });
    return newTier;
  }
  return null;
}

async function sendPointsNotification(userId: string, title: string, body: string, data?: Record<string, string>) {
  try {
    await prisma.notification.create({
      data: {
        id: uuidv4(),
        user_id: userId,
        title,
        body,
        type: 'POINTS',
        data: JSON.stringify(data || {}),
      },
    });
  } catch {
    // silent fail
  }
}

// ─── POST /api/v1/points/earn ──────────────────────────────────────────────────
const earnSchema = z.object({
  action: z.enum(['ORDER_SPEND', 'RESERVATION', 'WRITE_REVIEW', 'REFER_FRIEND']),
  referenceId: z.string().optional(),
  amount: z.number().positive().optional(),
});

pointsRouter.post('/earn', validate({ body: earnSchema }), async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const { action, referenceId, amount } = req.body;
  const rule = EARN_RULES[action];
  if (!rule) return res.status(400).json({ success: false, message: 'Invalid action' });

  let basePoints = rule.points;
  if (action === 'ORDER_SPEND' && amount) {
    basePoints = Math.floor(amount / 100) * 10;
  }

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { loyalty_points: true, loyalty_tier: true, total_lifetime_points: true, points_cap: true },
    });
    if (!user) throw new Error('User not found');

    const subscriptionBoost = await getSubscriptionBoost(userId);
    const { points, multiplier } = await calculatePoints(userId, basePoints, user.loyalty_tier, subscriptionBoost);

    const newBalance = Math.min(user.loyalty_points + points, user.points_cap);
    const newLifetime = user.total_lifetime_points + points;

    const newTier = await updateTierIfNeeded(userId, newLifetime, tx);

    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        loyalty_points: newBalance,
        total_lifetime_points: newLifetime,
        loyalty_tier: newTier || user.loyalty_tier,
        last_activity_at: new Date(),
      },
    });

    await tx.pointsTransaction.create({
      data: {
        id: uuidv4(),
        user_id: userId,
        type: 'EARN',
        amount: points,
        balance_before: user.loyalty_points,
        balance_after: newBalance,
        description: `${rule.description}${action === 'ORDER_SPEND' && amount ? ` (₹${amount})` : ''}`,
        reference_type: rule.referenceType,
        reference_id: referenceId,
        multiplier,
      },
    });

    return { updatedUser, points, multiplier, tierUpgrade: !!newTier, newTier };
  });

  await sendPointsNotification(
    userId,
    `+${result.points} Points earned!`,
    result.tierUpgrade
      ? `You earned ${result.points} pts and upgraded to ${getTierName(result.newTier!)} tier!`
      : `You earned ${result.points} pts${result.multiplier > 1 ? ` (${result.multiplier.toFixed(2)}x multiplier)` : ''}`,
    { action, points: String(result.points) },
  );

  secureLogger.info(`[Points] Earn for user ${userId}: ${action} -> +${result.points} pts (${result.multiplier.toFixed(2)}x)${result.tierUpgrade ? ', tier upgrade!' : ''}`);
  return res.json({
    success: true,
    message: `+${result.points} pts — ${EARN_RULES[action].description}`,
    pointsEarned: result.points,
    multiplier: result.multiplier,
    tierUpgrade: result.tierUpgrade,
    newTier: result.newTier ? getTierName(result.newTier) : null,
    updatedBalance: {
      points: result.updatedUser.loyalty_points,
      tier: getTierName(result.updatedUser.loyalty_tier),
      lifetimePoints: result.updatedUser.total_lifetime_points,
      pointsToNextTier: Math.max(0, TIER_THRESHOLDS[getTier(result.updatedUser.total_lifetime_points + 1)] - result.updatedUser.total_lifetime_points),
    },
  });
});

// ─── POST /api/v1/points/redeem ────────────────────────────────────────────────
const redeemSchema = z.object({
  rewardId: z.string(),
  orderId: z.string().optional(),
});

pointsRouter.post('/redeem', validate({ body: redeemSchema }), async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const { rewardId, orderId } = req.body;

  const result = await prisma.$transaction(async (tx) => {
    const reward = await tx.reward.findUnique({ where: { id: rewardId } });
    if (!reward || !reward.is_active) throw new Error('Reward not found');
    if (reward.stock === 0) throw new Error('Reward out of stock');

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const tierRequired = reward.tier_required.toLowerCase();
    const userTier = user.loyalty_tier.toLowerCase();
    if ((TIER_ORDER[userTier] || 0) < (TIER_ORDER[tierRequired] || 0)) {
      throw new Error(`This reward requires ${reward.tier_required} tier`);
    }

    // Check if subscribed for priority redemption (subscribers can redeem with 10% fewer points)
    const isSubscribed = user.is_subscribed && user.subscription_expires_at && user.subscription_expires_at > new Date();
    if (user.loyalty_points < reward.points_cost && !isSubscribed) {
      throw new Error('Insufficient points');
    }

    const actualCost = isSubscribed ? Math.floor(reward.points_cost * 0.9) : reward.points_cost;
    if (user.loyalty_points < actualCost) {
      throw new Error('Insufficient points');
    }

    const newBalance = user.loyalty_points - actualCost;

    await tx.user.update({
      where: { id: userId },
      data: { loyalty_points: newBalance, last_activity_at: new Date() },
    });

    await tx.pointsTransaction.create({
      data: {
        id: uuidv4(),
        user_id: userId,
        type: 'SPEND',
        amount: -actualCost,
        balance_before: user.loyalty_points,
        balance_after: newBalance,
        description: `Redeemed: ${reward.name}`,
        reference_type: 'REWARD',
        reference_id: rewardId,
      },
    });

    const redeemed = await tx.redeemedReward.create({
      data: {
        id: uuidv4(),
        user_id: userId,
        reward_id: rewardId,
        order_id: orderId || null,
        points_spent: actualCost,
      },
    });

    await tx.reward.update({
      where: { id: rewardId },
      data: {
        stock: reward.stock > 0 ? { decrement: 1 } : undefined,
        total_redeemed: { increment: 1 },
      },
    });

    return { redeemed, reward, newBalance };
  });

  await sendPointsNotification(
    userId,
    `Redeemed: ${result.reward.name}`,
    `You spent ${result.reward.points_cost} points on ${result.reward.name}.`,
    { rewardId, pointsSpent: String(result.reward.points_cost) },
  );

  secureLogger.info(`[Points] Redeem for user ${userId}: ${result.reward.name} (-${result.reward.points_cost} pts)`);
  return res.json({
    success: true,
    message: `🎉 ${result.reward.name} redeemed successfully!`,
    redemption: { id: result.redeemed.id, pointsSpent: result.redeemed.points_spent },
    updatedBalance: { points: result.newBalance },
  });
});

// ─── POST /api/v1/points/convert-to-wallet ─────────────────────────────────────
const convertSchema = z.object({
  points: z.number().int().positive(),
});

pointsRouter.post('/convert-to-wallet', validate({ body: convertSchema }), async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const { points } = req.body;

  if (points < 100) return res.status(400).json({ success: false, message: 'Minimum 100 points to convert' });

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    if (user.loyalty_points < points) throw new Error('Insufficient points');

    // Rate: ₹1 per 2 points (matching existing getPointsValue)
    const walletCredit = Math.floor(points / 2);
    const newPoints = user.loyalty_points - points;
    const newWallet = Number(user.wallet_balance) + walletCredit;

    await tx.user.update({
      where: { id: userId },
      data: { loyalty_points: newPoints, wallet_balance: newWallet, last_activity_at: new Date() },
    });

    await tx.pointsTransaction.create({
      data: {
        id: uuidv4(),
        user_id: userId,
        type: 'CONVERT',
        amount: -points,
        balance_before: user.loyalty_points,
        balance_after: newPoints,
        description: `Converted to wallet — ₹${walletCredit}`,
        reference_type: 'WALLET',
      },
    });

    await tx.walletTransaction.create({
      data: {
        id: uuidv4(),
        user_id: userId,
        type: 'TOPUP',
        amount: walletCredit,
        description: `Points conversion — ${points} pts → ₹${walletCredit}`,
        balance_after: newWallet,
      },
    });

    return { walletCredit, newPoints, newWallet };
  });

  secureLogger.info(`[Points] Convert for user ${userId}: ${points} pts -> ₹${result.walletCredit}`);
  return res.json({
    success: true,
    message: `Converted ${points} points to ₹${result.walletCredit}`,
    walletCredit: result.walletCredit,
    updatedBalance: {
      points: result.newPoints,
      wallet: result.newWallet,
    },
  });
});

// ─── GET /api/v1/points/ledger ─────────────────────────────────────────────────
pointsRouter.get('/ledger', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const type = req.query.type as string;

  const where: any = { user_id: userId };
  if (type && ['EARN', 'SPEND', 'EXPIRE', 'ADJUSTMENT', 'CONVERT'].includes(type)) {
    where.type = type;
  }

  const [transactions, total] = await Promise.all([
    prisma.pointsTransaction.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.pointsTransaction.count({ where }),
  ]);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { loyalty_points: true, loyalty_tier: true, total_lifetime_points: true, points_cap: true, is_subscribed: true },
  });

  secureLogger.info(`[Points] Ledger for user ${userId}: ${transactions.length} transactions`);
  return res.json({
    success: true,
    transactions,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    summary: user ? {
      currentBalance: user.loyalty_points,
      tier: getTierName(user.loyalty_tier),
      lifetimePoints: user.total_lifetime_points,
      pointsCap: user.points_cap,
      isSubscribed: user.is_subscribed,
      pointsToNextTier: Math.max(0, TIER_THRESHOLDS[getTier(user.total_lifetime_points + 1)] - user.total_lifetime_points),
    } : null,
  });
});

// ─── POST /api/v1/points/check-expiry ──────────────────────────────────────────
pointsRouter.post('/check-expiry', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { is_subscribed: true, subscription_expires_at: true, last_activity_at: true, loyalty_points: true },
  });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  // Subscribed users never expire
  if (user.is_subscribed && user.subscription_expires_at && user.subscription_expires_at > new Date()) {
    return res.json({
      success: true,
      expiryStatus: 'no_expiry',
      message: 'Points never expire while subscription is active',
    });
  }

  // Check inactivity
  if (user.last_activity_at) {
    const daysSinceActivity = Math.floor((Date.now() - user.last_activity_at.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, INACTIVITY_EXPIRY_DAYS - daysSinceActivity);
    return res.json({
      success: true,
      expiryStatus: daysRemaining === 0 ? 'expired' : 'active',
      daysSinceActivity,
      daysRemaining,
      totalExpiryDays: INACTIVITY_EXPIRY_DAYS,
    });
  }

  return res.json({
    success: true,
    expiryStatus: 'active',
    daysSinceActivity: 0,
    daysRemaining: INACTIVITY_EXPIRY_DAYS,
    totalExpiryDays: INACTIVITY_EXPIRY_DAYS,
  });
});

// ─── GET /api/v1/points/summary ────────────────────────────────────────────────
pointsRouter.get('/summary', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: { select: { status: true, expires_at: true, auto_renew: true, plan_type: true } },
    },
  });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const tier = user.loyalty_tier.toLowerCase();
  const tierMultiplier = TIER_MULTIPLIERS[tier] || 1.01;
  const lifetimePoints = user.total_lifetime_points;
  const currentTierThreshold = TIER_THRESHOLDS[tier] || 0;
  const nextTierKey = tier === 'silver' ? 'gold' : tier === 'gold' ? 'platinum' : null;
  const nextTierThreshold = nextTierKey ? TIER_THRESHOLDS[nextTierKey] : null;
  const pointsToNextTier = nextTierThreshold ? Math.max(0, nextTierThreshold - lifetimePoints) : 0;
  const progressToNext = nextTierThreshold ? Math.min(100, Math.round(((lifetimePoints - currentTierThreshold) / (nextTierThreshold - currentTierThreshold)) * 100)) : 100;

  // Calculate projected earning rates
  const earningRates = {
    free: {
      orderSpend: '10 pts per ₹100',
      reservation: '50 pts',
      review: '30 pts',
      referral: '100 pts',
      tierMultiplier: `${tierMultiplier.toFixed(2)}x (${getTierName(tier)})`,
    },
    subscribed: {
      orderSpend: '15 pts per ₹100',
      reservation: '75 pts',
      review: '45 pts',
      referral: '150 pts',
      tierMultiplier: `${(tierMultiplier * SUBSCRIBER_BOOST).toFixed(2)}x (${getTierName(tier)} × 1.5x subscriber)`,
      bonusBenefits: ['Birthday 2x multiplier', 'Streak rewards', 'Promotional bonus codes'],
    },
  };

  return res.json({
    success: true,
    summary: {
      currentBalance: user.loyalty_points,
      tier: getTierName(tier),
      tierRaw: tier,
      lifetimePoints,
      pointsCap: user.points_cap,
      isSubscribed: user.is_subscribed,
      subscription: user.subscription ? {
        status: user.subscription.status,
        expiresAt: user.subscription.expires_at,
        autoRenew: user.subscription.auto_renew,
        planType: user.subscription.plan_type,
      } : null,
      tierInfo: {
        currentTier: getTierName(tier),
        currentThreshold: currentTierThreshold,
        nextTier: nextTierKey ? getTierName(nextTierKey) : null,
        nextThreshold: nextTierThreshold,
        pointsToNextTier,
        progressPercent: progressToNext,
      },
      multiplier: tierMultiplier,
      earningRates,
      expiryInfo: user.is_subscribed ? { type: 'no_expiry' } : { type: 'inactivity', days: INACTIVITY_EXPIRY_DAYS },
    },
  });
});

// ─── Admin: POST /api/v1/points/admin/grant ────────────────────────────────────
const adminGrantSchema = z.object({
  userId: z.string(),
  points: z.number().int().positive(),
  reason: z.string().min(1),
});

pointsRouter.post('/admin/grant', validate({ body: adminGrantSchema }), async (req: AuthenticatedRequest, res: Response) => {
  const adminId = req.user?.userId;
  const adminUser = await prisma.user.findUnique({ where: { id: adminId } });
  if (!adminUser || adminUser.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Admin only' });

  const { userId, points, reason } = req.body;

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const newBalance = Math.min(user.loyalty_points + points, user.points_cap);
    const newLifetime = user.total_lifetime_points + points;
    const newTier = await updateTierIfNeeded(userId, newLifetime, tx);

    await tx.user.update({
      where: { id: userId },
      data: {
        loyalty_points: newBalance,
        total_lifetime_points: newLifetime,
        loyalty_tier: newTier || user.loyalty_tier,
      },
    });

    const txn = await tx.pointsTransaction.create({
      data: {
        id: uuidv4(),
        user_id: userId,
        type: 'ADJUSTMENT',
        amount: points,
        balance_before: user.loyalty_points,
        balance_after: newBalance,
        description: `Admin grant: ${reason}`,
        reference_type: 'ADMIN',
      },
    });

    return { txn, newBalance, newTier };
  });

  await sendPointsNotification(
    userId,
    `+${points} Points Credited`,
    `Admin credited ${points} pts — ${reason}`,
  );

  secureLogger.info(`[Points] Admin grant: ${points} pts -> user ${userId}, reason: ${reason}`);
  return res.json({
    success: true,
    message: `Granted ${points} points to user`,
    transaction: result.txn,
    updatedBalance: result.newBalance,
  });
});

// ─── Admin: POST /api/v1/points/admin/debit ────────────────────────────────────
const adminDebitSchema = z.object({
  userId: z.string(),
  points: z.number().int().positive(),
  reason: z.string().min(1),
});

pointsRouter.post('/admin/debit', validate({ body: adminDebitSchema }), async (req: AuthenticatedRequest, res: Response) => {
  const adminId = req.user?.userId;
  const adminUser = await prisma.user.findUnique({ where: { id: adminId } });
  if (!adminUser || adminUser.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Admin only' });

  const { userId, points, reason } = req.body;

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    if (user.loyalty_points < points) throw new Error('Insufficient points');

    const newBalance = user.loyalty_points - points;

    await tx.user.update({
      where: { id: userId },
      data: { loyalty_points: newBalance },
    });

    const txn = await tx.pointsTransaction.create({
      data: {
        id: uuidv4(),
        user_id: userId,
        type: 'ADJUSTMENT',
        amount: -points,
        balance_before: user.loyalty_points,
        balance_after: newBalance,
        description: `Admin debit: ${reason}`,
        reference_type: 'ADMIN',
      },
    });

    return { txn, newBalance };
  });

  secureLogger.info(`[Points] Admin debit: ${points} pts from user ${userId}, reason: ${reason}`);
  return res.json({
    success: true,
    message: `Debited ${points} points from user`,
    transaction: result.txn,
    updatedBalance: result.newBalance,
  });
});

// ─── Admin: POST /api/v1/points/admin/campaign ─────────────────────────────────
const campaignSchema = z.object({
  userIds: z.array(z.string()).min(1),
  points: z.number().int().positive(),
  campaignName: z.string().min(1),
});

pointsRouter.post('/admin/campaign', validate({ body: campaignSchema }), async (req: AuthenticatedRequest, res: Response) => {
  const adminId = req.user?.userId;
  const adminUser = await prisma.user.findUnique({ where: { id: adminId } });
  if (!adminUser || adminUser.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Admin only' });

  const { userIds, points, campaignName } = req.body;
  let successCount = 0;

  for (const uid of userIds) {
    try {
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({ where: { id: uid } });
        if (!user) return;

        const newBalance = Math.min(user.loyalty_points + points, user.points_cap);
        const newLifetime = user.total_lifetime_points + points;

        await tx.user.update({
          where: { id: uid },
          data: {
            loyalty_points: newBalance,
            total_lifetime_points: newLifetime,
            last_activity_at: new Date(),
          },
        });

        await tx.pointsTransaction.create({
          data: {
            id: uuidv4(),
            user_id: uid,
            type: 'ADJUSTMENT',
            amount: points,
            balance_before: user.loyalty_points,
            balance_after: newBalance,
            description: `Campaign: ${campaignName}`,
            reference_type: 'CAMPAIGN',
          },
        });
      });

      await sendPointsNotification(uid, `+${points} Bonus Points!`, `You received ${points} bonus pts — ${campaignName}`);
      successCount++;
    } catch {
      // skip failed users
    }
  }

  secureLogger.info(`[Points] Campaign "${campaignName}": ${successCount}/${userIds.length} users credited ${points} pts`);
  return res.json({ success: true, message: `Campaign applied to ${successCount}/${userIds.length} users`, usersProcessed: successCount });
});

// ─── GET /api/v1/points/admin/users ────────────────────────────────────────────
pointsRouter.get('/admin/users', async (req: AuthenticatedRequest, res: Response) => {
  const adminId = req.user?.userId;
  const adminUser = await prisma.user.findUnique({ where: { id: adminId } });
  if (!adminUser || adminUser.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Admin only' });

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'USER' },
      select: {
        id: true, name: true, email: true, loyalty_points: true, loyalty_tier: true,
        total_lifetime_points: true, is_subscribed: true, last_activity_at: true,
        created_at: true,
      },
      orderBy: { loyalty_points: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where: { role: 'USER' } }),
  ]);

  const enriched = users.map((u) => ({
    ...u,
    tierName: getTierName(u.loyalty_tier),
    pointsToNextTier: Math.max(0, TIER_THRESHOLDS[getTier(u.total_lifetime_points + 1)] - u.total_lifetime_points),
  }));

  secureLogger.info(`[Points] Admin users list: ${enriched.length} users`);
  return res.json({ success: true, users: enriched, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

export default pointsRouter;
