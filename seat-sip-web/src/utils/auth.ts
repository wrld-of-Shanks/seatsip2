export type AdminRole = 'ADMIN' | 'CAFE_OWNER';

export type StoredAdminUser = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status?: string;
  cafeId?: string;
  phone?: string;
};

export function getCookieValue(name: string) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getCookieRole(): AdminRole | null {
  const role = getCookieValue('admin_role');
  return role === 'ADMIN' || role === 'CAFE_OWNER' ? role : null;
}

export function getLocalStorageUser(): StoredAdminUser | null {
  if (typeof window === 'undefined') return null;
  const storedUser = localStorage.getItem('admin_user');
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser);
  } catch {
    return null;
  }
}

export function persistAuthSession(token: string, user: StoredAdminUser) {
  document.cookie = `admin_role=${encodeURIComponent(user.role)}; Path=/; SameSite=Strict`;
  document.cookie = `admin_token=${encodeURIComponent(token)}; Path=/; SameSite=Strict`;
  localStorage.setItem('admin_user', JSON.stringify({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    ...(user.cafeId ? { cafeId: user.cafeId } : {}),
  }));
}

export function logout() {
  document.cookie = 'admin_role=; Path=/; Max-Age=0';
  document.cookie = 'admin_token=; Path=/; Max-Age=0';
  localStorage.removeItem('admin_user');
  localStorage.removeItem('admin_expires_at');
}
