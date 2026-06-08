import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { env } from '../security/env';
import { authenticate } from '../common/auth';
import { AuthenticatedRequest } from '../types/authenticated-request';

const router = Router();

const DEFAULT_SLOT_MINUTES = 90;

function timeToMinutes(t: string): number {
  const parts = String(t || '')
    .trim()
    .split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
  return h * 60 + m;
}

function rangesOverlap(aStart: number, aDur: number, bStart: number, bDur: number): boolean {
  const aEnd = aStart + aDur;
  const bEnd = bStart + bDur;
  return aStart < bEnd && bStart < aEnd;
}

function cafeWhereByIdOrSlug(idOrSlug: string): Prisma.CafeWhereInput {
  return {
    is_active: 1,
    OR: [{ id: idOrSlug }, { slug: idOrSlug }],
  };
}

// GET /cafes - list cafes with filters
router.get('/', async (req: Request, res: Response) => {
  const { city, mood, search, sort = 'rating', limit = '20', offset = '0' } = req.query as Record<string, string>;

  const where: Prisma.CafeWhereInput = { is_active: 1 };
  if (city) where.city = { contains: city };
  if (mood) where.moods = { contains: mood };
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
      { address: { contains: search } },
    ];
  }

  const orderBy: Prisma.CafeOrderByWithRelationInput =
    sort === 'name' ? { name: 'asc' } : sort === 'price' ? { price_level: 'asc' } : { rating: 'desc' };

  const take = parseInt(limit, 10);
  const skip = parseInt(offset, 10);

  const [cafes, total] = await Promise.all([
    prisma.cafe.findMany({ where, orderBy, take, skip }),
    prisma.cafe.count({ where }),
  ]);

  return res.json({ success: true, data: cafes, meta: { total, limit: take, offset: skip } });
});

// GET /cafes/popular-items - list popular items from all cafes
router.get('/popular-items', async (req: Request, res: Response) => {
  const { limit = '20' } = req.query as Record<string, string>;

  const items = await prisma.menuItem.findMany({
    where: { 
      is_popular: 1,
      is_available: 1,
      cafe: { is_active: 1 }
    },
    include: {
      cafe: { select: { name: true, id: true } }
    },
    take: parseInt(limit, 10),
    orderBy: { created_at: 'desc' },
  });

  const formattedItems = items.map(item => ({
    ...item,
    cafe_name: item.cafe.name,
    cafe_id: item.cafe.id,
    prep_time: item.prep_time_minutes ? `${item.prep_time_minutes} min` : '10 min',
    tags: item.tags ? (typeof item.tags === 'string' ? JSON.parse(item.tags) : item.tags) : [],
  }));

  return res.json({ success: true, data: formattedItems });
});

// GET /cafes/filters/categories — get home screen category filter labels
router.get('/filters/categories', async (req: Request, res: Response) => {
  try {
    const setting = await prisma.systemSetting.findFirst({
      where: { key: 'home_categories' }
    });
    
    const defaultCategories = [
      { label: 'All' },
      { label: 'Beverages' },
      { label: 'Food' },
      { label: 'Dietary' },
      { label: 'Work' },
      { label: 'Social' },
      { label: 'Outdoor' }
    ];

    if (!setting) {
      return res.json({ success: true, data: defaultCategories });
    }

    try {
      const parsed = JSON.parse(setting.value);
      return res.json({ success: true, data: Array.isArray(parsed) ? parsed : defaultCategories });
    } catch {
      return res.json({ success: true, data: defaultCategories });
    }
  } catch (error) {
    return res.json({ success: true, data: [
      { label: 'All' },
      { label: 'Beverages' },
      { label: 'Food' },
      { label: 'Dietary' },
      { label: 'Work' },
      { label: 'Social' },
      { label: 'Outdoor' }
    ]});
  }
});

// GET /cafes/:id
router.get('/:id', async (req: Request, res: Response) => {
  const cafe = await prisma.cafe.findFirst({
    where: cafeWhereByIdOrSlug(req.params.id),
    include: {
      menu_items: {
        where: { is_available: 1 },
        orderBy: [{ is_popular: 'desc' }, { name: 'asc' }],
        include: {
          category: {
            select: { name: true }
          }
        }
      },
    },
  });
  if (!cafe) return res.status(404).json({ success: false, message: 'Cafe not found' });

  const [tables, categories] = await Promise.all([
    prisma.table.findMany({ where: { cafe_id: cafe.id } }),
    prisma.menuCategory.findMany({
      where: { cafe_id: cafe.id, is_active: 1 },
      orderBy: { sort_order: 'asc' },
    }),
  ]);

  const formattedMenuItems = cafe.menu_items.map(item => ({
    ...item,
    category: item.category?.name || null,
    prep_time: item.prep_time_minutes ? `${item.prep_time_minutes} min` : '10 min',
    tags: item.tags ? (typeof item.tags === 'string' ? JSON.parse(item.tags) : item.tags) : [],
  }));

  return res.json({ success: true, data: { ...cafe, menu_items: formattedMenuItems, tables, categories } });
});

// GET /cafes/:id/menu
router.get('/:id/menu', async (req: Request, res: Response) => {
  const cafe = await prisma.cafe.findFirst({
    where: cafeWhereByIdOrSlug(req.params.id),
    select: { id: true },
  });
  if (!cafe) return res.status(404).json({ success: false, message: 'Cafe not found' });

  const [categories, items] = await Promise.all([
    prisma.menuCategory.findMany({
      where: { cafe_id: cafe.id, is_active: 1 },
      orderBy: { sort_order: 'asc' },
    }),
    prisma.menuItem.findMany({
      where: { cafe_id: cafe.id, is_available: 1 },
      orderBy: [{ is_popular: 'desc' }, { name: 'asc' }],
    }),
  ]);

  const menu = categories.map((cat) => ({
    ...cat,
    items: items
      .filter((i) => i.category_id === cat.id)
      .map(item => {
        let sizes = [];
        try {
          const customizationsParsed = JSON.parse(item.customizations || '[]');
          const sizesFound = customizationsParsed.find((c: any) => c.type === 'size');
          if (sizesFound && Array.isArray(sizesFound.options)) {
            sizes = sizesFound.options.map((opt: any) => ({
              name: opt.name,
              volume: opt.volume,
              unit: opt.unit || 'ml',
              priceModifier: opt.priceModifier || 0
            }));
          }
        } catch (e) {
          sizes = [
            { name: "Small", volume: 237, unit: "ml", priceModifier: -30 },
            { name: "Regular", volume: 355, unit: "ml", priceModifier: 0 },
            { name: "Large", volume: 473, unit: "ml", priceModifier: 50 }
          ];
        }

        if (sizes.length === 0) {
          sizes = [
            { name: "Small", volume: 237, unit: "ml", priceModifier: -30 },
            { name: "Regular", volume: 355, unit: "ml", priceModifier: 0 },
            { name: "Large", volume: 473, unit: "ml", priceModifier: 50 }
          ];
        }

        return {
          ...item,
          sizes,
          prep_time: item.prep_time_minutes ? `${item.prep_time_minutes} min` : '10 min',
          tags: item.tags ? (typeof item.tags === 'string' ? JSON.parse(item.tags) : item.tags) : [],
        };
      }),
  }));

  return res.json({ success: true, data: menu });
});

// GET /cafes/:id/payment-config — UPI / display name for checkout (public; no secrets)
router.get('/:id/payment-config', async (req: Request, res: Response) => {
  const cafe = await prisma.cafe.findFirst({
    where: cafeWhereByIdOrSlug(req.params.id),
    select: { id: true, name: true, upi_id: true },
  });
  if (!cafe) return res.status(404).json({ success: false, message: 'Cafe not found' });
  const defaultUpi = env('DEFAULT_MERCHANT_UPI') || 'seatsip@upi';
  const upiId = (cafe.upi_id && String(cafe.upi_id).trim()) || defaultUpi;
  return res.json({
    success: true,
    data: {
      upiId,
      merchantName: cafe.name || 'SeatSip',
    },
  });
});

// GET /cafes/:id/tables
router.get('/:id/tables', async (req: Request, res: Response) => {
  const { date, time, party_size } = req.query as Record<string, string>;

  const cafe = await prisma.cafe.findFirst({
    where: { OR: [{ id: req.params.id }, { slug: req.params.id }] },
    select: { id: true },
  });
  if (!cafe) return res.status(404).json({ success: false, message: 'Cafe not found' });

  let tables = await prisma.table.findMany({ where: { cafe_id: cafe.id } });

  if (date && time) {
    const slotStart = timeToMinutes(time);
    const reservations = await prisma.reservation.findMany({
      where: {
        cafe_id: cafe.id,
        date,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        table_id: { not: null },
      },
      select: { table_id: true, time: true, duration_minutes: true },
    });

    const bookedTableIds = new Set<string>();
    if (!Number.isNaN(slotStart)) {
      for (const r of reservations) {
        if (!r.table_id) continue;
        const rStart = timeToMinutes(r.time);
        if (Number.isNaN(rStart)) continue;
        const rDur = r.duration_minutes ?? DEFAULT_SLOT_MINUTES;
        if (rangesOverlap(slotStart, DEFAULT_SLOT_MINUTES, rStart, rDur)) {
          bookedTableIds.add(r.table_id);
        }
      }
    }

    tables = tables.map((t) => ({
      ...t,
      is_available: !bookedTableIds.has(t.id) ? 1 : 0,
    }));
  }

  if (party_size) {
    const ps = parseInt(party_size, 10);
    tables = tables.filter((t) => t.capacity >= ps);
  }

  const floors = [...new Set(tables.map((t) => t.floor))];
  return res.json({ success: true, data: { floors, tables } });
});

// GET /cafes/:id/reviews
router.get('/:id/reviews', async (req: Request, res: Response) => {
  const { limit = '10', offset = '0' } = req.query as Record<string, string>;

  const cafe = await prisma.cafe.findFirst({
    where: { OR: [{ id: req.params.id }, { slug: req.params.id }] },
    select: { id: true },
  });
  if (!cafe) return res.status(404).json({ success: false, message: 'Cafe not found' });

  const reviews = await prisma.review.findMany({
    where: { cafe_id: cafe.id },
    include: { user: { select: { name: true, avatar: true } } },
    orderBy: { created_at: 'desc' },
    take: parseInt(limit, 10),
    skip: parseInt(offset, 10),
  });

  const data = reviews.map(({ user: u, ...r }) => ({
    ...r,
    user_name: u.name,
    user_avatar: u.avatar,
  }));

  return res.json({ success: true, data });
});

// POST /cafes/:id/reviews
router.post('/:id/reviews', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { rating, comment } = req.body as { rating?: number; comment?: string };
  if (!rating) return res.status(400).json({ success: false, message: 'Rating required' });

  const cafe = await prisma.cafe.findFirst({
    where: { OR: [{ id: req.params.id }, { slug: req.params.id }] },
    select: { id: true },
  });
  if (!cafe) return res.status(404).json({ success: false, message: 'Cafe not found' });

  const existing = await prisma.review.findFirst({
    where: { user_id: req.user.userId, cafe_id: cafe.id },
  });
  if (existing) return res.status(409).json({ success: false, message: 'You have already reviewed this cafe' });

  const id = uuidv4();
  await prisma.review.create({
    data: {
      id,
      user_id: req.user.userId,
      cafe_id: cafe.id,
      rating: Number(rating),
      comment: comment || null,
    },
  });

  const agg = await prisma.review.aggregate({
    where: { cafe_id: cafe.id },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.cafe.update({
    where: { id: cafe.id },
    data: {
      rating: Math.round((agg._avg.rating || 0) * 10) / 10,
      review_count: agg._count.rating,
    },
  });

  return res.status(201).json({ success: true, data: { id } });
});

// POST /cafes/:id/images - add an image to cafe gallery
router.post('/:id/images', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { imageUrl } = req.body as { imageUrl?: string };
  if (!imageUrl) return res.status(400).json({ success: false, message: 'Image URL required' });

  const cafe = await prisma.cafe.findFirst({
    where: { OR: [{ id: req.params.id }, { slug: req.params.id }] },
  });
  if (!cafe) return res.status(404).json({ success: false, message: 'Cafe not found' });

  let images: string[] = [];
  try {
    images = JSON.parse(cafe.images || '[]');
  } catch {
    images = [];
  }
  if (!Array.isArray(images)) images = [];

  images.push(imageUrl);

  await prisma.cafe.update({
    where: { id: cafe.id },
    data: { images: JSON.stringify(images) },
  });

  return res.json({ success: true, data: images });
});

export default router;
