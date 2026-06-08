import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../db';

const router = Router();

// GET /api/v1/menu/items
router.get('/items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cafeId } = req.query;
    if (!cafeId) {
      return res.status(400).json({ success: false, message: 'cafeId is required' });
    }

    const items = await prisma.menuItem.findMany({
      where: { cafe_id: cafeId as string },
      include: {
        category: {
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
    }));

    return res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
});

export default router;
