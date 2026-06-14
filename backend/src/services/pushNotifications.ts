import crypto from 'crypto';
import { env } from '../security/env';
import { prisma } from '../db';
import { secureLogger } from '../security/logger';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const PUSH_TIMEOUT_MS = 10_000;

export async function savePushToken(userId: string, token: string, platform: string = 'unknown'): Promise<void> {
  await prisma.devicePushToken.upsert({
    where: { token },
    update: { user_id: userId, platform },
    create: { id: crypto.randomUUID(), user_id: userId, token, platform },
  });
}

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data: Record<string, string> = {}
): Promise<void> {
  const rows = await prisma.devicePushToken.findMany({
    where: { user_id: userId },
    select: { token: true },
  });
  if (rows.length === 0) return;

  const tokensToRemove: string[] = [];

  for (const row of rows) {
    const to = row.token;
    if (!to) continue;

    const expoAccessToken = env('EXPO_ACCESS_TOKEN');
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    };
    if (expoAccessToken) {
      headers.Authorization = `Bearer ${expoAccessToken}`;
    }

    const payload = {
      to,
      sound: 'default' as const,
      title,
      body,
      data,
      priority: 'high' as const,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PUSH_TIMEOUT_MS);

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        secureLogger.error('Expo push HTTP error', { status: res.status, body: text.slice(0, 500) });
        continue;
      }

      const parsed = (await res.json().catch(() => null)) as { data?: unknown } | null;
      const raw = parsed?.data;
      const tickets = Array.isArray(raw)
        ? raw
        : raw && typeof raw === 'object'
          ? [raw as { status?: string; details?: { error?: string } }]
          : [];
      for (const t of tickets) {
        if (t?.status === 'error' && t?.details?.error === 'DeviceNotRegistered') {
          tokensToRemove.push(to);
          break;
        }
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        secureLogger.error('Expo push request timed out', { userId, timeoutMs: PUSH_TIMEOUT_MS });
      } else {
        secureLogger.error('Push notification failed', err);
      }
    }
  }

  // Remove unregistered device tokens after the loop
  for (const token of tokensToRemove) {
    await prisma.devicePushToken.deleteMany({ where: { token } }).catch(() => {});
  }
}

export async function sendBulkPushNotification(
  title: string,
  body: string,
  data: Record<string, string> = {},
  filters?: { city?: string }
): Promise<{ sent: number; failed: number }> {
  const deviceFilter: any = filters?.city
    ? {
        user: {
          reservations: {
            some: {
              cafe: { city: filters.city },
            },
          },
        },
      }
    : {};

  const tokens = await prisma.devicePushToken.findMany({
    where: deviceFilter,
    select: { token: true },
  });

  const tokensToRemove: string[] = [];
  let sent = 0;
  let failed = 0;

  const expoAccessToken = env('EXPO_ACCESS_TOKEN');
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Encoding': 'gzip, deflate',
    'Content-Type': 'application/json',
  };
  if (expoAccessToken) {
    headers.Authorization = `Bearer ${expoAccessToken}`;
  }

  for (const { token } of tokens) {
    const payload = {
      to: token,
      sound: 'default' as const,
      title,
      body,
      data,
      priority: 'high' as const,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PUSH_TIMEOUT_MS);

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        failed++;
        continue;
      }
      sent++;
    } catch {
      clearTimeout(timeoutId);
      failed++;
    }
  }

  for (const token of tokensToRemove) {
    await prisma.devicePushToken.deleteMany({ where: { token } }).catch(() => {});
  }

  return { sent, failed };
}
