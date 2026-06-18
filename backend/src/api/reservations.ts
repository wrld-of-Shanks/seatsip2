import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticate } from '../common/auth';
import { AuthenticatedRequest } from '../types/authenticated-request';
import { validate, audit } from '../security/http';
import { secureLogger } from '../security/logger';
import { sendPushToUser } from '../services/pushNotifications';

const router = Router();
router.use(authenticate);

const reservationItemSchema = z.object({
  menu_item_id: z.string().min(1),
  quantity: z.number().int().min(1).max(50),
});

const reservationPostSchema = z.object({
  cafe_id: z.string().min(1),
  table_id: z.string().min(1).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/),
  party_size: z.number().int().min(1).max(20),
  special_requests: z.union([z.string().max(500), z.null()]).optional(),
  pre_order_items: z.array(reservationItemSchema).optional().default([]),
  duration_minutes: z.number().int().min(15).max(480).optional(),
});

const DEFAULT_RESERVATION_DURATION_MIN = 90;

const reservationIdParamsSchema = z.object({ id: z.string().min(1) });
const preOrderUpdateBodySchema = z.object({
  pre_order_items: z.array(reservationItemSchema),
});

function generateConfirmationCode(): string {
  return 'SS' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

/** Parse "HH:MM" or "HH:MM:SS" to minutes from midnight. */
function timeToMinutes(t: string): number {
  const parts = String(t || '')
    .trim()
    .split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
  return h * 60 + m;
}

function reservationRangesOverlap(startA: number, durA: number, startB: number, durB: number): boolean {
  const endA = startA + durA;
  const endB = startB + durB;
  return startA < endB && startB < endA;
}

// GET /reservations
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const reservations = await prisma.reservation.findMany({
    where: { user_id: req.user.userId },
    include: {
      cafe: { select: { name: true, image_url: true, address: true } },
      table: { select: { table_number: true, capacity: true, floor: true } },
    },
    orderBy: [{ date: 'desc' }, { time: 'desc' }],
  });

  const data = reservations.map(({ cafe: c, table: t, ...r }) => ({
    ...r,
    cafe_name: c.name,
    cafe_image: c.image_url,
    cafe_address: c.address,
    table_number: t?.table_number,
    table_capacity: t?.capacity,
    table_floor: t?.floor,
  }));

  secureLogger.info(`[Reservations] List for user ${req.user.userId}: ${data.length} reservations found`);
  return res.json({ success: true, data });
});

// GET /reservations/:id
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const res_ = await prisma.reservation.findFirst({
    where: { id: req.params.id, user_id: req.user.userId },
    include: {
      cafe: { select: { name: true, image_url: true, address: true, phone: true } },
      table: { select: { table_number: true, capacity: true, floor: true } },
    },
  });

  if (!res_) {
    secureLogger.warn(`[Reservations] Get ${req.params.id}: not found for user ${req.user.userId}`);
    return res.status(404).json({ success: false, message: 'Reservation not found' });
  }
  const pre_order_items = JSON.parse(res_.pre_order_items || '[]');
  const { cafe, table, ...rest } = res_;
  return res.json({
    success: true,
    data: {
      ...rest,
      pre_order_items,
      cafe_name: cafe.name,
      cafe_image: cafe.image_url,
      cafe_address: cafe.address,
      cafe_phone: cafe.phone,
      table_number: table?.table_number,
      table_capacity: table?.capacity,
      table_floor: table?.floor,
    },
  });
});

// POST /reservations
router.post(
  '/',
  validate({ body: reservationPostSchema }),
  audit('RESERVATION_CREATE', 'reservation'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = req.body as z.infer<typeof reservationPostSchema>;
      const { cafe_id, table_id, date, time, party_size, special_requests, pre_order_items } = body;
      const rawDuration = body.duration_minutes;
      const durationMinutes =
        typeof rawDuration === 'number' && Number.isFinite(rawDuration)
          ? Math.min(480, Math.max(15, Math.floor(rawDuration)))
          : DEFAULT_RESERVATION_DURATION_MIN;

      const newStart = timeToMinutes(time);
      if (Number.isNaN(newStart)) {
        return res.status(400).json({ success: false, message: 'Invalid time format' });
      }

      const cafe = await prisma.cafe.findUnique({ where: { id: cafe_id } });
      if (!cafe) return res.status(404).json({ success: false, message: 'Cafe not found' });

      if (table_id) {
        const table = await prisma.table.findFirst({ where: { id: table_id, cafe_id } });
        if (!table) return res.status(404).json({ success: false, message: 'Table not found in this cafe' });
        if (party_size > table.capacity) {
          return res.status(400).json({ success: false, message: 'Party size exceeds table capacity' });
        }

        const candidates = await prisma.reservation.findMany({
          where: {
            cafe_id,
            table_id,
            date,
            status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          },
        });

        for (const row of candidates) {
          const existingDur = row.duration_minutes ?? DEFAULT_RESERVATION_DURATION_MIN;
          const existingStart = timeToMinutes(row.time);
          if (Number.isNaN(existingStart)) continue;
          if (!reservationRangesOverlap(newStart, durationMinutes, existingStart, existingDur)) continue;

          const sameIdempotentSlot =
            row.user_id === req.user.userId && existingStart === newStart && existingDur === durationMinutes;

          if (sameIdempotentSlot) {
            const existingRes = await prisma.reservation.findFirst({
              where: { id: row.id },
              include: { cafe: { select: { name: true, address: true } } },
            });
            if (existingRes) {
              const po = JSON.parse(existingRes.pre_order_items || '[]');
              const { cafe: ec, ...er } = existingRes;
              return res.status(200).json({
                success: true,
                data: {
                  ...er,
                  pre_order_items: po,
                  cafe_name: ec.name,
                  cafe_address: ec.address,
                },
                message: 'Using existing reservation',
              });
            }
          }

          return res.status(409).json({ success: false, message: 'Table already booked for an overlapping time slot' });
        }
      }

      let preOrderTotal = 0;
      const enrichedPreOrder: Record<string, unknown>[] = [];

      for (const item of pre_order_items) {
        const menuItem = await prisma.menuItem.findUnique({ where: { id: item.menu_item_id } });
        if (menuItem) {
          const lineTotal = menuItem.price * item.quantity;
          preOrderTotal += lineTotal;
          enrichedPreOrder.push({ ...menuItem, quantity: item.quantity, line_total: lineTotal });
        }
      }

      const id = uuidv4();
      let code = generateConfirmationCode();
      for (let attempt = 0; attempt < 5; attempt++) {
        const clash = await prisma.reservation.findUnique({ where: { confirmation_code: code } });
        if (!clash) break;
        code = generateConfirmationCode();
      }

      await prisma.reservation.create({
        data: {
          id,
          user_id: req.user.userId,
          cafe_id,
          table_id: table_id || null,
          date,
          time,
          duration_minutes: durationMinutes,
          party_size,
          status: 'CONFIRMED',
          special_requests: special_requests || null,
          pre_order_items: JSON.stringify(enrichedPreOrder),
          pre_order_total: preOrderTotal,
          confirmation_code: code,
        },
      });

      await prisma.notification.create({
        data: {
          id: uuidv4(),
          user_id: req.user.userId,
          title: '✅ Table Reserved!',
          body: `Your table at ${cafe.name} on ${date} at ${time} is confirmed. Code: ${code}`,
          type: 'RESERVATION',
        },
      });

      const reservation = await prisma.reservation.findFirst({
        where: { id },
        include: { cafe: { select: { name: true, address: true } } },
      });

      const out = reservation
        ? (() => {
            const { cafe: c, ...rest } = reservation;
            return {
              ...rest,
              pre_order_items: JSON.parse(reservation.pre_order_items || '[]'),
              cafe_name: c.name,
              cafe_address: c.address,
            };
          })()
        : null;

      void sendPushToUser(req.user.userId, 'Table reserved', `Your table at ${cafe.name} on ${date} at ${time} is confirmed.`, {
        type: 'RESERVATION',
        reservationId: String(id),
      });

      secureLogger.info(`[Reservations] Created: ${id} for user ${req.user.userId}, cafe ${cafe_id}, ${date} ${time}`);
      return res.status(201).json({ success: true, data: out });
    } catch (error: unknown) {
      secureLogger.error('[Reservations] Create failed', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during reservation',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      });
    }
  }
);

// PATCH /reservations/:id/pre-order
router.patch(
  '/:id/pre-order',
  validate({ params: reservationIdParamsSchema, body: preOrderUpdateBodySchema }),
  audit('RESERVATION_PRE_ORDER_UPDATE', 'reservation'),
  async (req: AuthenticatedRequest, res: Response) => {
    const reservation = await prisma.reservation.findFirst({
      where: { id: req.params.id, user_id: req.user.userId },
    });
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });
    if (reservation.status !== 'CONFIRMED') {
      return res.status(400).json({ success: false, message: 'Pre-order can only be updated for confirmed reservations' });
    }

    const { pre_order_items } = req.body as z.infer<typeof preOrderUpdateBodySchema>;
    let preOrderTotal = 0;
    const enrichedPreOrder: Record<string, unknown>[] = [];

    for (const item of pre_order_items) {
      const menuItem = await prisma.menuItem.findFirst({
        where: { id: item.menu_item_id, cafe_id: reservation.cafe_id },
      });
      if (!menuItem) {
        return res.status(400).json({ success: false, message: `Invalid menu item: ${item.menu_item_id}` });
      }
      const lineTotal = menuItem.price * item.quantity;
      preOrderTotal += lineTotal;
      enrichedPreOrder.push({ ...menuItem, quantity: item.quantity, line_total: lineTotal });
    }

    await prisma.reservation.update({
      where: { id: reservation.id },
      data: { pre_order_items: JSON.stringify(enrichedPreOrder), pre_order_total: preOrderTotal },
    });

    const updated = await prisma.reservation.findFirst({
      where: { id: reservation.id, user_id: req.user.userId },
      include: {
        cafe: { select: { name: true, image_url: true, address: true, phone: true } },
        table: { select: { table_number: true, capacity: true, floor: true } },
      },
    });
    if (!updated) return res.status(404).json({ success: false, message: 'Reservation not found' });

    secureLogger.info(`[Reservations] Pre-order updated for reservation ${req.params.id}, user ${req.user.userId}`);
    const { cafe, table, ...rest } = updated;
    return res.json({
      success: true,
      data: {
        ...rest,
        pre_order_items: JSON.parse(updated.pre_order_items || '[]'),
        cafe_name: cafe.name,
        cafe_image: cafe.image_url,
        cafe_address: cafe.address,
        cafe_phone: cafe.phone,
        table_number: table?.table_number,
        table_capacity: table?.capacity,
        table_floor: table?.floor,
      },
    });
  }
);

// PATCH /reservations/:id/cancel
router.patch('/:id/cancel', async (req: AuthenticatedRequest, res: Response) => {
  const reservation = await prisma.reservation.findFirst({
    where: { id: req.params.id, user_id: req.user.userId },
  });
  if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });
  if (['CANCELLED', 'COMPLETED'].includes(reservation.status)) {
    return res.status(400).json({ success: false, message: 'Reservation already cancelled/completed' });
  }

  await prisma.reservation.update({
    where: { id: reservation.id },
    data: {
      status: 'CANCELLED',
      cancelled_at: new Date(),
      cancellation_reason: (req.body as { reason?: string })?.reason ?? null,
    },
  });

  secureLogger.info(`[Reservations] Cancelled: ${reservation.id} for user ${req.user.userId}`);
  return res.json({ success: true, message: 'Reservation cancelled' });
});

export default router;
