import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../db';

/** Permanently anonymize accounts whose deletion grace period has ended. Safe to call on each boot. */
export async function purgeAccountsPastDeletionDeadline(): Promise<number> {
  const due = await prisma.user.findMany({
    where: {
      is_active: false,
      deletion_scheduled_at: { not: null, lte: new Date() },
    },
    select: { id: true },
  });

  let n = 0;
  for (const { id } of due) {
    const anonEmail = `deleted_${id}@users.invalid`;
    const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
    await prisma.user.update({
      where: { id },
      data: {
        email: anonEmail,
        name: 'Deleted user',
        phone: null,
        google_id: null,
        avatar: null,
        password_hash: passwordHash,
        wallet_balance: 0,
        loyalty_points: 0,
        deletion_scheduled_at: null,
        is_active: false,
      },
    });
    n += 1;
  }
  return n;
}
