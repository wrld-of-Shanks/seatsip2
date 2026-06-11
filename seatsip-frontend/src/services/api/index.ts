import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { fetch as pinnedFetch } from 'react-native-ssl-pinning';
import { clearTokens, loadTokens, saveTokens } from '../../security/secureStorage';
import { safeLog } from '../../security/safeLog';

function readProcessEnv(): { NODE_ENV?: string; EXPO_PUBLIC_FORCE_PROD?: string; EXPO_PUBLIC_API_URL?: string } {
  try {
    return ((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ||
      {}) as { NODE_ENV?: string; EXPO_PUBLIC_FORCE_PROD?: string; EXPO_PUBLIC_API_URL?: string };
  } catch {
    return {};
  }
}

/** True in dev bundles; override with EXPO_PUBLIC_FORCE_PROD=1 for production-like local testing. */
const forceProd = readProcessEnv().EXPO_PUBLIC_FORCE_PROD === '1';
const nodeEnv = readProcessEnv().NODE_ENV;
export const isDev =
  !forceProd &&
  (typeof __DEV__ !== 'undefined' ? __DEV__ : nodeEnv !== 'production');

const envApiUrl = readProcessEnv().EXPO_PUBLIC_API_URL?.trim() || '';
const extraApiUrl = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl?.trim() || '';

export const API_BASE_URL =
  Platform.OS === 'web'
    ? (isDev ? 'http://localhost:3000/api/v1' : 'https://api.seatsip.in/api/v1')
    : envApiUrl ||
      extraApiUrl ||
      (isDev
        ? Platform.OS === 'android'
          ? 'http://10.0.2.2:3000/api/v1'
          : 'http://localhost:3000/api/v1'
        : 'https://api.seatsip.in/api/v1');

/** SSL pinning only in production native builds (dev uses plain axios; pinning needs server leaf cert in native bundle). */
const useSslPinning = Platform.OS !== 'web' && !isDev;

function safeJsonParse<T>(jsonString: string | undefined, fallback: T): T {
  if (jsonString === undefined || jsonString === null || typeof jsonString !== 'string') {
    return fallback;
  }
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      safeLog.warn('[API] Non-JSON response', jsonString.substring(0, 200));
    }
    return fallback;
  }
}

let refreshPromise: Promise<string | null> | null = null;
let logoutHandler: (() => void) | null = null;

export function registerLogoutHandler(handler: () => void) {
  logoutHandler = handler;
}

async function sslPinnedAdapter(config: any) {
  const url = `${config.baseURL || ''}${config.url || ''}`;
  const response = await pinnedFetch(url, {
    method: String(config.method || 'get').toUpperCase(),
    headers: config.headers,
    body: config.data ? (typeof config.data === 'string' ? config.data : JSON.stringify(config.data)) : undefined,
    timeoutInterval: config.timeout || 15000,
    sslPinning: { certs: ['seatsip_api'] },
  });

  const parsed = safeJsonParse<Record<string, unknown>>(response.bodyString, {
    success: false,
    message: 'Invalid or non-JSON response from server',
  });

  return {
    data: parsed,
    status: response.status,
    statusText: String(response.status),
    headers: response.headers,
    config,
    request: null,
  };
}

const sharedAxiosConfig = {
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  adapter: useSslPinning ? sslPinnedAdapter : undefined,
  withCredentials: Platform.OS === 'web',
} as const;

/** Dedicated client for refresh so the main API 401 interceptor never loops; uses the same transport (pinning when enabled). */
const authRefreshClient = axios.create({ ...sharedAxiosConfig });

const api = axios.create({ ...sharedAxiosConfig });

// Attach auth token to every request
api.interceptors.request.use(async (config) => {
  if (!isDev && !API_BASE_URL.startsWith('https://')) {
    throw new Error('HTTPS is required for API calls');
  }
  const tokens = await loadTokens();
  if (tokens?.accessToken) config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  config.headers['X-API-Version'] = '2026-05-11';
  return config;
});

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const tokens = await loadTokens();
      const body =
        tokens?.refreshToken && tokens.refreshToken.length >= 20 ? { refreshToken: tokens.refreshToken } : {};
      try {
        const { data } = await authRefreshClient.post('/auth/refresh', body);
        const next = data.data as { accessToken: string; refreshToken?: string };
        if (!next?.accessToken) return null;
        await saveTokens({
          accessToken: next.accessToken,
          ...(next.refreshToken ? { refreshToken: next.refreshToken } : {}),
        });
        return next.accessToken;
      } catch {
        await clearTokens();
        logoutHandler?.();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

// Auto-refresh token on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const accessToken = await refreshAccessToken();
      if (accessToken) {
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);

// ===== Auth =====
export const authApi = {
  register: (data: { name: string; email: string; password: string; phone?: string }) =>
    api.post('/auth/register', data),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  googleSignIn: (idToken: string) => api.post('/auth/google', { idToken }),
  logout: (refreshToken?: string) =>
    api.post('/auth/logout', { refreshToken }),
  me: () => api.get('/auth/me'),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
  verifyPassword: (password: string) => api.post('/auth/verify-password', { password }),
  deleteAccount: () => api.post('/auth/delete-account'),
  cancelAccountDeletion: (body: { email: string; password: string } | { idToken: string }) =>
    api.post('/auth/cancel-account-deletion', body),
  acceptTerms: () => api.post('/auth/accept-terms'),
  forgotPasswordRequest: (email: string) =>
    api.post('/auth/forgot-password/request', { email }),
  forgotPasswordReset: (data: { email: string; otp: string; password: string }) =>
    api.post('/auth/forgot-password/reset', data),
};

// ===== Cafes =====
export const cafesApi = {
  list: (params?: { city?: string; mood?: string; search?: string; sort?: string; limit?: number; offset?: number; recommended?: boolean }) =>
    api.get('/cafes', { params }),
  getById: (id: string) => api.get(`/cafes/${id}`),
  getPaymentConfig: (id: string) => api.get(`/cafes/${id}/payment-config`),
  getMenu: (id: string) => api.get(`/cafes/${id}/menu`),
  getTables: (id: string, params?: { date?: string; time?: string; party_size?: number }) =>
    api.get(`/cafes/${id}/tables`, { params }),
  getReviews: (id: string, params?: { limit?: number; offset?: number }) =>
    api.get(`/cafes/${id}/reviews`, { params }),
  postReview: (id: string, data: { rating: number; comment?: string }) =>
    api.post(`/cafes/${id}/reviews`, data),
  addImage: (id: string, imageUrl: string) =>
    api.post(`/cafes/${id}/images`, { imageUrl }),
  getPopularItems: (limit?: number) => api.get('/cafes/popular-items', { params: { limit } }),
};

// ===== Orders =====
export const ordersApi = {
  list: (params?: { limit?: number; offset?: number }) =>
    api.get('/orders', { params }),
  getById: (id: string) => api.get(`/orders/${id}`),
  create: (data: {
    cafe_id: string;
    items: { menu_item_id: string; quantity: number }[];
    order_type?: string;
    special_instructions?: string;
    payment_method?: string;
    payment_details?: {
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    };
    reservation_id?: string;
  }) => api.post('/orders', data),
  createPaymentIntent: (data: { cafe_id: string; order_type?: string }) =>
    api.post('/orders/payment-intent', data),
  cancel: (id: string) => api.patch(`/orders/${id}/cancel`),
  refund: (id: string, amount: number, reason?: string) => api.post(`/orders/${id}/refund`, { amount, reason }),
};

// ===== Reservations =====
export const reservationsApi = {
  list: () => api.get('/reservations'),
  getById: (id: string) => api.get(`/reservations/${id}`),
  create: (data: {
    cafe_id: string;
    table_id?: string;
    date: string;
    time: string;
    party_size: number;
    special_requests?: string;
    pre_order_items?: { menu_item_id: string; quantity: number }[];
  }) => api.post('/reservations', data),
  cancel: (id: string) => api.patch(`/reservations/${id}/cancel`),
  updatePreOrder: (id: string, body: { pre_order_items: { menu_item_id: string; quantity: number }[] }) =>
    api.patch(`/reservations/${id}/pre-order`, body),
};

// ===== Cart =====
export const cartApi = {
  get: () => api.get('/cart'),
  add: (cafe_id: string, menu_item_id: string, quantity?: number) =>
    api.post('/cart/add', { cafe_id, menu_item_id, quantity }),
  update: (id: string, quantity: number) => api.patch(`/cart/${id}`, { quantity }),
  clear: () => api.delete('/cart/clear'),
};

// ===== Users =====
export const usersApi = {
  profile: () => api.get('/users/profile'),
  updateProfile: (data: { name?: string; phone?: string; avatar?: string }) =>
    api.patch('/users/profile', data),
  createWalletTopupOrder: (amount: number) =>
    api.post('/users/wallet/topup/order', { amount }),
  verifyWalletTopup: (payload: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
    api.post('/users/wallet/topup/verify', payload),
  walletTransactions: () => api.get('/users/wallet/transactions'),
  registerPushToken: (token: string) => api.post('/users/push-token', { token }),
};

// ===== Notifications =====
export const notificationsApi = {
  list: () => api.get('/notifications'),
  unreadCount: () => api.get('/notifications/unread-count'),
  markAllRead: () => api.patch('/notifications/read-all'),
};

// ===== Rewards =====
export const rewardsApi = {
  list: () => api.get('/rewards'),
  redeem: (id: string) => api.post(`/rewards/${id}/redeem`),
  earn: (action: 'VISIT' | 'REVIEW' | 'REFERRAL' | 'CHECKIN') => api.post('/rewards/earn', { action }),
};

// ===== Banners =====
export const bannersApi = {
  list: (params?: { slider_type?: string }) => api.get('/banners', { params }),
};

export default api;
