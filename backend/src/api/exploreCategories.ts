import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../db';

const router = Router();

// GET /api/v1/explore-categories
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.exploreCategory.findMany({
      orderBy: { sort_order: 'asc' },
    });

    const formatted = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      tag: cat.tag,
      tagColor: cat.tag_color,
      tagBg: cat.tag_bg,
      imageUrl: cat.image_url,
      sortOrder: cat.sort_order,
      createdAt: cat.created_at,
      updatedAt: cat.updated_at,
    }));

    return res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
});

export default router;
