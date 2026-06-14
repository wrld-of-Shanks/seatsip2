import * as Linking from 'expo-linking';

type NotificationPayload = {
  type?: string;
  orderId?: string;
  reservationId?: string;
  [key: string]: any;
};

type NavigateFn = (route: string, params?: Record<string, any>) => void;

export function handleNotificationNavigation(
  data: NotificationPayload,
  navigate: NavigateFn,
): boolean {
  if (!data || (!data.type && !data.orderId && !data.reservationId)) {
    return false;
  }

  if (data.type === 'order' || data.orderId) {
    const orderId = data.orderId || data.id;
    if (orderId) {
      navigate('OrderDetail', { orderId });
      return true;
    }
  }

  if (data.type === 'reservation' || data.reservationId) {
    const reservationId = data.reservationId || data.id;
    if (reservationId) {
      navigate('ReservationDetail', { reservationId });
      return true;
    }
  }

  if (data.type === 'order_status') {
    const orderId = data.orderId || data.id;
    if (orderId) {
      navigate('OrderDetail', { orderId });
      return true;
    }
  }

  if (data.type === 'promotion' || data.type === 'offer') {
    navigate('Explore');
    return true;
  }

  return false;
}

export function parseDeepLinkUrl(url: string): { route: string; params: Record<string, string> } | null {
  const prefix = Linking.createURL('/');
  let path = url;

  if (path.startsWith(prefix)) {
    path = path.slice(prefix.length - 1);
  }

  const parsed = Linking.parse(path);

  if (!parsed.path) return null;

  const segments = parsed.path.split('/').filter(Boolean);

  if (segments.length >= 2) {
    const [entity, id] = segments;
    if (entity === 'orders' && id) {
      return { route: 'OrderDetail', params: { orderId: id } };
    }
    if (entity === 'reservations' && id) {
      return { route: 'ReservationDetail', params: { reservationId: id } };
    }
  }

  if (segments.length === 1) {
    if (segments[0] === 'orders') {
      return { route: 'Orders', params: {} };
    }
    if (segments[0] === 'explore') {
      return { route: 'Explore', params: {} };
    }
    if (segments[0] === 'profile') {
      return { route: 'Profile', params: {} };
    }
  }

  return null;
}
