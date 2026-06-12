import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { AdminRole, getCookieRole, getLocalStorageUser } from '@/utils/auth';

export function useAuthGuard(allowedRoles: AdminRole[]) {
  const router = useRouter();

  useEffect(() => {
    const role = getCookieRole();
    const user = getLocalStorageUser();

    if (!role || !user) {
      router.replace('/login');
      return;
    }

    if (!allowedRoles.includes(role)) {
      if (role === 'ADMIN') router.replace('/admin/dashboard');
      if (role === 'CAFE_OWNER') router.replace('/owner/dashboard');
    }
  }, [allowedRoles, router]);
}
