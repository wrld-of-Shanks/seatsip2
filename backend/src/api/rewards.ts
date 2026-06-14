import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticate } from '../common/auth';
import { AuthenticatedRequest } from '../types/authenticated-request';
import { validate } from '../security/http';

const rewardsRouter = Router();
// Sync trigger for Prisma types
rewardsRouter.use(authenticate);

const TIER_ORDER: Record<string, number> = {
  silver: 1,
  gold: 2,
  platinum: 3,
};

const TIER_THRESHOLDS: Record<string, number> = {
  silver: 0,
  gold: 2000,
  platinum: 4000,
};

function getPointsValue(points: number): number {
  return Math.floor(points / 2); // ₹1 per 2 points
}

function getPointsToNextTier(points: number, currentTier: string): number {
  if (currentTier.toLowerCase() === 'platinum') return 0;
  const nextTier = currentTier.toLowerCase() === 'silver' ? 'gold' : 'platinum';
  const threshold = TIER_THRESHOLDS[nextTier];
  return Math.max(0, threshold - points);
}

// ─── GET /api/v1/rewards ───────────────────────────────────────────────────────
rewardsRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { loyalty_points: true, loyalty_tier: true },
  });

  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const rewards = await prisma.reward.findMany({
    where: { is_active: true },
    orderBy: { points_cost: 'asc' },
  });

  const annotated = rewards.map((r) => {
    const tierRequired = r.tier_required.toLowerCase();
    const userTier = user.loyalty_tier.toLowerCase();
    
    const canAccess = (TIER_ORDER[userTier] || 0) >= (TIER_ORDER[tierRequired] || 0);
    const canRedeem = canAccess && user.loyalty_points >= r.points_cost && (r.stock === -1 || r.stock > 0);
    
    return {
      ...r,
      canAccess,
      canRedeem,
      pointsShortfall: Math.max(0, r.points_cost - user.loyalty_points),
    };
  });

  const grouped = {
    silver: annotated.filter((r) => r.tier_required.toLowerCase() === 'silver'),
    gold: annotated.filter((r) => r.tier_required.toLowerCase() === 'gold'),
    platinum: annotated.filter((r) => r.tier_required.toLowerCase() === 'platinum'),
  };

  res.json({
    success: true,
    user: {
      points: user.loyalty_points,
      tier: user.loyalty_tier,
      pointsValue: getPointsValue(user.loyalty_points),
      pointsToNextTier: getPointsToNextTier(user.loyalty_points, user.loyalty_tier),
    },
    rewards: annotated,
    grouped,
  });
});

// ─── POST /api/v1/rewards/:id/redeem ───────────────────────────────────────────
rewardsRouter.post('/:id/redeem', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  const rewardId = req.params.id;

  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const result = await prisma.$transaction(async (tx) => {
    const reward = await tx.reward.findUnique({
      where: { id: rewardId },
    });

    if (!reward || !reward.is_active) {
      throw new Error('Reward not found');
    }

    const user = await tx.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const tierRequired = reward.tier_required.toLowerCase();
    const userTier = user.loyalty_tier.toLowerCase();

    if ((TIER_ORDER[userTier] || 0) < (TIER_ORDER[tierRequired] || 0)) {
      throw new Error(`This reward requires ${reward.tier_required} tier`);
    }

    if (user.loyalty_points < reward.points_cost) {
      throw new Error('Insufficient points');
    }

    if (reward.stock === 0) {
      throw new Error('Reward out of stock');
    }

    // Deduct points and log redemption
    await tx.user.update({
      where: { id: userId },
      data: {
        loyalty_points: { decrement: reward.points_cost },
      },
    });

    await tx.redeemedReward.create({
      data: {
        id: uuidv4(),
        user_id: userId,
        reward_id: rewardId,
        points_spent: reward.points_cost,
      },
    });

    // Update stock
    await tx.reward.update({
      where: { id: rewardId },
      data: {
        stock: reward.stock > 0 ? { decrement: 1 } : undefined,
        total_redeemed: { increment: 1 },
      },
    });

    const updatedUser = await tx.user.findUnique({
      where: { id: userId },
      select: { loyalty_points: true, loyalty_tier: true },
    });

    return { reward, user: updatedUser };
  });

  res.json({
    success: true,
    message: `🎉 ${result.reward.name} redeemed successfully!`,
    reward: {
      id: result.reward.id,
      name: result.reward.name,
      icon: result.reward.icon,
    },
    updatedBalance: {
      points: result.user?.loyalty_points,
      tier: result.user?.loyalty_tier,
      pointsValue: getPointsValue(result.user?.loyalty_points || 0),
      pointsToNextTier: getPointsToNextTier(result.user?.loyalty_points || 0, result.user?.loyalty_tier || 'silver'),
    },
  });
});

// ─── POST /api/v1/rewards/earn ────────────────────────────────────────────────
const earnActionSchema = z.object({
  action: z.enum(['VISIT', 'REVIEW', 'REFERRAL', 'CHECKIN']),
});

rewardsRouter.post('/earn', validate({ body: earnActionSchema }), async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  const { action } = req.body;

  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const EARN_RULES: Record<string, { points: number; description: string }> = {
    VISIT: { points: 50, description: 'Café visit' },
    REVIEW: { points: 100, description: 'Left a review' },
    REFERRAL: { points: 200, description: 'Referred a friend' },
    CHECKIN: { points: 30, description: 'Checked in' },
  };

  const rule = EARN_RULES[action];

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new Error('User not found');

    const prevTier = user.loyalty_tier.toLowerCase();
    const newPoints = user.loyalty_points + rule.points;
    
    let newTier = prevTier;
    if (newPoints >= TIER_THRESHOLDS.platinum) {
      newTier = 'platinum';
    } else if (newPoints >= TIER_THRESHOLDS.gold) {
      newTier = 'gold';
    } else {
      newTier = 'silver';
    }

    const tierUpgrade = newTier !== prevTier;

    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        loyalty_points: newPoints,
        loyalty_tier: newTier,
      },
    });

    if (tierUpgrade) {
      await tx.loyaltyTierHistory.create({
        data: {
          id: uuidv4(),
          user_id: userId,
          from_tier: prevTier,
          to_tier: newTier,
          points_at: newPoints,
          reason: rule.description,
        },
      });
    }

    return { updatedUser, tierUpgrade };
  });

  res.json({
    success: true,
    message: `+${rule.points} pts — ${rule.description}`,
    pointsEarned: rule.points,
    tierUpgrade: result.tierUpgrade,
    newTier: result.tierUpgrade ? result.updatedUser.loyalty_tier : null,
    updatedBalance: {
      points: result.updatedUser.loyalty_points,
      tier: result.updatedUser.loyalty_tier,
      pointsValue: getPointsValue(result.updatedUser.loyalty_points),
      pointsToNextTier: getPointsToNextTier(result.updatedUser.loyalty_points, result.updatedUser.loyalty_tier),
    },
  });
});

const purchaseTierSchema = z.object({
  tierId: z.enum(['platinum', 'gold', 'silver']),
  amount: z.number().positive(),
  paymentMethod: z.enum(['CARD', 'UPI']),
});

rewardsRouter.post('/purchase-tier', validate({ body: purchaseTierSchema }), async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  const { tierId, amount, paymentMethod } = req.body;

  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const pointsForTier: Record<string, number> = {
    silver: 100,
    gold: 2000,
    platinum: 4000,
  };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) throw new Error('User not found');

      const prevTier = user.loyalty_tier.toLowerCase();
      const newTier = tierId;
      const newPoints = Math.max(user.loyalty_points, pointsForTier[tierId]);

      // 1. Update user tier and points
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          loyalty_tier: newTier,
          loyalty_points: newPoints,
        },
      });

      // 2. Create a tier upgrade history
      await tx.loyaltyTierHistory.create({
        data: {
          id: uuidv4(),
          user_id: userId,
          from_tier: prevTier,
          to_tier: newTier,
          points_at: newPoints,
          reason: `Purchased ${newTier.toUpperCase()} membership via ${paymentMethod}`,
        },
      });

      // 3. Create a mock wallet transaction for the payment visualization
      await tx.walletTransaction.create({
        data: {
          id: uuidv4(),
          user_id: userId,
          type: 'PURCHASE',
          amount: amount,
          description: `${newTier.toUpperCase()} Membership Purchase (${paymentMethod})`,
          balance_after: Number(user.wallet_balance),
        },
      });

      return updatedUser;
    });

    return res.json({
      success: true,
      message: `Successfully purchased ${tierId.toUpperCase()} membership!`,
      user: {
        points: result.loyalty_points,
        tier: result.loyalty_tier,
        pointsValue: getPointsValue(result.loyalty_points),
        pointsToNextTier: getPointsToNextTier(result.loyalty_points, result.loyalty_tier),
      },
    });
  } catch (error: any) {
    console.error('Failed to purchase tier:', error);
    return res.status(500).json({ success: false, message: error.message || 'Payment processing failed' });
  }
});

export default rewardsRouter;
