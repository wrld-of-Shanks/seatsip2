import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../db';

const router = Router();

// GET /api/v1/banners
// Returns active banners. Can filter by slider_type (e.g. PROMO, FOOD_PROMO) and cafeId
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slider_type, cafeId } = req.query;

    const where: any = {
      is_active: 1,
    };

    if (slider_type && typeof slider_type === 'string') {
      where.slider_type = slider_type;
    }

    if (cafeId && typeof cafeId === 'string') {
      where.cafe_id = cafeId;
    }

    const banners = await prisma.banner.findMany({
      where,
      orderBy: { sort_order: 'asc' },
    });

    const formatted = banners.map(b => ({
      id: b.id,
      tag: b.tag,
      tagIcon: b.tag_icon || undefined,
      tagColor: b.tag_color,
      accentColor: b.tag_color,
      tagBg: b.tag_bg || undefined,
      title: b.title,
      titleAccent: b.title_accent || undefined,
      subtitle: b.subtitle,
      subtitleColor: b.subtitle_color || undefined,
      ctaText: b.cta_text,
      ctaBg: b.cta_bg,
      ctaText2: b.cta_text_color, // maps to ctaText2
      ctaTextColor: b.cta_text_color, // maps to ctaTextColor
      bgColor: b.bg_color, // maps to bgColor
      bg: b.bg_color, // maps to bg
      overlayColor: b.overlay_color || undefined,
      stripeColor: b.stripe_color || undefined,
      emoji: b.emoji || undefined,
      emojiLabel: b.emoji_label || undefined,
      emojiLabelColor: b.emoji_label_color || undefined,
      badge: b.badge || undefined,
      bgImage: b.bg_image,
      cafeId: b.cafe_id || undefined,
      isActive: b.is_active === 1,
      sortOrder: b.sort_order,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
    }));

    return res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
});

export default router;
