import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../db';

const router = Router();

// GET /api/v1/menu/items
router.get('/items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cafeId, exploreCategory } = req.query;
    if (!cafeId && !exploreCategory) {
      return res.status(400).json({ success: false, message: 'cafeId or exploreCategory is required' });
    }

    const where: any = {};
    if (cafeId) {
      where.cafe_id = cafeId as string;
    }
    if (exploreCategory) {
      where.explore_category = exploreCategory as string;
    }

    const items = await prisma.menuItem.findMany({
      where,
      include: {
        category: {
          select: { name: true }
        },
        cafe: {
          select: { name: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    const formatted = items.map(item => ({
      ...item,
      category: item.category?.name || 'Bespoke',
      imageUrl: item.image_url,
      isAvailable: item.is_available === 1,
      isVeg: item.is_veg === 1,
      isPopular: item.is_popular === 1,
      price: item.price * 100, // Convert to subunits (cents) for the Next.js web admin
      caffeine: item.caffeine,
      tags: item.tags ? (typeof item.tags === 'string' ? JSON.parse(item.tags) : item.tags) : [],
      exploreCategory: item.explore_category || undefined,
      cafeName: item.cafe?.name,
    }));

    return res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
});

export default router;
