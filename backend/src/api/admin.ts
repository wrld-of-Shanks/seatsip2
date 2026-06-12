import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db';
import { authenticate, requireRole } from '../common/auth';
import { AuthenticatedRequest } from '../types/authenticated-request';
import { audit } from '../security/http';

const router = Router();

// Apply authentication to all admin/manager routes
router.use(authenticate);

const adminOnly = requireRole('ADMIN');
const managerOnly = requireRole('ADMIN', 'CAFE_OWNER');
const requireAdmin = adminOnly;
const requireAdminOrOwner = managerOnly;

const tryParse = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const mapCafe = (cafe: any) => ({
  ...cafe,
  imageUrl: cafe.image_url,
  isActive: cafe.is_active === 1,
  isOpen: cafe.is_open === 1,
  reviewCount: cafe.review_count,
  coverColor: cafe.cover_color,
  tags: tryParse(cafe.tags, []),
  moods: tryParse(cafe.moods, []),
  images: tryParse(cafe.images, []),
  reservation_slots: tryParse(cafe.reservation_slots, []),
});

/**
 * @route GET /api/v1/admin/stats
 * @description Get dashboard stats
 * @access Admin/Cafe Owner
 */
router.get('/stats', managerOnly, audit('ADMIN_STATS', 'admin'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where: any = {};
    if (req.user.role === 'CAFE_OWNER') {
      where.owner_id = req.user.userId;
    }

    const cafeIds = (await prisma.cafe.findMany({ where, select: { id: true } })).map(c => c.id);

    const [totalCafes, totalOrders, todayRevenue, activeReservations, newUsers] = await Promise.all([
      prisma.cafe.count({ where: { id: { in: cafeIds }, is_active: 1 } }),
      prisma.order.count({ where: { cafe_id: { in: cafeIds } } }),
      prisma.order.aggregate({
        where: {
          cafe_id: { in: cafeIds },
          payment_status: 'PAID',
          created_at: { gte: today, lt: tomorrow },
        },
        _sum: { total: true },
      }),
      prisma.reservation.count({
        where: {
          cafe_id: { in: cafeIds },
          date: today.toISOString().split('T')[0],
          status: 'CONFIRMED',
        },
      }),
      prisma.user.count({
        where: {
          created_at: { gte: today, lt: tomorrow },
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalCafes,
        totalOrders,
        todayRevenue: todayRevenue._sum.total || 0,
        activeReservations,
        newUsers,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/admin/revenue
 * @description Get revenue chart data
 * @access Admin/Cafe Owner
 */
router.get('/revenue', managerOnly, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const where: any = {};
    if (req.user.role === 'CAFE_OWNER') {
      where.owner_id = req.user.userId;
    }
    const cafeIds = (await prisma.cafe.findMany({ where, select: { id: true } })).map(c => c.id);

    const orders = await prisma.order.findMany({
      where: {
        cafe_id: { in: cafeIds },
        payment_status: 'PAID',
        created_at: { gte: startDate },
      },
      select: {
        created_at: true,
        total: true,
      },
      orderBy: { created_at: 'asc' },
    });

    const revenueByDate: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      revenueByDate[dateStr] = 0;
    }

    for (const order of orders) {
      const dateStr = order.created_at.toISOString().split('T')[0];
      if (revenueByDate.hasOwnProperty(dateStr)) {
        revenueByDate[dateStr] += order.total;
      }
    }

    const data = Object.entries(revenueByDate).map(([date, amount]) => ({
      date,
      amount,
    }));

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/admin/cafes
 * @description List all cafes (filtered for owners)
 * @access Admin/Cafe Owner
 */
router.get('/cafes', managerOnly, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (req.user.role === 'CAFE_OWNER') {
      where.owner_id = req.user.userId;
    }

    const [cafes, total] = await Promise.all([
      prisma.cafe.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              tables: true,
              orders: true,
              reservations: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.cafe.count({ where }),
    ]);

    const mappedCafes = cafes.map((cafe) => ({
      ...cafe,
      imageUrl: cafe.image_url,
      isActive: cafe.is_active === 1,
      isOpen: cafe.is_open === 1,
      reviewCount: cafe.review_count,
      coverColor: cafe.cover_color,
      tags: cafe.tags ? (typeof cafe.tags === 'string' ? JSON.parse(cafe.tags) : cafe.tags) : [],
      moods: cafe.moods ? (typeof cafe.moods === 'string' ? JSON.parse(cafe.moods) : cafe.moods) : [],
      images: cafe.images ? (typeof cafe.images === 'string' ? JSON.parse(cafe.images) : cafe.images) : [],
    }));

    return res.status(200).json({
      success: true,
      data: mappedCafes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/admin/cafes
 * @description Create new cafe
 * @access Admin/Cafe Owner
 */
router.post('/cafes', managerOnly, audit('CREATE_CAFE', 'cafe'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      slug,
      description,
      address,
      city,
      latitude,
      lat,
      longitude,
      lng,
      phone,
      email,
      ownerId,
      imageUrl,
      image_url,
      openingHours,
      wifi,
      parking,
      pet_friendly,
      price_level,
      prep_time_minutes,
      delivery_fee,
      min_order,
      upi_id,
      isOpen,
      is_open,
      tags,
      moods,
      images,
      galleryImages,
      emoji,
      coverColor,
      discount,
      reservationSlots,
      reservation_slots,
    } = req.body;

    const generatedSlug = slug || name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    const finalOwnerId = req.user.role === 'CAFE_OWNER' ? req.user.userId : (ownerId || null);

    const finalLat = latitude !== undefined ? parseFloat(latitude as string) : (lat !== undefined ? parseFloat(lat as string) : 19.0760);
    const finalLng = longitude !== undefined ? parseFloat(longitude as string) : (lng !== undefined ? parseFloat(lng as string) : 72.8777);
    const finalImageUrl = imageUrl || image_url || null;

    let openTime = '08:00';
    let closeTime = '22:00';
    if (openingHours && typeof openingHours === 'string') {
      const parts = openingHours.split('-');
      if (parts.length === 2) {
        openTime = parts[0].trim();
        closeTime = parts[1].trim();
      }
    }

    const parseStringList = (val: any) => {
      if (!val) return '[]';
      if (Array.isArray(val)) return JSON.stringify(val);
      if (typeof val === 'string') {
        const separator = val.includes('\n') ? '\n' : ',';
        return JSON.stringify(val.split(separator).map(t => t.trim()).filter(Boolean));
      }
      return '[]';
    };

    const finalIsOpen = isOpen !== undefined ? (isOpen ? 1 : 0) : (is_open !== undefined ? (is_open ? 1 : 0) : 1);
    const finalTags = parseStringList(tags);
    const finalMoods = parseStringList(moods);
    const finalImages = parseStringList(images || galleryImages);
    const finalSlots = parseStringList(reservationSlots || reservation_slots || '["09:00","11:00","13:00","15:00","17:00","19:00"]');

    const cafe = await prisma.cafe.create({
      data: {
        id: uuidv4(),
        name,
        slug: generatedSlug,
        description: description || null,
        address,
        city: city || 'Mumbai',
        latitude: finalLat,
        longitude: finalLng,
        phone: phone || null,
        email: email || null,
        owner_id: finalOwnerId,
        image_url: finalImageUrl,
        open_time: openTime,
        close_time: closeTime,
        is_active: 1,
        wifi: wifi !== undefined ? (wifi ? 1 : 0) : 1,
        parking: parking !== undefined ? (parking ? 1 : 0) : 0,
        pet_friendly: pet_friendly !== undefined ? (pet_friendly ? 1 : 0) : 0,
        price_level: price_level !== undefined ? parseInt(price_level as string) : 2,
        prep_time_minutes: prep_time_minutes !== undefined ? parseInt(prep_time_minutes as string) : 15,
        delivery_fee: delivery_fee !== undefined ? parseFloat(delivery_fee as string) : 0,
        min_order: min_order !== undefined ? parseFloat(min_order as string) : 0,
        upi_id: upi_id || null,
        is_open: finalIsOpen,
        tags: finalTags,
        moods: finalMoods,
        images: finalImages,
        emoji: emoji || null,
        cover_color: coverColor || null,
        discount: discount || null,
        reservation_slots: finalSlots,
      },
    });

    const mappedCafe = {
      ...cafe,
      imageUrl: cafe.image_url,
      isActive: cafe.is_active === 1,
      isOpen: cafe.is_open === 1,
      reviewCount: cafe.review_count,
      coverColor: cafe.cover_color,
      tags: cafe.tags ? (typeof cafe.tags === 'string' ? JSON.parse(cafe.tags) : cafe.tags) : [],
      moods: cafe.moods ? (typeof cafe.moods === 'string' ? JSON.parse(cafe.moods) : cafe.moods) : [],
      images: cafe.images ? (typeof cafe.images === 'string' ? JSON.parse(cafe.images) : cafe.images) : [],
      reservation_slots: cafe.reservation_slots ? (typeof cafe.reservation_slots === 'string' ? JSON.parse(cafe.reservation_slots) : cafe.reservation_slots) : [],
    };

    return res.status(201).json({
      success: true,
      data: mappedCafe,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PATCH /api/v1/admin/cafes/:id
 * @description Update cafe
 * @access Admin/Cafe Owner
 */
router.patch('/cafes/:id', managerOnly, audit('UPDATE_CAFE', 'cafe'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Ownership check
    if (req.user.role === 'CAFE_OWNER') {
      const cafe = await prisma.cafe.findFirst({
        where: { id, owner_id: req.user.userId }
      });
      if (!cafe) return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const {
      is_active,
      isActive,
      wifi,
      parking,
      pet_friendly,
      petFriendly,
      price_level,
      priceLevel,
      prep_time_minutes,
      prepTimeMinutes,
      delivery_fee,
      deliveryFee,
      min_order,
      minOrder,
      total_seats,
      totalSeats,
      latitude,
      lat,
      longitude,
      lng,
      imageUrl,
      image_url,
      openingHours,
      state,
      pincode,
      isOpen,
      is_open,
      tags,
      moods,
      images,
      galleryImages,
      emoji,
      coverColor,
      discount,
      upi_id,
      upiId,
      owner_id,
      ownerId,
      owner,
      rating,
      review_count,
      reviewCount,
      reservationSlots,
      reservation_slots,
      ...rest
    } = req.body;
    
    // Map fields and handle conversions
    const updateData: any = { ...rest };
    if (is_active !== undefined) updateData.is_active = is_active ? 1 : 0;
    if (isActive !== undefined) updateData.is_active = isActive ? 1 : 0;
    if (wifi !== undefined) updateData.wifi = wifi ? 1 : 0;
    if (parking !== undefined) updateData.parking = parking ? 1 : 0;
    
    if (pet_friendly !== undefined) updateData.pet_friendly = pet_friendly ? 1 : 0;
    else if (petFriendly !== undefined) updateData.pet_friendly = petFriendly ? 1 : 0;

    if (price_level !== undefined) updateData.price_level = parseInt(price_level as string);
    else if (priceLevel !== undefined) updateData.price_level = parseInt(priceLevel as string);

    if (prep_time_minutes !== undefined) updateData.prep_time_minutes = parseInt(prep_time_minutes as string);
    else if (prepTimeMinutes !== undefined) updateData.prep_time_minutes = parseInt(prepTimeMinutes as string);

    if (delivery_fee !== undefined) updateData.delivery_fee = parseFloat(delivery_fee as string);
    else if (deliveryFee !== undefined) updateData.delivery_fee = parseFloat(deliveryFee as string);

    if (min_order !== undefined) updateData.min_order = parseFloat(min_order as string);
    else if (minOrder !== undefined) updateData.min_order = parseFloat(minOrder as string);

    if (total_seats !== undefined) updateData.total_seats = parseInt(total_seats as string);
    else if (totalSeats !== undefined) updateData.total_seats = parseInt(totalSeats as string);

    if (upi_id !== undefined) updateData.upi_id = upi_id || null;
    else if (upiId !== undefined) updateData.upi_id = upiId || null;

    if (rating !== undefined) updateData.rating = parseFloat(rating as string);

    if (req.user.role === 'ADMIN') {
      if (owner_id !== undefined) updateData.owner_id = owner_id || null;
      else if (ownerId !== undefined) updateData.owner_id = ownerId || null;
    }
    
    if (latitude !== undefined) updateData.latitude = parseFloat(latitude as string);
    else if (lat !== undefined) updateData.latitude = parseFloat(lat as string);

    if (longitude !== undefined) updateData.longitude = parseFloat(longitude as string);
    else if (lng !== undefined) updateData.longitude = parseFloat(lng as string);

    if (imageUrl !== undefined) updateData.image_url = imageUrl;
    else if (image_url !== undefined) updateData.image_url = image_url;

    if (openingHours !== undefined && typeof openingHours === 'string') {
      const parts = openingHours.split('-');
      if (parts.length === 2) {
        updateData.open_time = parts[0].trim();
        updateData.close_time = parts[1].trim();
      }
    }

    const parseStringList = (val: any) => {
      if (!val) return '[]';
      if (Array.isArray(val)) return JSON.stringify(val);
      if (typeof val === 'string') {
        const separator = val.includes('\n') ? '\n' : ',';
        return JSON.stringify(val.split(separator).map(t => t.trim()).filter(Boolean));
      }
      return '[]';
    };

    if (is_open !== undefined) updateData.is_open = is_open ? 1 : 0;
    if (isOpen !== undefined) updateData.is_open = isOpen ? 1 : 0;
    if (tags !== undefined) updateData.tags = parseStringList(tags);
    if (moods !== undefined) updateData.moods = parseStringList(moods);
    if (images !== undefined) updateData.images = parseStringList(images);
    else if (galleryImages !== undefined) updateData.images = parseStringList(galleryImages);
    if (reservationSlots !== undefined) updateData.reservation_slots = parseStringList(reservationSlots);
    else if (reservation_slots !== undefined) updateData.reservation_slots = parseStringList(reservation_slots);

    if (emoji !== undefined) updateData.emoji = emoji || null;
    if (coverColor !== undefined) updateData.cover_color = coverColor || null;
    if (discount !== undefined) updateData.discount = discount || null;

    const cafe = await prisma.cafe.update({
      where: { id },
      data: updateData,
    });

    const mappedCafe = {
      ...cafe,
      imageUrl: cafe.image_url,
      isActive: cafe.is_active === 1,
      isOpen: cafe.is_open === 1,
      reviewCount: cafe.review_count,
      coverColor: cafe.cover_color,
      tags: cafe.tags ? (typeof cafe.tags === 'string' ? JSON.parse(cafe.tags) : cafe.tags) : [],
      moods: cafe.moods ? (typeof cafe.moods === 'string' ? JSON.parse(cafe.moods) : cafe.moods) : [],
      images: cafe.images ? (typeof cafe.images === 'string' ? JSON.parse(cafe.images) : cafe.images) : [],
      reservation_slots: cafe.reservation_slots ? (typeof cafe.reservation_slots === 'string' ? JSON.parse(cafe.reservation_slots) : cafe.reservation_slots) : [],
    };

    return res.status(200).json({
      success: true,
      data: mappedCafe,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/v1/admin/cafes/:id
 * @description Delete cafe
 * @access Admin/Cafe Owner
 */
router.delete('/cafes/:id', managerOnly, audit('DELETE_CAFE', 'cafe'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Ownership check
    if (req.user.role === 'CAFE_OWNER') {
      const cafe = await prisma.cafe.findFirst({
        where: { id, owner_id: req.user.userId }
      });
      if (!cafe) return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Delete all dependent relations first to avoid foreign key constraint violations
    await prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({ where: { cafe_id: id } });
      await tx.review.deleteMany({ where: { cafe_id: id } });
      await tx.reservation.deleteMany({ where: { cafe_id: id } });
      await tx.order.deleteMany({ where: { cafe_id: id } });
      await tx.cafe.delete({ where: { id } });
    });

    return res.status(200).json({
      success: true,
      message: 'Cafe deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

async function enrichTablesWithStatus(tables: any[], dateParam?: string) {
  if (tables.length === 0) return [];

  // Get date in YYYY-MM-DD format (accounting for timezone)
  let targetDate = dateParam;
  if (!targetDate) {
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    targetDate = new Date(Date.now() - tzOffset).toISOString().split('T')[0];
  }

  const tableIds = tables.map((t) => t.id);

  // Fetch all reservations for these tables on targetDate
  const reservations = await prisma.reservation.findMany({
    where: {
      table_id: { in: tableIds },
      date: targetDate,
      status: { in: ['CONFIRMED', 'SEATED'] },
    },
    select: {
      table_id: true,
      status: true,
    },
  });

  const reservationMap = new Map<string, string>();
  for (const res of reservations) {
    if (res.table_id) {
      const existing = reservationMap.get(res.table_id);
      // 'SEATED' has higher priority as it represents table currently occupied by guests
      if (existing !== 'SEATED') {
        reservationMap.set(res.table_id, res.status);
      }
    }
  }

  return tables.map((t) => {
    let status = t.is_available === 1 ? 'AVAILABLE' : 'OCCUPIED';
    if (t.is_available === 1) {
      const resStatus = reservationMap.get(t.id);
      if (resStatus === 'SEATED') {
        status = 'OCCUPIED';
      } else if (resStatus === 'CONFIRMED') {
        status = 'RESERVED';
      }
    }
    return {
      ...t,
      tableNumber: t.table_number,
      section: t.floor,
      status,
    };
  });
}

/**
 * @route GET /api/v1/admin/tables
 * @description List all tables
 * @access Admin/Cafe Owner
 */
router.get('/tables', managerOnly, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { cafeId, date } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (cafeId) {
      where.cafe_id = cafeId as string;
    }

    // Ownership check for CAFE_OWNER
    if (req.user.role === 'CAFE_OWNER') {
      where.cafe = { owner_id: req.user.userId };
    }

    const [tables, total] = await Promise.all([
      prisma.table.findMany({
        where,
        include: {
          cafe: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.table.count({ where }),
    ]);

    const mappedTables = await enrichTablesWithStatus(tables, date as string | undefined);

    return res.status(200).json({
      success: true,
      data: mappedTables,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/admin/cafes/:cafeId/tables
 * @description List all tables for a specific cafe
 * @access Admin/Cafe Owner
 */
router.get('/cafes/:cafeId/tables', managerOnly, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const cafeId = req.params.cafeId as string;
    const { date } = req.query;

    // Ownership check
    if (req.user.role === 'CAFE_OWNER') {
      const cafe = await prisma.cafe.findFirst({
        where: { id: cafeId, owner_id: req.user.userId }
      });
      if (!cafe) return res.status(403).json({ success: false, message: 'You do not own this cafe' });
    }

    const tables = await prisma.table.findMany({
      where: { cafe_id: cafeId },
      orderBy: { table_number: 'asc' }
    });

    const mappedTables = await enrichTablesWithStatus(tables, date as string | undefined);

    return res.status(200).json({ success: true, data: mappedTables });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/admin/cafes/:cafeId/tables
 * @description Create new table for a cafe
 */
router.post('/cafes/:cafeId/tables', managerOnly, audit('CREATE_TABLE', 'table'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const cafeId = req.params.cafeId as string;
    const { tableNumber, table_number, capacity, posX, posY, floor, section, status } = req.body;

    // Ownership check
    if (req.user.role === 'CAFE_OWNER') {
      const cafe = await prisma.cafe.findFirst({
        where: { id: cafeId, owner_id: req.user.userId }
      });
      if (!cafe) return res.status(403).json({ success: false, message: 'You do not own this cafe' });
    }

    const finalTableNumber = tableNumber || table_number;
    const finalFloor = section || floor || 'Ground';
    const finalIsAvailable = status !== undefined ? (status === 'AVAILABLE' ? 1 : 0) : 1;

    const table = await prisma.table.create({
      data: {
        id: uuidv4(),
        cafe_id: cafeId,
        table_number: String(finalTableNumber),
        capacity: parseInt(capacity) || 2,
        position_x: posX ? parseFloat(posX as string) : 0,
        position_y: posY ? parseFloat(posY as string) : 0,
        floor: finalFloor,
        is_available: finalIsAvailable,
      },
    });

    const mappedTable = {
      ...table,
      tableNumber: table.table_number,
      section: table.floor,
      status: table.is_available === 1 ? 'AVAILABLE' : 'OCCUPIED',
    };

    return res.status(201).json({ success: true, data: mappedTable });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/admin/tables
 * @description Create new table
 * @access Admin/Cafe Owner
 */
router.post('/tables', managerOnly, audit('CREATE_TABLE', 'table'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { cafeId, tableNumber, table_number, capacity, posX, posY, floor, section, status } = req.body;

    // Ownership check
    if (req.user.role === 'CAFE_OWNER') {
      const cafe = await prisma.cafe.findFirst({
        where: { id: cafeId, owner_id: req.user.userId }
      });
      if (!cafe) return res.status(403).json({ success: false, message: 'You do not own this cafe' });
    }

    const finalTableNumber = tableNumber || table_number;
    const finalFloor = section || floor || 'Ground';
    const finalIsAvailable = status !== undefined ? (status === 'AVAILABLE' ? 1 : 0) : 1;

    const table = await prisma.table.create({
      data: {
        id: uuidv4(),
        cafe_id: cafeId,
        table_number: String(finalTableNumber),
        capacity: parseInt(capacity) || 2,
        position_x: posX ? parseFloat(posX as string) : 0,
        position_y: posY ? parseFloat(posY as string) : 0,
        floor: finalFloor,
        is_available: finalIsAvailable,
      },
    });

    const mappedTable = {
      ...table,
      tableNumber: table.table_number,
      section: table.floor,
      status: table.is_available === 1 ? 'AVAILABLE' : 'OCCUPIED',
    };

    return res.status(201).json({
      success: true,
      data: mappedTable,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PATCH /api/v1/admin/tables/:id
 * @description Update table
 * @access Admin/Cafe Owner
 */
router.patch('/tables/:id', managerOnly, audit('UPDATE_TABLE', 'table'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    // Ownership check
    if (req.user.role === 'CAFE_OWNER') {
      const table = await prisma.table.findFirst({
        where: { id, cafe: { owner_id: req.user.userId } }
      });
      if (!table) return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { is_available, status, capacity, posX, posY, tableNumber, table_number, floor, section, ...rest } = req.body;

    const updateData: any = { ...rest };
    if (is_available !== undefined) updateData.is_available = is_available ? 1 : 0;
    if (status !== undefined) updateData.is_available = status === 'AVAILABLE' ? 1 : 0;
    if (capacity !== undefined) updateData.capacity = parseInt(capacity as string);
    if (posX !== undefined) updateData.position_x = parseFloat(posX as string);
    if (posY !== undefined) updateData.position_y = parseFloat(posY as string);
    
    if (tableNumber !== undefined) updateData.table_number = String(tableNumber);
    else if (table_number !== undefined) updateData.table_number = String(table_number);

    if (section !== undefined) updateData.floor = section;
    else if (floor !== undefined) updateData.floor = floor;

    const table = await prisma.table.update({
      where: { id },
      data: updateData,
    });

    const mappedTable = {
      ...table,
      tableNumber: table.table_number,
      section: table.floor,
      status: table.is_available === 1 ? 'AVAILABLE' : 'OCCUPIED',
    };

    return res.status(200).json({
      success: true,
      data: mappedTable,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/v1/admin/tables/:id
 * @description Delete table
 * @access Admin/Cafe Owner
 */
router.delete('/tables/:id', managerOnly, audit('DELETE_TABLE', 'table'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    // Ownership check
    if (req.user.role === 'CAFE_OWNER') {
      const table = await prisma.table.findFirst({
        where: { id, cafe: { owner_id: req.user.userId } }
      });
      if (!table) return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await prisma.table.delete({ where: { id } });

    return res.status(200).json({
      success: true,
      message: 'Table deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/admin/users
 * @description List all users
 * @access Admin only
 */
router.get('/users', adminOnly, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { role, search } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (role) {
      where.role = role;
    }
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { email: { contains: search as string } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          is_active: true,
          loyalty_tier: true,
          loyalty_points: true,
          wallet_balance: true,
          avatar: true,
          terms_accepted_at: true,
          created_at: true,
          _count: {
            select: {
              orders: true,
              reservations: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);
    const mappedUsers = users.map((u) => ({
      ...u,
      isActive: u.is_active === 1,
      walletBalance: u.wallet_balance,
      loyaltyPoints: u.loyalty_points,
      loyaltyTier: u.loyalty_tier,
      termsAcceptedAt: u.terms_accepted_at,
    }));

    return res.status(200).json({
      success: true,
      data: mappedUsers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PATCH /api/v1/admin/users/:id/role
 * @description Change user role
 * @access Admin only
 */
router.patch('/users/:id/role', adminOnly, audit('CHANGE_ROLE', 'user'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { role } = req.body;

    if (!['USER', 'ADMIN', 'CAFE_OWNER'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
    });

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PATCH /api/v1/admin/users/:id/status
 * @description Activate/deactivate user
 * @access Admin only
 */
router.patch('/users/:id/status', adminOnly, audit('CHANGE_STATUS', 'user'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { isActive } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: { is_active: isActive ? 1 : 0 },
    });

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/admin/cafe-owners
 * @description List all cafe owners
 * @access Admin only
 */
router.get('/cafe-owners', adminOnly, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const owners = await prisma.user.findMany({
      where: {
        role: 'CAFE_OWNER',
        is_active: 0,
        auth_provider: 'owner_pending',
        verification_status: { in: ['PENDING', 'PENDING_APPROVAL'] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        is_active: true,
        government_id: true,
        business_license: true,
        experience_years: true,
        verification_status: true,
        avatar: true,
        created_at: true,
        owned_cafes: {
          select: {
            id: true,
            name: true,
            description: true,
            address: true,
            city: true,
            phone: true,
            email: true,
            images: true,
            open_time: true,
            close_time: true,
            tags: true,
            is_active: true,
            created_at: true,
          },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
        _count: {
          select: { owned_cafes: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const mapped = owners.map(o => ({
      id: o.id,
      name: o.name,
      email: o.email,
      phone: o.phone,
      isActive: o.is_active === 1,
      governmentId: o.government_id,
      businessLicense: o.business_license,
      experienceYears: o.experience_years,
      verificationStatus: o.verification_status,
      avatar: o.avatar,
      createdAt: o.created_at,
      applicationCafe: o.owned_cafes[0]
        ? {
            id: o.owned_cafes[0].id,
            name: o.owned_cafes[0].name,
            description: o.owned_cafes[0].description,
            address: o.owned_cafes[0].address,
            city: o.owned_cafes[0].city,
            phone: o.owned_cafes[0].phone,
            email: o.owned_cafes[0].email,
            images: tryParse(o.owned_cafes[0].images, []),
            openingHours: `${o.owned_cafes[0].open_time} - ${o.owned_cafes[0].close_time}`,
            tags: tryParse(o.owned_cafes[0].tags, []),
            isActive: o.owned_cafes[0].is_active === 1,
            createdAt: o.owned_cafes[0].created_at,
          }
        : null,
      _count: {
        ownedCafes: o._count.owned_cafes
      }
    }));

    return res.status(200).json({ success: true, data: mapped });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/admin/cafe-owners
 * @description Register a new cafe owner
 * @access Admin only
 */
router.post('/cafe-owners', adminOnly, audit('CREATE_OWNER', 'user'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, phone, governmentId, businessLicense, experienceYears, verificationStatus, avatar } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ success: false, message: 'Email already exists' });

    const passwordHash = await bcrypt.hash(password, 10);

    const owner = await prisma.user.create({
      data: {
        id: uuidv4(),
        name,
        email,
        password_hash: passwordHash,
        phone: phone || null,
        role: 'CAFE_OWNER',
        government_id: governmentId || null,
        business_license: businessLicense || null,
        experience_years: experienceYears !== undefined && experienceYears !== null && experienceYears !== '' ? parseInt(experienceYears as string) : null,
        verification_status: verificationStatus || 'PENDING',
        avatar: avatar || null,
        is_active: 1
      }
    });

    return res.status(201).json({
      success: true,
      data: {
        id: owner.id,
        name: owner.name,
        email: owner.email,
        governmentId: owner.government_id,
        businessLicense: owner.business_license,
        experienceYears: owner.experience_years,
        verificationStatus: owner.verification_status,
        avatar: owner.avatar
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PATCH /api/v1/admin/cafe-owners/:id
 * @description Update cafe owner details
 * @access Admin only
 */
router.patch('/cafe-owners/:id', adminOnly, audit('UPDATE_OWNER', 'user'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, email, phone, password, isActive, governmentId, businessLicense, experienceYears, verificationStatus, avatar } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone || null;
    if (isActive !== undefined) updateData.is_active = isActive ? 1 : 0;
    if (governmentId !== undefined) updateData.government_id = governmentId || null;
    if (businessLicense !== undefined) updateData.business_license = businessLicense || null;
    if (experienceYears !== undefined) updateData.experience_years = experienceYears !== null && experienceYears !== '' ? parseInt(experienceYears as string) : null;
    if (verificationStatus !== undefined) updateData.verification_status = verificationStatus;
    if (avatar !== undefined) updateData.avatar = avatar || null;

    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10);
    }

    const owner = await prisma.user.update({
      where: { id, role: 'CAFE_OWNER' },
      data: updateData
    });

    return res.status(200).json({
      success: true,
      data: {
        id: owner.id,
        name: owner.name,
        email: owner.email,
        phone: owner.phone,
        isActive: owner.is_active === 1,
        governmentId: owner.government_id,
        businessLicense: owner.business_license,
        experienceYears: owner.experience_years,
        verificationStatus: owner.verification_status,
        avatar: owner.avatar
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/v1/admin/cafe-owners/:id
 * @description Delete a cafe owner
 * @access Admin only
 */
router.delete('/cafe-owners/:id', adminOnly, audit('DELETE_OWNER', 'user'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if owner has cafes
    const cafes = await prisma.cafe.count({ where: { owner_id: id } });
    if (cafes > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete owner who still has active cafes' });
    }

    await prisma.user.delete({ where: { id, role: 'CAFE_OWNER' } });

    return res.status(200).json({ success: true, message: 'Owner deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/admin/reservations
 * @description List all reservations
 */
router.get('/reservations', managerOnly, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { cafeId, status } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (cafeId) where.cafe_id = cafeId as string;
    if (status) where.status = status as string;

    if (req.user.role === 'CAFE_OWNER') {
      where.cafe = { owner_id: req.user.userId };
    }

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        include: {
          user: { select: { name: true, email: true, phone: true } },
          cafe: { select: { name: true } },
          table: { select: { table_number: true } }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit
      }),
      prisma.reservation.count({ where })
    ]);

    return res.status(200).json({
      success: true,
      data: reservations,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/admin/reservations
 * @description Create a manual reservation
 */
router.post('/reservations', managerOnly, audit('CREATE_RESERVATION', 'reservation'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { cafeId, userId, tableId, partySize, scheduledAt, date, time, notes, guestName, email, phone } = req.body;

    // Use either scheduledAt or date/time
    let finalDate = date;
    let finalTime = time;
    if (scheduledAt) {
      const parsedDate = new Date(scheduledAt);
      if (!isNaN(parsedDate.getTime())) {
        finalDate = parsedDate.toISOString().split('T')[0];
        finalTime = parsedDate.toTimeString().substring(0, 5);
      }
    }

    if (!finalDate || !finalTime) {
      return res.status(400).json({ success: false, message: 'Invalid date or time provided' });
    }

    // Ownership check
    if (req.user.role === 'CAFE_OWNER') {
      const cafe = await prisma.cafe.findFirst({
        where: { id: cafeId, owner_id: req.user.userId }
      });
      if (!cafe) return res.status(403).json({ success: false, message: 'Access denied' });
    }

    let finalUserId = userId;

    // If no userId, find or create user by email/phone
    if (!finalUserId && (email || phone)) {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            email ? { email } : undefined,
            phone ? { phone } : undefined
          ].filter(Boolean) as any
        }
      });

      if (existingUser) {
        finalUserId = existingUser.id;
      } else {
        // Create a guest user
        const guestUser = await prisma.user.create({
          data: {
            id: uuidv4(),
            email: email || `guest-${Date.now()}@seatsip.com`,
            name: guestName || 'Guest',
            phone: phone || null,
            password_hash: 'manual-reservation-placeholder',
            role: 'USER',
            is_active: 1
          }
        });
        finalUserId = guestUser.id;
      }
    }

    if (!finalUserId) {
      return res.status(400).json({ success: false, message: 'User ID or guest details (name, email/phone) are required' });
    }

    const reservation = await prisma.reservation.create({
      data: {
        id: uuidv4(),
        cafe_id: cafeId,
        user_id: finalUserId,
        table_id: tableId || null,
        party_size: parseInt(partySize) || 2,
        date: finalDate,
        time: finalTime,
        special_requests: notes || null,
        status: 'CONFIRMED',
        confirmation_code: uuidv4().substring(0, 8).toUpperCase(),
      }
    });

    return res.status(201).json({ success: true, data: reservation });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PATCH /api/v1/admin/reservations/:id
 * @description Update reservation status
 */
router.patch('/reservations/:id', managerOnly, audit('UPDATE_RESERVATION', 'reservation'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Ownership check
    if (req.user.role === 'CAFE_OWNER') {
      const resv = await prisma.reservation.findFirst({
        where: { id, cafe: { owner_id: req.user.userId } }
      });
      if (!resv) return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const reservation = await prisma.reservation.update({
      where: { id },
      data: { status }
    });

    return res.status(200).json({ success: true, data: reservation });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/admin/orders
 * @description List all orders
 */
router.get('/orders', managerOnly, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { cafeId, status } = req.query;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const where: any = {};
    if (cafeId) where.cafe_id = cafeId as string;
    if (status) where.status = status as string;

    if (req.user.role === 'CAFE_OWNER') {
      where.cafe = { owner_id: req.user.userId };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        cafe: { select: { name: true, address: true } },
      },
      orderBy: { created_at: 'desc' },
      take: limit
    });

    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PATCH /api/v1/admin/orders/:id
 * @description Update order status
 */
router.patch('/orders/:id', managerOnly, audit('UPDATE_ORDER', 'order'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (req.user.role === 'CAFE_OWNER') {
      const order = await prisma.order.findFirst({
        where: { id, cafe: { owner_id: req.user.userId } }
      });
      if (!order) return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status }
    });

    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/admin/analytics/orders
 * @description Get order analytics grouped by status
 */
router.get('/analytics/orders', managerOnly, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const where: any = {};
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = new Date(startDate as string);
      if (endDate) where.created_at.lte = new Date(endDate as string);
    }

    if (req.user.role === 'CAFE_OWNER') {
      where.cafe = { owner_id: req.user.userId };
    }

    const stats = await prisma.order.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
      where,
    });

    const data = stats.map((s) => ({
      status: s.status,
      count: s._count.id,
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/admin/analytics/payments
 * @description Get payment analytics grouped by status
 */
router.get('/analytics/payments', managerOnly, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const where: any = {};
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = new Date(startDate as string);
      if (endDate) where.created_at.lte = new Date(endDate as string);
    }

    if (req.user.role === 'CAFE_OWNER') {
      where.cafe = { owner_id: req.user.userId };
    }

    const stats = await prisma.order.groupBy({
      by: ['payment_status'],
      _count: {
        id: true,
      },
      where,
    });

    const data = stats.map((s) => ({
      status: s.payment_status || 'PENDING',
      count: s._count.id,
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/admin/menu/items
 * @description Create new menu item
 */
router.post('/menu/items', managerOnly, audit('CREATE_MENU_ITEM', 'menu'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const {
      cafeId,
      name,
      description,
      price,
      categoryId,
      category,
      imageUrl,
      image_url,
      isVeg,
      isPopular,
      prepTimeMinutes,
      calories,
      stockQuantity,
      allergens,
      customizations,
      tags,
      caffeine,
    } = req.body;

    // Ownership check
    if (req.user.role === 'CAFE_OWNER') {
      const cafe = await prisma.cafe.findFirst({
        where: { id: cafeId, owner_id: req.user.userId }
      });
      if (!cafe) return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Resolve category name (string) to database category ID
    let finalCategoryId = categoryId || null;
    if (!finalCategoryId && category && typeof category === 'string') {
      const catName = category.trim();
      let dbCategory = await prisma.menuCategory.findFirst({
        where: {
          cafe_id: cafeId,
          name: { equals: catName }
        }
      });
      if (!dbCategory) {
        dbCategory = await prisma.menuCategory.create({
          data: {
            id: uuidv4(),
            cafe_id: cafeId,
            name: catName,
            sort_order: 0,
          }
        });
      }
      finalCategoryId = dbCategory.id;
    }

    // Convert price to rupees/float from cents/subunits
    const basePrice = price !== undefined ? parseFloat(String(price)) / 100 : 0;
    const finalImageUrl = imageUrl || image_url || null;

    const item = await prisma.menuItem.create({
      data: {
        id: uuidv4(),
        cafe_id: cafeId,
        category_id: finalCategoryId,
        name,
        description: description || null,
        price: basePrice,
        image_url: finalImageUrl,
        is_veg: isVeg ? 1 : 0,
        is_popular: isPopular ? 1 : 0,
        is_available: 1,
        prep_time_minutes: prepTimeMinutes !== undefined ? parseInt(prepTimeMinutes as string) : 10,
        calories: calories !== undefined && calories !== null && calories !== '' ? parseInt(calories as string) : null,
        caffeine: caffeine !== undefined && caffeine !== null && caffeine !== '' ? parseInt(caffeine as string) : null,
        stock_quantity: stockQuantity !== undefined && stockQuantity !== null && stockQuantity !== '' ? parseInt(stockQuantity as string) : 999,
        allergens: allergens ? (typeof allergens === 'string' ? allergens : JSON.stringify(allergens)) : '[]',
        customizations: customizations ? (typeof customizations === 'string' ? customizations : JSON.stringify(customizations)) : '[]',
        tags: tags ? (Array.isArray(tags) ? JSON.stringify(tags) : (typeof tags === 'string' ? JSON.stringify(tags.split(',').map(t => t.trim()).filter(Boolean)) : '[]')) : '[]',
      }
    });

    const mappedItem = {
      ...item,
      category: category || 'Bespoke',
      imageUrl: item.image_url,
      isAvailable: item.is_available === 1,
      isVeg: item.is_veg === 1,
      isPopular: item.is_popular === 1,
      caffeine: item.caffeine,
      tags: item.tags ? (typeof item.tags === 'string' ? JSON.parse(item.tags) : item.tags) : [],
      price: item.price * 100, // Return in subunits (cents/paise) for Next.js web admin
    };

    return res.status(201).json({ success: true, data: mappedItem });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PATCH /api/v1/admin/menu/items/:id
 * @description Update menu item
 */
router.patch('/menu/items/:id', managerOnly, audit('UPDATE_MENU_ITEM', 'menu'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Ownership check
    if (req.user.role === 'CAFE_OWNER') {
      const item = await prisma.menuItem.findFirst({
        where: { id, cafe: { owner_id: req.user.userId } }
      });
      if (!item) return res.status(403).json({ success: false, message: 'Access denied' });

      // Verify ownership of the new cafe if it's being changed
      const targetCafeId = req.body.cafeId || req.body.cafe_id;
      if (targetCafeId && targetCafeId !== item.cafe_id) {
        const ownedCafe = await prisma.cafe.findFirst({
          where: { id: targetCafeId, owner_id: req.user.userId }
        });
        if (!ownedCafe) return res.status(403).json({ success: false, message: 'Access denied: You do not own the target cafe' });
      }
    }

    const {
      isVeg,
      is_veg,
      isPopular,
      is_popular,
      isAvailable,
      is_available,
      price,
      imageUrl,
      image_url,
      categoryId,
      category_id,
      category,
      prepTimeMinutes,
      prep_time_minutes,
      calories,
      caffeine,
      stockQuantity,
      stock_quantity,
      allergens,
      customizations,
      tags,
      cafeId,
      cafe_id,
      cafe,
      cart_items,
      ...rest
    } = req.body;

    const updateData: any = { ...rest };
    if (isVeg !== undefined) updateData.is_veg = isVeg ? 1 : 0;
    else if (is_veg !== undefined) updateData.is_veg = is_veg ? 1 : 0;

    if (isPopular !== undefined) updateData.is_popular = isPopular ? 1 : 0;
    else if (is_popular !== undefined) updateData.is_popular = is_popular ? 1 : 0;

    if (isAvailable !== undefined) updateData.is_available = isAvailable ? 1 : 0;
    else if (is_available !== undefined) updateData.is_available = is_available ? 1 : 0;

    if (prepTimeMinutes !== undefined) updateData.prep_time_minutes = parseInt(prepTimeMinutes as string);
    else if (prep_time_minutes !== undefined) updateData.prep_time_minutes = parseInt(prep_time_minutes as string);

    if (calories !== undefined) updateData.calories = (calories !== null && calories !== '') ? parseInt(calories as string) : null;
    if (caffeine !== undefined) updateData.caffeine = (caffeine !== null && caffeine !== '') ? parseInt(caffeine as string) : null;

    if (stockQuantity !== undefined) updateData.stock_quantity = (stockQuantity !== null && stockQuantity !== '') ? parseInt(stockQuantity as string) : 999;
    else if (stock_quantity !== undefined) updateData.stock_quantity = (stock_quantity !== null && stock_quantity !== '') ? parseInt(stock_quantity as string) : 999;

    if (allergens !== undefined) updateData.allergens = typeof allergens === 'string' ? allergens : JSON.stringify(allergens);
    if (customizations !== undefined) updateData.customizations = typeof customizations === 'string' ? customizations : JSON.stringify(customizations);

    if (tags !== undefined) {
      updateData.tags = typeof tags === 'string'
        ? JSON.stringify(tags.split(',').map(t => t.trim()).filter(Boolean))
        : (Array.isArray(tags) ? JSON.stringify(tags) : '[]');
    }
    
    if (price !== undefined) {
      updateData.price = parseFloat(String(price)) / 100; // convert to base units from subunits
    }

    if (imageUrl !== undefined) updateData.image_url = imageUrl;
    else if (image_url !== undefined) updateData.image_url = image_url;

    if (categoryId !== undefined) {
      updateData.category_id = categoryId;
    } else if (category_id !== undefined) {
      updateData.category_id = category_id;
    } else if (category !== undefined && typeof category === 'string') {
      // Resolve category name (string)
      // Retrieve the item first to get cafe_id
      const currentItem = await prisma.menuItem.findUnique({ where: { id } });
      if (currentItem) {
        const catName = category.trim();
        let dbCategory = await prisma.menuCategory.findFirst({
          where: {
            cafe_id: currentItem.cafe_id,
            name: { equals: catName }
          }
        });
        if (!dbCategory) {
          dbCategory = await prisma.menuCategory.create({
            data: {
              id: uuidv4(),
              cafe_id: currentItem.cafe_id,
              name: catName,
              sort_order: 0,
            }
          });
        }
        updateData.category_id = dbCategory.id;
      }
    }

    if (cafe_id !== undefined) updateData.cafe_id = cafe_id;
    else if (cafeId !== undefined) updateData.cafe_id = cafeId;

    const item = await prisma.menuItem.update({
      where: { id },
      data: updateData,
      include: {
        category: {
          select: { name: true }
        }
      }
    });

    const mappedItem = {
      ...item,
      category: item.category?.name || category || 'Bespoke',
      imageUrl: item.image_url,
      isAvailable: item.is_available === 1,
      isVeg: item.is_veg === 1,
      isPopular: item.is_popular === 1,
      prepTimeMinutes: item.prep_time_minutes,
      calories: item.calories,
      caffeine: item.caffeine,
      stockQuantity: item.stock_quantity,
      allergens: item.allergens,
      customizations: item.customizations,
      tags: item.tags ? (typeof item.tags === 'string' ? JSON.parse(item.tags) : item.tags) : [],
      price: item.price * 100, // Return in subunits (cents/paise)
    };

    return res.status(200).json({ success: true, data: mappedItem });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/admin/analytics/export
 * @description Export analytics to CSV/Excel
 */
router.get('/analytics/export', managerOnly, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=analytics.csv');
    return res.status(200).send('Date,Revenue,Orders\n2024-01-01,1000,5');
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/admin/audit-logs
 * @description Get system audit logs
 * @access Admin only
 */
router.get('/audit-logs', adminOnly, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { created_at: 'desc' },
        skip,
        take: limit
      }),
      prisma.auditLog.count()
    ]);

    return res.status(200).json({
      success: true,
      data: logs,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/admin/settings
 * @description Get system settings (auto-seed if empty)
 */
router.get('/settings', managerOnly, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let settings = await prisma.systemSetting.findMany({
      orderBy: { key: 'asc' }
    });

    if (settings.length === 0) {
      const defaultSettings = [
        { id: uuidv4(), key: 'app_name', value: 'SeatSip', type: 'string', category: 'General', description: 'Application name displayed in titles' },
        { id: uuidv4(), key: 'contact_email', value: 'support@seatsip.com', type: 'string', category: 'General', description: 'Primary support and contact email address' },
        { id: uuidv4(), key: 'maintenance_mode', value: 'false', type: 'boolean', category: 'System', description: 'Put the application into read-only maintenance mode' },
        { id: uuidv4(), key: 'session_timeout_minutes', value: '60', type: 'number', category: 'System', description: 'User login session duration in minutes' },
        { id: uuidv4(), key: 'max_party_size', value: '8', type: 'number', category: 'Reservations', description: 'Maximum allowed party size for single table reservation' },
        { id: uuidv4(), key: 'loyalty_points_per_rupee', value: '1', type: 'number', category: 'Loyalty', description: 'Loyalty points earned per rupee spent' },
        { id: uuidv4(), key: 'enable_email_receipts', value: 'true', type: 'boolean', category: 'Notifications', description: 'Send digital receipt via email upon order completion' }
      ];
      await prisma.systemSetting.createMany({ data: defaultSettings });
      settings = await prisma.systemSetting.findMany({ orderBy: { key: 'asc' } });
    }

    const mappedSettings = settings.map(s => {
      let value: any = s.value;
      if (s.type === 'boolean') value = s.value === 'true';
      else if (s.type === 'number') value = parseFloat(s.value);
      return { ...s, value };
    });

    return res.status(200).json({ success: true, data: mappedSettings });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PATCH /api/v1/admin/settings/:id
 * @description Update specific system setting
 */
router.patch('/settings/:id', managerOnly, audit('UPDATE_SETTING', 'settings'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { value } = req.body;

    const setting = await prisma.systemSetting.findUnique({ where: { id } });
    if (!setting) return res.status(404).json({ success: false, message: 'Setting not found' });

    const stringValue = String(value);

    const updated = await prisma.systemSetting.update({
      where: { id },
      data: { value: stringValue }
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/admin/settings/batch
 * @description Batch update system settings
 */
router.post('/settings/batch', managerOnly, audit('BATCH_UPDATE_SETTINGS', 'settings'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { settings } = req.body;
    if (!Array.isArray(settings)) {
      return res.status(400).json({ success: false, message: 'Invalid settings batch array' });
    }

    await prisma.$transaction(
      settings.map((s: any) =>
        prisma.systemSetting.update({
          where: { id: s.id },
          data: { value: String(s.value) }
        })
      )
    );

    return res.status(200).json({ success: true, message: 'Settings batch updated successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/admin/feature-flags
 * @description Get all feature flags (auto-seed if empty)
 */
router.get('/feature-flags', managerOnly, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let flags = await prisma.featureFlag.findMany({
      orderBy: { key: 'asc' }
    });

    if (flags.length === 0) {
      const defaultFlags = [
        { id: uuidv4(), name: 'Mood Filter', key: 'mood_filter_enabled', enabled: true, description: 'Enable mood-based cafe filtering on search screen' },
        { id: uuidv4(), name: 'Automatic Refunds', key: 'auto_refund_enabled', enabled: true, description: 'Process order refund automatically upon cancellation' },
        { id: uuidv4(), name: 'Kitchen Alerts', key: 'kitchen_alerts_enabled', enabled: true, description: 'Enable real-time notification alerts to kitchen staff' },
        { id: uuidv4(), name: 'Zomato Style Notification', key: 'fun_notifications_enabled', enabled: true, description: 'Send engaging and custom localized push notifications' },
        { id: uuidv4(), name: 'Reservation Reminder', key: 'reservation_reminders_enabled', enabled: true, description: 'Enable push alerts for upcoming table reservations' },
        { id: uuidv4(), name: 'Loyalty Tier Wallet', key: 'wallet_cashback_enabled', enabled: true, description: 'Enable wallet balance and loyalty point accrual system' },
        { id: uuidv4(), name: 'Fraud Protection', key: 'fraud_detection_enabled', enabled: false, description: 'Automatic anti-fraud protection algorithms' }
      ];
      await prisma.featureFlag.createMany({ data: defaultFlags });
      flags = await prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
    }

    return res.status(200).json({ success: true, data: flags });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PATCH /api/v1/admin/feature-flags/:id
 * @description Update specific feature flag state
 */
router.patch('/feature-flags/:id', managerOnly, audit('TOGGLE_FEATURE_FLAG', 'feature-flags'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    const flag = await prisma.featureFlag.findUnique({ where: { id } });
    if (!flag) return res.status(404).json({ success: false, message: 'Feature flag not found' });

    const updated = await prisma.featureFlag.update({
      where: { id },
      data: { enabled: Boolean(enabled) }
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/admin/roles
 * @description Get all roles and their associated permission keys
 */
router.get('/roles', managerOnly, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const roles = [
      {
        id: 'ADMIN',
        name: 'Administrator',
        permissions: ['view_analytics', 'manage_settings', 'manage_cafes', 'manage_tables', 'manage_users', 'manage_menu', 'manage_orders', 'manage_reservations']
      },
      {
        id: 'CAFE_OWNER',
        name: 'Cafe Owner',
        permissions: ['view_analytics', 'manage_tables', 'manage_menu', 'manage_orders', 'manage_reservations']
      },
      {
        id: 'USER',
        name: 'Standard User',
        permissions: ['manage_reservations']
      }
    ];
    return res.status(200).json({ success: true, data: roles });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/admin/permissions
 * @description Get all available RBAC permissions
 */
router.get('/permissions', managerOnly, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const permissions = [
      { id: 'view_analytics', name: 'View Analytics', key: 'view_analytics', description: 'Access dashboard and aggregate report statistics', category: 'Analytics' },
      { id: 'manage_settings', name: 'Manage System Settings', key: 'manage_settings', description: 'Modify key value settings and toggle feature flags', category: 'Settings' },
      { id: 'manage_cafes', name: 'Manage Cafes', key: 'manage_cafes', description: 'Create, update, and archive cafe outlets and details', category: 'Cafes' },
      { id: 'manage_tables', name: 'Manage Cafe Tables', key: 'manage_tables', description: 'Layout and availability management of restaurant tables', category: 'Tables' },
      { id: 'manage_users', name: 'Manage Users & Staff', key: 'manage_users', description: 'Manage profiles, roles, and status of users or staff', category: 'Users' },
      { id: 'manage_menu', name: 'Manage Cafe Menu', key: 'manage_menu', description: 'Create and update food items, categories, and availability', category: 'Menu' },
      { id: 'manage_orders', name: 'Manage Live Orders', key: 'manage_orders', description: 'Track, update, and manage orders placed by customers', category: 'Orders' },
      { id: 'manage_reservations', name: 'Manage Reservations', key: 'manage_reservations', description: 'Manage table bookings and confirmation status', category: 'Reservations' }
    ];
    return res.status(200).json({ success: true, data: permissions });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PATCH /api/v1/admin/roles/:selectedRole/permissions
 * @description Update permissions assigned to a role (cosmetic RBAC)
 */
router.patch('/roles/:selectedRole/permissions', managerOnly, audit('CHANGE_ROLE_PERMISSIONS', 'roles'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    return res.status(200).json({ success: true, message: 'Permissions updated successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/admin/users
 * @description Create a new user or staff member
 */
router.post('/users', adminOnly, audit('CREATE_USER', 'user'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role, phone } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ success: false, message: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password || 'password123', 12);
    const userId = uuidv4();

    const user = await prisma.user.create({
      data: {
        id: userId,
        name,
        email: email.toLowerCase(),
        phone: phone || null,
        password_hash: passwordHash,
        role: role || 'USER',
        is_active: 1
      }
    });

    return res.status(201).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.is_active === 1
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PATCH /api/v1/admin/users/:id
 * @description Update a user or staff member details
 */
router.patch('/users/:id', adminOnly, audit('UPDATE_USER', 'user'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role, isActive } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email.toLowerCase();
    if (phone !== undefined) updateData.phone = phone || null;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.is_active = isActive ? 1 : 0;

    const updated = await prisma.user.update({
      where: { id },
      data: updateData
    });

    return res.status(200).json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        role: updated.role,
        isActive: updated.is_active === 1
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/v1/admin/users/:id
 * @description Delete a user or staff member
 */
router.delete('/users/:id', adminOnly, audit('DELETE_USER', 'user'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.role === 'CAFE_OWNER') {
      const ownedCafesCount = await prisma.cafe.count({ where: { owner_id: id } });
      if (ownedCafesCount > 0) {
        return res.status(400).json({ success: false, message: 'Cannot delete cafe owner with active cafes. Reassign or delete the cafes first.' });
      }
    }

    // Delete all dependent relations first to avoid foreign key constraint violations
    await prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({ where: { user_id: id } });
      await tx.notification.deleteMany({ where: { user_id: id } });
      await tx.review.deleteMany({ where: { user_id: id } });
      await tx.walletTransaction.deleteMany({ where: { user_id: id } });
      await tx.reservation.deleteMany({ where: { user_id: id } });
      await tx.order.deleteMany({ where: { user_id: id } });
      await tx.user.delete({ where: { id } });
    });

    return res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/v1/admin/menu/items/:id
 * @description Delete a menu item
 * @access Admin/Cafe Owner
 */
router.delete('/menu/items/:id', managerOnly, audit('DELETE_MENU_ITEM', 'menu'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Ownership check
    if (req.user.role === 'CAFE_OWNER') {
      const item = await prisma.menuItem.findFirst({
        where: { id, cafe: { owner_id: req.user.userId } }
      });
      if (!item) return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await prisma.menuItem.delete({ where: { id } });

    return res.status(200).json({ success: true, message: 'Menu item deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/admin/banners
 * @description List admin banners (filtered for owners)
 * @access Admin/Cafe Owner
 */
router.get('/banners', managerOnly, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const where: any = {};
    if (req.user.role === 'CAFE_OWNER') {
      const cafes = await prisma.cafe.findMany({
        where: { owner_id: req.user.userId },
        select: { id: true }
      });
      const cafeIds = cafes.map(c => c.id);
      where.cafe_id = { in: cafeIds };
    }

    const banners = await prisma.banner.findMany({
      where,
      include: {
        cafe: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { sort_order: 'asc' }
    });

    const formatted = banners.map(b => ({
      id: b.id,
      sliderType: b.slider_type,
      tag: b.tag,
      tagIcon: b.tag_icon,
      tagColor: b.tag_color,
      accentColor: b.tag_color,
      tagBg: b.tag_bg,
      title: b.title,
      titleAccent: b.title_accent,
      subtitle: b.subtitle,
      subtitleColor: b.subtitle_color,
      ctaText: b.cta_text,
      ctaBg: b.cta_bg,
      ctaTextColor: b.cta_text_color, // maps to ctaTextColor / ctaText2
      ctaText2: b.cta_text_color,
      bgColor: b.bg_color, // maps to bg_color / bg
      bg: b.bg_color,
      overlayColor: b.overlay_color,
      stripeColor: b.stripe_color,
      emoji: b.emoji,
      emojiLabel: b.emoji_label,
      emojiLabelColor: b.emoji_label_color,
      badge: b.badge,
      bgImage: b.bg_image,
      cafeId: b.cafe_id,
      cafeName: b.cafe?.name,
      isActive: b.is_active === 1,
      sortOrder: b.sort_order,
      createdAt: b.created_at,
      updatedAt: b.updated_at
    }));

    return res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/admin/banners
 * @description Create new banner
 * @access Admin/Cafe Owner
 */
router.post('/banners', managerOnly, audit('CREATE_BANNER', 'banners'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const {
      sliderType,
      tag,
      tagIcon,
      tagColor,
      tagBg,
      title,
      titleAccent,
      subtitle,
      subtitleColor,
      ctaText,
      ctaBg,
      ctaTextColor,
      ctaText2,
      bgColor,
      bg,
      overlayColor,
      stripeColor,
      emoji,
      emojiLabel,
      emojiLabelColor,
      badge,
      bgImage,
      cafeId,
      isActive,
      sortOrder
    } = req.body;

    const finalCafeId = cafeId || null;

    // Cafe Owner check
    if (req.user.role === 'CAFE_OWNER') {
      if (!finalCafeId) {
        return res.status(400).json({ success: false, message: 'Cafe Owner must specify a cafeId for the banner' });
      }
      const cafe = await prisma.cafe.findFirst({
        where: { id: finalCafeId, owner_id: req.user.userId }
      });
      if (!cafe) {
        return res.status(403).json({ success: false, message: 'Access denied: you do not own this cafe' });
      }
    }

    const banner = await prisma.banner.create({
      data: {
        id: uuidv4(),
        slider_type: sliderType || 'PROMO',
        tag: tag || '',
        tag_icon: tagIcon || null,
        tag_color: tagColor || '#FFFFFF',
        tag_bg: tagBg || null,
        title: title || '',
        title_accent: titleAccent || null,
        subtitle: subtitle || '',
        subtitle_color: subtitleColor || null,
        cta_text: ctaText || '',
        cta_bg: ctaBg || '#FFFFFF',
        cta_text_color: ctaTextColor || ctaText2 || '#000000',
        bg_color: bgColor || bg || '#000000',
        overlay_color: overlayColor || null,
        stripe_color: stripeColor || null,
        emoji: emoji || null,
        emoji_label: emojiLabel || null,
        emoji_label_color: emojiLabelColor || null,
        badge: badge || null,
        bg_image: bgImage || '',
        cafe_id: finalCafeId,
        is_active: isActive !== undefined ? (isActive ? 1 : 0) : 1,
        sort_order: sortOrder !== undefined ? parseInt(sortOrder as string) : 0
      }
    });

    return res.status(201).json({ success: true, data: banner });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PATCH /api/v1/admin/banners/:id
 * @description Update banner
 * @access Admin/Cafe Owner
 */
router.patch('/banners/:id', managerOnly, audit('UPDATE_BANNER', 'banners'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Ownership check
    if (req.user.role === 'CAFE_OWNER') {
      const banner = await prisma.banner.findFirst({
        where: {
          id,
          OR: [
            { cafe: { owner_id: req.user.userId } },
            { cafe_id: null }
          ]
        }
      });
      if (!banner || banner.cafe_id === null) {
        return res.status(403).json({ success: false, message: 'Access denied: you do not own this banner' });
      }
    }

    const {
      sliderType,
      tag,
      tagIcon,
      tagColor,
      tagBg,
      title,
      titleAccent,
      subtitle,
      subtitleColor,
      ctaText,
      ctaBg,
      ctaTextColor,
      ctaText2,
      bgColor,
      bg,
      overlayColor,
      stripeColor,
      emoji,
      emojiLabel,
      emojiLabelColor,
      badge,
      bgImage,
      cafeId,
      isActive,
      sortOrder
    } = req.body;

    const updateData: any = {};
    if (sliderType !== undefined) updateData.slider_type = sliderType;
    if (tag !== undefined) updateData.tag = tag;
    if (tagIcon !== undefined) updateData.tag_icon = tagIcon;
    if (tagColor !== undefined) updateData.tag_color = tagColor;
    if (tagBg !== undefined) updateData.tag_bg = tagBg;
    if (title !== undefined) updateData.title = title;
    if (titleAccent !== undefined) updateData.title_accent = titleAccent;
    if (subtitle !== undefined) updateData.subtitle = subtitle;
    if (subtitleColor !== undefined) updateData.subtitle_color = subtitleColor;
    if (ctaText !== undefined) updateData.cta_text = ctaText;
    if (ctaBg !== undefined) updateData.cta_bg = ctaBg;
    if (ctaTextColor !== undefined) updateData.cta_text_color = ctaTextColor;
    else if (ctaText2 !== undefined) updateData.cta_text_color = ctaText2;
    if (bgColor !== undefined) updateData.bg_color = bgColor;
    else if (bg !== undefined) updateData.bg_color = bg;
    if (overlayColor !== undefined) updateData.overlay_color = overlayColor;
    if (stripeColor !== undefined) updateData.stripe_color = stripeColor;
    if (emoji !== undefined) updateData.emoji = emoji;
    if (emojiLabel !== undefined) updateData.emoji_label = emojiLabel;
    if (emojiLabelColor !== undefined) updateData.emoji_label_color = emojiLabelColor;
    if (badge !== undefined) updateData.badge = badge;
    if (bgImage !== undefined) updateData.bg_image = bgImage;
    if (cafeId !== undefined) {
      if (req.user.role === 'CAFE_OWNER' && cafeId) {
        const cafe = await prisma.cafe.findFirst({
          where: { id: cafeId, owner_id: req.user.userId }
        });
        if (!cafe) {
          return res.status(403).json({ success: false, message: 'Access denied: you do not own that cafe' });
        }
      }
      updateData.cafe_id = cafeId || null;
    }
    if (isActive !== undefined) updateData.is_active = isActive ? 1 : 0;
    if (sortOrder !== undefined) updateData.sort_order = parseInt(sortOrder as string);

    const banner = await prisma.banner.update({
      where: { id },
      data: updateData
    });

    return res.status(200).json({ success: true, data: banner });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/v1/admin/banners/:id
 * @description Delete banner
 * @access Admin/Cafe Owner
 */
router.delete('/banners/:id', managerOnly, audit('DELETE_BANNER', 'banners'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Ownership check
    if (req.user.role === 'CAFE_OWNER') {
      const banner = await prisma.banner.findFirst({
        where: { id, cafe: { owner_id: req.user.userId } }
      });
      if (!banner) return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await prisma.banner.delete({ where: { id } });

    return res.status(200).json({ success: true, message: 'Banner deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/admin/rewards
 * @description List all rewards
 * @access Admin/Cafe Owner
 */
router.get('/rewards', managerOnly, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const where: any = {};
    if (req.user.role === 'CAFE_OWNER') {
      const cafeIds = (await prisma.cafe.findMany({
        where: { owner_id: req.user.userId },
        select: { id: true }
      })).map(c => c.id);
      where.OR = [
        { cafe_id: null },
        { cafe_id: { in: cafeIds } }
      ];
    }

    const rewards = await prisma.reward.findMany({
      where,
      orderBy: { points_cost: 'asc' }
    });

    // Map cafe names
    const cafes = await prisma.cafe.findMany({
      select: { id: true, name: true }
    });
    const cafeMap = new Map(cafes.map(c => [c.id, c.name]));

    const mappedRewards = rewards.map(r => ({
      id: r.id,
      name: r.name,
      icon: r.icon,
      category: r.category,
      description: r.description,
      terms: r.terms,
      pointsCost: r.points_cost,
      tierRequired: r.tier_required,
      stock: r.stock,
      totalRedeemed: r.total_redeemed,
      isActive: r.is_active === 1,
      validFrom: r.valid_from,
      validUntil: r.valid_until,
      cafeId: r.cafe_id,
      cafeName: r.cafe_id ? (cafeMap.get(r.cafe_id) || 'Unknown Cafe') : 'Platform-Wide'
    }));

    return res.status(200).json({ success: true, data: mappedRewards });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/admin/rewards
 * @description Create a new reward
 * @access Admin/Cafe Owner
 */
router.post('/rewards', managerOnly, audit('CREATE_REWARD', 'rewards'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      icon,
      category,
      description,
      terms,
      pointsCost,
      tierRequired,
      stock,
      isActive,
      cafeId
    } = req.body;

    if (req.user.role === 'CAFE_OWNER') {
      if (!cafeId) {
        return res.status(403).json({ success: false, message: 'Cafe Owners must associate rewards with their own cafes' });
      }
      const cafe = await prisma.cafe.findFirst({
        where: { id: cafeId, owner_id: req.user.userId }
      });
      if (!cafe) {
        return res.status(403).json({ success: false, message: 'You do not own this cafe' });
      }
    }

    const reward = await prisma.reward.create({
      data: {
        id: uuidv4(),
        name,
        icon: icon || '🎁',
        category: category || 'Food & Drink',
        description: description || null,
        terms: terms || null,
        points_cost: parseInt(pointsCost as string) || 100,
        tier_required: tierRequired || 'SILVER',
        stock: stock !== undefined ? parseInt(stock as string) : -1,
        is_active: isActive !== false ? 1 : 0,
        cafe_id: cafeId || null
      }
    });

    return res.status(201).json({ success: true, data: reward });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PATCH /api/v1/admin/rewards/:id
 * @description Update an existing reward
 * @access Admin/Cafe Owner
 */
router.patch('/rewards/:id', managerOnly, audit('UPDATE_REWARD', 'rewards'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      name,
      icon,
      category,
      description,
      terms,
      pointsCost,
      tierRequired,
      stock,
      isActive,
      cafeId
    } = req.body;

    const existingReward = await prisma.reward.findUnique({
      where: { id }
    });

    if (!existingReward) {
      return res.status(404).json({ success: false, message: 'Reward not found' });
    }

    if (req.user.role === 'CAFE_OWNER') {
      if (existingReward.cafe_id) {
        const ownedCafe = await prisma.cafe.findFirst({
          where: { id: existingReward.cafe_id, owner_id: req.user.userId }
        });
        if (!ownedCafe) {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }
      } else {
        return res.status(403).json({ success: false, message: 'Access denied: cannot modify global rewards' });
      }

      if (cafeId && cafeId !== existingReward.cafe_id) {
        const newCafe = await prisma.cafe.findFirst({
          where: { id: cafeId, owner_id: req.user.userId }
        });
        if (!newCafe) {
          return res.status(403).json({ success: false, message: 'Access denied: you do not own the target cafe' });
        }
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (icon !== undefined) updateData.icon = icon;
    if (category !== undefined) updateData.category = category;
    if (description !== undefined) updateData.description = description;
    if (terms !== undefined) updateData.terms = terms;
    if (pointsCost !== undefined) updateData.points_cost = parseInt(pointsCost as string);
    if (tierRequired !== undefined) updateData.tier_required = tierRequired;
    if (stock !== undefined) updateData.stock = parseInt(stock as string);
    if (isActive !== undefined) updateData.is_active = isActive ? 1 : 0;
    if (cafeId !== undefined) updateData.cafe_id = cafeId || null;

    const reward = await prisma.reward.update({
      where: { id },
      data: updateData
    });

    return res.status(200).json({ success: true, data: reward });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/v1/admin/rewards/:id
 * @description Delete a reward
 * @access Admin/Cafe Owner
 */
router.delete('/rewards/:id', managerOnly, audit('DELETE_REWARD', 'rewards'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existingReward = await prisma.reward.findUnique({
      where: { id }
    });

    if (!existingReward) {
      return res.status(404).json({ success: false, message: 'Reward not found' });
    }

    if (req.user.role === 'CAFE_OWNER') {
      if (existingReward.cafe_id) {
        const ownedCafe = await prisma.cafe.findFirst({
          where: { id: existingReward.cafe_id, owner_id: req.user.userId }
        });
        if (!ownedCafe) {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }
      } else {
        return res.status(403).json({ success: false, message: 'Access denied: cannot delete global rewards' });
      }
    }

    await prisma.reward.delete({
      where: { id }
    });

    return res.status(200).json({ success: true, message: 'Reward deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/admin/rewards/redemptions
 * @description View all redemption logs
 * @access Admin/Cafe Owner
 */
router.get('/rewards/redemptions', managerOnly, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const where: any = {};
    if (req.user.role === 'CAFE_OWNER') {
      const cafeIds = (await prisma.cafe.findMany({
        where: { owner_id: req.user.userId },
        select: { id: true }
      })).map(c => c.id);
      where.reward = {
        cafe_id: { in: cafeIds }
      };
    }

    const redemptions = await prisma.redeemedReward.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        reward: {
          select: {
            id: true,
            name: true,
            category: true,
            cafe_id: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    // Map cafe names for redemption cafe_id in memory
    const cafes = await prisma.cafe.findMany({
      select: { id: true, name: true }
    });
    const cafeMap = new Map(cafes.map(c => [c.id, c.name]));

    const mappedRedemptions = redemptions.map(r => ({
      id: r.id,
      userId: r.user_id,
      rewardId: r.reward_id,
      orderId: r.order_id,
      pointsSpent: r.points_spent,
      status: r.status,
      expiresAt: r.expires_at,
      usedAt: r.used_at,
      createdAt: r.created_at,
      user: r.user,
      reward: {
        id: r.reward.id,
        name: r.reward.name,
        category: r.reward.category,
        cafeId: r.reward.cafe_id,
        cafeName: r.reward.cafe_id ? (cafeMap.get(r.reward.cafe_id) || 'Unknown Cafe') : 'Platform-Wide'
      }
    }));

    return res.status(200).json({ success: true, data: mappedRedemptions });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────
// REVENUE CHART
// ─────────────────────────────────────────────────────────────

router.get('/revenue', requireAdminOrOwner, async (req: AuthenticatedRequest, res: Response) => {
  const days = Math.min(parseInt(String(req.query.days || '7'), 10), 90);
  const result: { date: string; amount: number }[] = [];
  const ownerCafes = req.user?.role === 'CAFE_OWNER'
    ? await prisma.cafe.findMany({ where: { email: req.user.email }, select: { id: true } })
    : [];
  const ownerCafeIds = ownerCafes.map(c => c.id);
  const ownerScopedWhere = req.user?.role === 'CAFE_OWNER' ? { cafe_id: { in: ownerCafeIds } } : {};

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);

    const agg = await prisma.order.aggregate({
      where: { created_at: { gte: d, lte: end }, payment_status: 'PAID', ...ownerScopedWhere },
      _sum: { total: true },
    });

    result.push({
      date: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      amount: agg._sum.total || 0,
    });
  }

  return res.json({ success: true, data: result });
});

// ─────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────

router.get('/users', requireAdminOrOwner, audit('ADMIN_LIST_USERS', 'user'), async (_req: AuthenticatedRequest, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      is_active: true,
      wallet_balance: true,
      loyalty_points: true,
      loyalty_tier: true,
      created_at: true,
      auth_provider: true,
    },
    orderBy: { created_at: 'desc' },
    take: 500,
  });

  const mapped = users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    isActive: u.is_active === 1,
    walletBalance: u.wallet_balance,
    loyaltyPoints: u.loyalty_points,
    loyaltyTier: u.loyalty_tier,
    authProvider: u.auth_provider,
    createdAt: u.created_at,
  }));

  return res.json({ success: true, data: mapped });
});

router.patch('/users/:id/status', requireAdmin, audit('ADMIN_UPDATE_USER_STATUS', 'user'), async (req: AuthenticatedRequest, res: Response) => {
  const { isActive } = req.body as { isActive: boolean };
  await prisma.user.update({
    where: { id: req.params.id },
    data: { is_active: isActive ? 1 : 0 },
  });
  return res.json({ success: true, message: `User ${isActive ? 'activated' : 'suspended'}` });
});

router.delete('/users/:id', requireAdmin, audit('ADMIN_DELETE_USER', 'user'), async (req: AuthenticatedRequest, res: Response) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  return res.json({ success: true, message: 'User deleted' });
});

// ─────────────────────────────────────────────────────────────
// CAFES (Admin CRUD)
// ─────────────────────────────────────────────────────────────

router.get('/cafes', requireAdminOrOwner, audit('ADMIN_LIST_CAFES', 'cafe'), async (req: AuthenticatedRequest, res: Response) => {
  const cafes = await prisma.cafe.findMany({
    where: req.user?.role === 'CAFE_OWNER'
      ? { email: req.user.email }
      : {},
    include: {
      _count: { select: { tables: true, menu_items: true, orders: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  const mapped = cafes.map(c => ({
    ...mapCafe(c),
    _count: c._count,
  }));

  return res.json({ success: true, data: mapped });
});

router.post('/cafes', requireAdmin, audit('ADMIN_CREATE_CAFE', 'cafe'), async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body as any;
  const id = uuidv4();

  // Parse opening hours string like "09:00 - 22:00"
  let openTime = '09:00';
  let closeTime = '22:00';
  if (body.openingHours) {
    const parts = String(body.openingHours).split('-');
    if (parts.length === 2) {
      openTime = parts[0].trim();
      closeTime = parts[1].trim();
    }
  }

  // Parse tags/moods (comma-separated string or array)
  const parseList = (val: any) => {
    if (!val) return '[]';
    if (Array.isArray(val)) return JSON.stringify(val);
    return JSON.stringify(String(val).split(',').map((s: string) => s.trim()).filter(Boolean));
  };

  // Parse images (newline or comma-separated)
  const parseImages = (val: any) => {
    if (!val) return '[]';
    if (Array.isArray(val)) return JSON.stringify(val);
    const urls = String(val).split(/[\n,]/).map((s: string) => s.trim()).filter(Boolean);
    return JSON.stringify(urls);
  };

  const slug = `${String(body.name || 'cafe').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${id.slice(0, 8)}`;

  await prisma.cafe.create({
    data: {
      id,
      name: body.name,
      slug,
      description: body.description || null,
      address: body.address,
      city: body.city || 'Mumbai',
      phone: body.phone || null,
      email: body.email || null,
      image_url: body.imageUrl || null,
      images: parseImages(body.images),
      latitude: body.lat ? parseFloat(String(body.lat)) : null,
      longitude: body.lng ? parseFloat(String(body.lng)) : null,
      price_level: parseInt(String(body.priceLevel || 2), 10),
      prep_time_minutes: parseInt(String(body.prepTimeMinutes || 15), 10),
      delivery_fee: parseFloat(String(body.deliveryFee || 0)),
      min_order: parseFloat(String(body.minOrder || 0)),
      upi_id: body.upiId || null,
      wifi: body.wifi ? 1 : 0,
      parking: body.parking ? 1 : 0,
      pet_friendly: body.petFriendly ? 1 : 0,
      is_open: body.isOpen !== false ? 1 : 0,
      is_active: 1,
      open_time: openTime,
      close_time: closeTime,
      tags: parseList(body.tags),
      moods: parseList(body.moods),
    },
  });

  return res.status(201).json({ success: true, data: { id } });
});

router.patch('/cafes/:id', requireAdminOrOwner, audit('ADMIN_UPDATE_CAFE', 'cafe'), async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body as any;
  if (req.user?.role === 'CAFE_OWNER') {
    const cafe = await prisma.cafe.findUnique({ where: { id: req.params.id }, select: { email: true } });
    if (!cafe || cafe.email !== req.user.email) {
      return res.status(403).json({ success: false, message: 'You can only edit your own cafe' });
    }
  }

  const parseList = (val: any) => {
    if (val === undefined) return undefined;
    if (Array.isArray(val)) return JSON.stringify(val);
    return JSON.stringify(String(val).split(',').map((s: string) => s.trim()).filter(Boolean));
  };

  const parseImages = (val: any) => {
    if (val === undefined) return undefined;
    if (Array.isArray(val)) return JSON.stringify(val);
    const urls = String(val).split(/[\n,]/).map((s: string) => s.trim()).filter(Boolean);
    return JSON.stringify(urls);
  };

  let openTime: string | undefined;
  let closeTime: string | undefined;
  if (body.openingHours) {
    const parts = String(body.openingHours).split('-');
    if (parts.length === 2) {
      openTime = parts[0].trim();
      closeTime = parts[1].trim();
    }
  }

  const updateData: any = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (req.user?.role !== 'CAFE_OWNER' && body.address !== undefined) updateData.address = body.address;
  if (req.user?.role !== 'CAFE_OWNER' && body.city !== undefined) updateData.city = body.city;
  if (body.phone !== undefined) updateData.phone = body.phone;
  if (body.email !== undefined) updateData.email = body.email;
  if (body.imageUrl !== undefined) updateData.image_url = body.imageUrl;
  if (body.images !== undefined) updateData.images = parseImages(body.images);
  if (req.user?.role !== 'CAFE_OWNER' && body.lat !== undefined) updateData.latitude = parseFloat(String(body.lat));
  if (req.user?.role !== 'CAFE_OWNER' && body.lng !== undefined) updateData.longitude = parseFloat(String(body.lng));
  if (req.user?.role !== 'CAFE_OWNER' && body.priceLevel !== undefined) updateData.price_level = parseInt(String(body.priceLevel), 10);
  if (body.prepTimeMinutes !== undefined) updateData.prep_time_minutes = parseInt(String(body.prepTimeMinutes), 10);
  if (req.user?.role !== 'CAFE_OWNER' && body.deliveryFee !== undefined) updateData.delivery_fee = parseFloat(String(body.deliveryFee));
  if (req.user?.role !== 'CAFE_OWNER' && body.minOrder !== undefined) updateData.min_order = parseFloat(String(body.minOrder));
  if (req.user?.role !== 'CAFE_OWNER' && body.upiId !== undefined) updateData.upi_id = body.upiId;
  if (body.wifi !== undefined) updateData.wifi = body.wifi ? 1 : 0;
  if (body.parking !== undefined) updateData.parking = body.parking ? 1 : 0;
  if (body.petFriendly !== undefined) updateData.pet_friendly = body.petFriendly ? 1 : 0;
  if (body.isOpen !== undefined) updateData.is_open = body.isOpen ? 1 : 0;
  if (body.isActive !== undefined) updateData.is_active = body.isActive ? 1 : 0;
  if (openTime) updateData.open_time = openTime;
  if (closeTime) updateData.close_time = closeTime;
  if (body.tags !== undefined) updateData.tags = parseList(body.tags);
  if (body.moods !== undefined) updateData.moods = parseList(body.moods);
  if (body.rating !== undefined) updateData.rating = parseFloat(String(body.rating));

  await prisma.cafe.update({ where: { id: req.params.id }, data: updateData });
  return res.json({ success: true, message: 'Cafe updated' });
});

router.delete('/cafes/:id', requireAdmin, audit('ADMIN_DELETE_CAFE', 'cafe'), async (req: AuthenticatedRequest, res: Response) => {
  await prisma.cafe.delete({ where: { id: req.params.id } });
  return res.json({ success: true, message: 'Cafe deleted' });
});

// ─────────────────────────────────────────────────────────────
// TABLES (Admin CRUD)
// ─────────────────────────────────────────────────────────────

router.get('/cafes/:cafeId/tables', requireAdminOrOwner, async (req: AuthenticatedRequest, res: Response) => {
  const tables = await prisma.table.findMany({
    where: { cafe_id: req.params.cafeId },
    orderBy: { table_number: 'asc' },
  });
  return res.json({ success: true, data: tables });
});

router.post('/cafes/:cafeId/tables', requireAdminOrOwner, async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body as any;
  const table = await prisma.table.create({
    data: {
      id: uuidv4(),
      cafe_id: req.params.cafeId,
      table_number: body.tableNumber || body.table_number,
      capacity: parseInt(String(body.capacity || 2), 10),
      floor: body.floor || 'Ground',
      position_x: parseFloat(String(body.position_x || body.positionX || 0)),
      position_y: parseFloat(String(body.position_y || body.positionY || 0)),
    },
  });
  return res.status(201).json({ success: true, data: table });
});

router.patch('/tables/:id', requireAdminOrOwner, async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body as any;
  const updateData: any = {};
  if (body.tableNumber !== undefined) updateData.table_number = body.tableNumber;
  if (body.capacity !== undefined) updateData.capacity = parseInt(String(body.capacity), 10);
  if (body.floor !== undefined) updateData.floor = body.floor;
  if (body.isAvailable !== undefined) updateData.is_available = body.isAvailable ? 1 : 0;

  await prisma.table.update({ where: { id: req.params.id }, data: updateData });
  return res.json({ success: true, message: 'Table updated' });
});

router.delete('/tables/:id', requireAdminOrOwner, async (req: AuthenticatedRequest, res: Response) => {
  await prisma.table.delete({ where: { id: req.params.id } });
  return res.json({ success: true, message: 'Table deleted' });
});

// ─────────────────────────────────────────────────────────────
// ORDERS (Admin view)
// ─────────────────────────────────────────────────────────────

router.get('/orders', requireAdminOrOwner, audit('ADMIN_LIST_ORDERS', 'order'), async (req: AuthenticatedRequest, res: Response) => {
  const limit = Math.min(parseInt(String(req.query.limit || '50'), 10), 200);
  const offset = parseInt(String(req.query.offset || '0'), 10);
  const statusFilter = req.query.status as string | undefined;

  const orders = await prisma.order.findMany({
    where: statusFilter ? { status: statusFilter } : {},
    include: {
      user: { select: { id: true, name: true, email: true } },
      cafe: { select: { id: true, name: true, address: true } },
    },
    orderBy: { created_at: 'desc' },
    take: limit,
    skip: offset,
  });

  const mapped = orders.map(o => ({
    id: o.id,
    orderNumber: o.id.slice(0, 8).toUpperCase(),
    status: o.status,
    type: o.order_type,
    subtotal: o.subtotal,
    tax: o.tax,
    deliveryFee: o.delivery_fee,
    discount: o.discount,
    total: o.total,
    paymentStatus: o.payment_status,
    paymentMethod: o.payment_method,
    items: tryParse(o.items, []),
    specialInstructions: o.special_instructions,
    created_at: o.created_at,
    updated_at: o.updated_at,
    user: o.user,
    cafe: o.cafe,
  }));

  return res.json({ success: true, data: mapped });
});

router.patch('/orders/:id', requireAdminOrOwner, audit('ADMIN_UPDATE_ORDER', 'order'), async (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.body as { status: string };
  await prisma.order.update({ where: { id: req.params.id }, data: { status } });
  return res.json({ success: true, message: 'Order status updated' });
});

// ─────────────────────────────────────────────────────────────
// RESERVATIONS (Admin view)
// ─────────────────────────────────────────────────────────────

router.get('/reservations', requireAdminOrOwner, audit('ADMIN_LIST_RESERVATIONS', 'reservation'), async (req: AuthenticatedRequest, res: Response) => {
  const limit = Math.min(parseInt(String(req.query.limit || '50'), 10), 200);
  const statusFilter = req.query.status as string | undefined;

  const reservations = await prisma.reservation.findMany({
    where: statusFilter ? { status: statusFilter } : {},
    include: {
      user: { select: { id: true, name: true, email: true } },
      cafe: { select: { id: true, name: true, address: true } },
      table: { select: { id: true, table_number: true, capacity: true } },
    },
    orderBy: { created_at: 'desc' },
    take: limit,
  });

  const mapped = reservations.map(r => ({
    id: r.id,
    confirmationCode: r.confirmation_code,
    date: r.date,
    time: r.time,
    partySize: r.party_size,
    durationMinutes: r.duration_minutes,
    status: r.status,
    specialRequests: r.special_requests,
    createdAt: r.created_at,
    user: r.user,
    cafe: r.cafe,
    table: r.table,
  }));

  return res.json({ success: true, data: mapped });
});

router.patch('/reservations/:id', requireAdminOrOwner, audit('ADMIN_UPDATE_RESERVATION', 'reservation'), async (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.body as { status: string };
  await prisma.reservation.update({ where: { id: req.params.id }, data: { status } });
  return res.json({ success: true, message: 'Reservation updated' });
});

// ─────────────────────────────────────────────────────────────
// CAFE OWNERS
// ─────────────────────────────────────────────────────────────

router.get('/cafe-owners', requireAdmin, audit('ADMIN_LIST_CAFE_OWNERS', 'user'), async (_req: AuthenticatedRequest, res: Response) => {
  const owners = await prisma.user.findMany({
    where: { role: 'CAFE_OWNER' },
    select: {
      id: true, name: true, email: true, phone: true,
      is_active: true, auth_provider: true, created_at: true,
    },
    orderBy: { created_at: 'desc' },
  });

  const cafeCounts = await Promise.all(
    owners.map(o => prisma.cafe.count({ where: { email: o.email } }))
  );

  const statusFor = (owner: { is_active: number; auth_provider: string }) => {
    if (owner.auth_provider === 'owner_rejected') return 'REJECTED';
    if (owner.is_active === 1) return 'APPROVED';
    return 'PENDING_APPROVAL';
  };

  return res.json({
    success: true,
    data: owners.map((o, index) => ({
      ...o,
      isActive: o.is_active === 1,
      verificationStatus: statusFor(o),
      _count: { ownedCafes: cafeCounts[index] },
    })),
  });
});

router.post('/cafe-owners', requireAdmin, audit('ADMIN_CREATE_CAFE_OWNER', 'user'), async (req: AuthenticatedRequest, res: Response) => {
  const { name, email, password, phone } = req.body as { name: string; email: string; password: string; phone?: string };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

  const passwordHash = await bcrypt.hash(password || uuidv4(), 12);
  const id = uuidv4();

  await prisma.user.create({
    data: { id, name, email, phone: phone || null, password_hash: passwordHash, role: 'CAFE_OWNER' },
  });

  return res.status(201).json({ success: true, data: { id } });
});

router.patch('/cafe-owners/:id', requireAdmin, audit('ADMIN_UPDATE_CAFE_OWNER', 'user'), async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body as any;
  const updateData: any = {};
  if (body.name) updateData.name = body.name;
  if (body.phone !== undefined) updateData.phone = body.phone;
  if (body.isActive !== undefined) updateData.is_active = body.isActive ? 1 : 0;

  await prisma.user.update({ where: { id: req.params.id }, data: updateData });
  return res.json({ success: true, message: 'Cafe owner updated' });
});

router.post('/cafe-owners/:id/approve', requireAdmin, audit('ADMIN_APPROVE_CAFE_OWNER', 'user'), async (req: AuthenticatedRequest, res: Response) => {
  const owner = await prisma.user.update({
    where: { id: req.params.id },
    data: { role: 'CAFE_OWNER', is_active: 1, auth_provider: 'password', verification_status: 'APPROVED' },
    select: { id: true, email: true },
  });

  await prisma.cafe.updateMany({
    where: {
      OR: [
        { owner_id: owner.id },
        { email: owner.email },
      ],
    },
    data: { is_active: 1 },
  });

  return res.json({ success: true, status: 'APPROVED', message: 'Cafe owner approved' });
});

router.post('/cafe-owners/:id/reject', requireAdmin, audit('ADMIN_REJECT_CAFE_OWNER', 'user'), async (req: AuthenticatedRequest, res: Response) => {
  const owner = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, email: true, auth_provider: true, is_active: true },
  });

  if (!owner) {
    return res.status(404).json({ success: false, message: 'Cafe owner application not found' });
  }

  await prisma.$transaction(async (tx) => {
    await tx.cafe.deleteMany({
      where: {
        is_active: 0,
        OR: [
          { owner_id: owner.id },
          { email: owner.email },
        ],
      },
    });

    await tx.user.delete({ where: { id: owner.id } });
  });

  return res.json({ success: true, status: 'REJECTED', message: 'Cafe owner application denied and deleted' });
});

router.delete('/cafe-owners/:id', requireAdmin, audit('ADMIN_DELETE_CAFE_OWNER', 'user'), async (req: AuthenticatedRequest, res: Response) => {
  // Downgrade to USER instead of deleting to preserve referential integrity
  await prisma.user.update({ where: { id: req.params.id }, data: { role: 'USER', is_active: 0 } });
  return res.json({ success: true, message: 'Cafe owner access revoked' });
});

// ─────────────────────────────────────────────────────────────
// MENU ITEMS (Admin CRUD)
// ─────────────────────────────────────────────────────────────

router.get('/menu/items', requireAdminOrOwner, async (req: AuthenticatedRequest, res: Response) => {
  const { cafeId, cafe_id, categoryId } = req.query as Record<string, string>;
  const where: any = {};
  if (cafeId || cafe_id) where.cafe_id = cafeId || cafe_id;
  if (categoryId) where.category_id = categoryId;

  const items = await prisma.menuItem.findMany({
    where,
    include: { category: { select: { name: true } }, cafe: { select: { name: true } } },
    orderBy: { created_at: 'desc' },
    take: 500,
  });

  return res.json({
    success: true,
    data: items.map(i => ({
      id: i.id,
      name: i.name,
      description: i.description,
      price: i.price,
      imageUrl: i.image_url,
      isAvailable: i.is_available === 1,
      isVeg: i.is_veg === 1,
      isPopular: i.is_popular === 1,
      stockQuantity: i.stock_quantity,
      prepTimeMinutes: i.prep_time_minutes,
      calories: i.calories,
      allergens: tryParse(i.allergens, []),
      cafeId: i.cafe_id,
      cafeName: i.cafe?.name,
      categoryId: i.category_id,
      categoryName: i.category?.name,
    })),
  });
});

router.post('/menu/items', requireAdminOrOwner, async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body as any;
  const item = await prisma.menuItem.create({
    data: {
      id: uuidv4(),
      cafe_id: body.cafeId || body.cafe_id,
      category_id: body.categoryId || body.category_id || null,
      name: body.name,
      description: body.description || null,
      price: parseFloat(String(body.price || 0)),
      image_url: body.imageUrl || null,
      is_available: body.isAvailable !== false ? 1 : 0,
      is_veg: body.isVeg ? 1 : 0,
      is_popular: body.isPopular ? 1 : 0,
      stock_quantity: parseInt(String(body.stockQuantity || 999), 10),
      prep_time_minutes: parseInt(String(body.prepTimeMinutes || 10), 10),
      calories: body.calories ? parseInt(String(body.calories), 10) : null,
    },
  });
  return res.status(201).json({ success: true, data: { id: item.id } });
});

router.patch('/menu/items/:id', requireAdminOrOwner, async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body as any;
  const updateData: any = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.price !== undefined) updateData.price = parseFloat(String(body.price));
  if (body.imageUrl !== undefined) updateData.image_url = body.imageUrl;
  if (body.isAvailable !== undefined) updateData.is_available = body.isAvailable ? 1 : 0;
  if (body.isVeg !== undefined) updateData.is_veg = body.isVeg ? 1 : 0;
  if (body.isPopular !== undefined) updateData.is_popular = body.isPopular ? 1 : 0;
  if (body.stockQuantity !== undefined) updateData.stock_quantity = parseInt(String(body.stockQuantity), 10);
  if (body.prepTimeMinutes !== undefined) updateData.prep_time_minutes = parseInt(String(body.prepTimeMinutes), 10);
  if (body.calories !== undefined) updateData.calories = body.calories ? parseInt(String(body.calories), 10) : null;
  if (body.categoryId !== undefined) updateData.category_id = body.categoryId || null;

  await prisma.menuItem.update({ where: { id: req.params.id }, data: updateData });
  return res.json({ success: true, message: 'Menu item updated' });
});

router.delete('/menu/items/:id', requireAdminOrOwner, async (req: AuthenticatedRequest, res: Response) => {
  await prisma.menuItem.delete({ where: { id: req.params.id } });
  return res.json({ success: true, message: 'Menu item deleted' });
});

// Also expose public route alias for menu items (web api uses /menu/items)
router.get('/menu/categories', requireAdminOrOwner, async (req: AuthenticatedRequest, res: Response) => {
  const { cafeId, cafe_id } = req.query as Record<string, string>;
  const where: any = {};
  if (cafeId || cafe_id) where.cafe_id = cafeId || cafe_id;

  const categories = await prisma.menuCategory.findMany({ where, orderBy: { sort_order: 'asc' } });
  return res.json({ success: true, data: categories });
});

// ─────────────────────────────────────────────────────────────
// BANNERS
// ─────────────────────────────────────────────────────────────

function mapBanner(b: any) {
  return {
    id: b.id,
    sliderType: b.slider_type,
    tag: b.tag,
    tagIcon: b.tag_icon,
    tagColor: b.tag_color,
    tagBg: b.tag_bg,
    title: b.title,
    titleAccent: b.title_accent,
    subtitle: b.subtitle,
    subtitleColor: b.subtitle_color,
    ctaText: b.cta_text,
    ctaBg: b.cta_bg,
    ctaTextColor: b.cta_text_color,
    bgColor: b.bg_color,
    overlayColor: b.overlay_color,
    stripeColor: b.stripe_color,
    emoji: b.emoji,
    emojiLabel: b.emoji_label,
    emojiLabelColor: b.emoji_label_color,
    badge: b.badge,
    bgImage: b.bg_image,
    cafeId: b.cafe_id,
    isActive: b.is_active === 1,
    sortOrder: b.sort_order,
    createdAt: b.created_at,
  };
}

router.get('/banners', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  const banners = await (prisma as any).banner.findMany({ orderBy: { sort_order: 'asc' } });
  return res.json({ success: true, data: banners.map(mapBanner) });
});

router.post('/banners', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body as any;
  const banner = await (prisma as any).banner.create({
    data: {
      id: uuidv4(),
      slider_type: body.sliderType || 'PROMO',
      tag: body.tag || '',
      tag_icon: body.tagIcon || '⚡',
      tag_color: body.tagColor || '#FFFFFF',
      tag_bg: body.tagBg || 'rgba(255,107,0,0.2)',
      title: body.title || '',
      title_accent: body.titleAccent || '',
      subtitle: body.subtitle || '',
      subtitle_color: body.subtitleColor || '#FFBB88',
      cta_text: body.ctaText || 'Explore now',
      cta_bg: body.ctaBg || '#FFFFFF',
      cta_text_color: body.ctaTextColor || '#000000',
      bg_color: body.bgColor || '#3D2010',
      overlay_color: body.overlayColor || 'rgba(30,14,4,0.5)',
      stripe_color: body.stripeColor || 'rgba(255,107,0,0.1)',
      emoji: body.emoji || '☕',
      emoji_label: body.emojiLabel || 'FRESH BREW',
      emoji_label_color: body.emojiLabelColor || '#FFFFFF',
      badge: body.badge || '',
      bg_image: body.bgImage || '',
      cafe_id: body.cafeId || null,
      is_active: body.isActive !== false ? 1 : 0,
      sort_order: parseInt(String(body.sortOrder || 0), 10),
    },
  });
  return res.status(201).json({ success: true, data: mapBanner(banner) });
});

router.patch('/banners/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body as any;
  const updateData: any = {};
  if (body.sliderType !== undefined) updateData.slider_type = body.sliderType;
  if (body.tag !== undefined) updateData.tag = body.tag;
  if (body.tagIcon !== undefined) updateData.tag_icon = body.tagIcon;
  if (body.tagColor !== undefined) updateData.tag_color = body.tagColor;
  if (body.tagBg !== undefined) updateData.tag_bg = body.tagBg;
  if (body.title !== undefined) updateData.title = body.title;
  if (body.titleAccent !== undefined) updateData.title_accent = body.titleAccent;
  if (body.subtitle !== undefined) updateData.subtitle = body.subtitle;
  if (body.subtitleColor !== undefined) updateData.subtitle_color = body.subtitleColor;
  if (body.ctaText !== undefined) updateData.cta_text = body.ctaText;
  if (body.ctaBg !== undefined) updateData.cta_bg = body.ctaBg;
  if (body.ctaTextColor !== undefined) updateData.cta_text_color = body.ctaTextColor;
  if (body.bgColor !== undefined) updateData.bg_color = body.bgColor;
  if (body.overlayColor !== undefined) updateData.overlay_color = body.overlayColor;
  if (body.stripeColor !== undefined) updateData.stripe_color = body.stripeColor;
  if (body.emoji !== undefined) updateData.emoji = body.emoji;
  if (body.emojiLabel !== undefined) updateData.emoji_label = body.emojiLabel;
  if (body.emojiLabelColor !== undefined) updateData.emoji_label_color = body.emojiLabelColor;
  if (body.badge !== undefined) updateData.badge = body.badge;
  if (body.bgImage !== undefined) updateData.bg_image = body.bgImage;
  if (body.cafeId !== undefined) updateData.cafe_id = body.cafeId || null;
  if (body.isActive !== undefined) updateData.is_active = body.isActive ? 1 : 0;
  if (body.sortOrder !== undefined) updateData.sort_order = parseInt(String(body.sortOrder), 10);

  const banner = await (prisma as any).banner.update({
    where: { id: req.params.id },
    data: updateData,
  });
  return res.json({ success: true, data: mapBanner(banner) });
});

router.delete('/banners/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  await (prisma as any).banner.delete({ where: { id: req.params.id } });
  return res.json({ success: true, message: 'Banner deleted' });
});

// ─────────────────────────────────────────────────────────────
// REWARDS (Admin CRUD)
// ─────────────────────────────────────────────────────────────

router.get('/rewards', requireAdminOrOwner, async (_req: AuthenticatedRequest, res: Response) => {
  const rewards = await prisma.reward.findMany({ orderBy: { created_at: 'desc' } });
  const mapped = rewards.map(r => ({
    ...r,
    approvalStatus: r.stock === -2 ? 'REJECTED' : r.is_active === 1 ? 'ACTIVE' : 'PENDING_APPROVAL',
  }));
  return res.json({ success: true, data: mapped });
});

router.post('/rewards', requireAdminOrOwner, async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body as any;
  const reward = await prisma.reward.create({
    data: {
      id: uuidv4(),
      name: body.name,
      icon: body.icon || '🎁',
      category: body.category || 'Food & Drink',
      description: body.description || null,
      points_cost: parseInt(String(body.pointsCost || body.points_cost || 100), 10),
      tier_required: body.tierRequired || body.tier_required || 'SILVER',
      stock: parseInt(String(body.stock || -1), 10),
      is_active: req.user?.role === 'CAFE_OWNER' ? 0 : body.isActive !== false ? 1 : 0,
    },
  });
  return res.status(201).json({
    success: true,
    status: req.user?.role === 'CAFE_OWNER' ? 'PENDING_APPROVAL' : 'ACTIVE',
    data: { id: reward.id },
  });
});

router.patch('/rewards/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body as any;
  const updateData: any = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.icon !== undefined) updateData.icon = body.icon;
  if (body.category !== undefined) updateData.category = body.category;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.pointsCost !== undefined) updateData.points_cost = parseInt(String(body.pointsCost), 10);
  if (body.tierRequired !== undefined) updateData.tier_required = body.tierRequired;
  if (body.stock !== undefined) updateData.stock = parseInt(String(body.stock), 10);
  if (body.isActive !== undefined) updateData.is_active = body.isActive ? 1 : 0;

  await prisma.reward.update({ where: { id: req.params.id }, data: updateData });
  return res.json({ success: true, message: 'Reward updated' });
});

router.post('/rewards/:id/approve', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  await prisma.reward.update({
    where: { id: req.params.id },
    data: { is_active: 1, stock: -1 },
  });
  return res.json({ success: true, status: 'ACTIVE', message: 'Reward approved' });
});

router.post('/rewards/:id/reject', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  await prisma.reward.update({
    where: { id: req.params.id },
    data: { is_active: 0, stock: -2 },
  });
  return res.json({ success: true, status: 'REJECTED', message: 'Reward rejected' });
});

router.delete('/rewards/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  await prisma.reward.update({ where: { id: req.params.id }, data: { is_active: 0 } });
  return res.json({ success: true, message: 'Reward deactivated' });
});

router.get('/rewards/redemptions', requireAdminOrOwner, async (_req: AuthenticatedRequest, res: Response) => {
  const redemptions = await prisma.redeemedReward.findMany({
    include: {
      user: { select: { name: true, email: true } },
      reward: { select: { name: true, icon: true } },
    },
    orderBy: { created_at: 'desc' },
    take: 100,
  });
  return res.json({ success: true, data: redemptions });
});

export default router;
