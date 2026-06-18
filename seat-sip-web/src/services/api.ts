const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = document.cookie.split('; ').find(row => row.startsWith('admin_token='))?.split('=')[1];

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Clear cookies and local storage immediately
      document.cookie = 'admin_token=; Path=/; Max-Age=0';
      document.cookie = 'admin_role=; Path=/; Max-Age=0';
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_user');
        localStorage.removeItem('admin_expires_at');
        alert('Session expired. Please log in again.');
        window.location.href = '/login';
      }
    }

    const error = await response.json().catch(() => ({}));
    let message = error.error || error.message || (typeof error === 'string' ? error : 'API request failed');
    if (typeof message === 'object') {
      message = message.message || JSON.stringify(message);
    }
    throw new Error(String(message));
  }

  return response.json();
}

export const api = {
  stats: {
    getDashboard: () => fetchApi('/admin/stats'),
    getRevenue: (days: number = 7) => fetchApi(`/admin/revenue?days=${days}`),
  },
  cafes: {
    list: (params: any = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetchApi(`/admin/cafes?${query}`);
    },
    getById: (id: string) => fetchApi(`/cafes/${id}`),
    create: (data: any) => fetchApi('/admin/cafes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => fetchApi(`/admin/cafes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => fetchApi(`/admin/cafes/${id}`, {
      method: 'DELETE',
    }),
  },
  menu: {
    list: (params: any = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetchApi(`/menu/items?${query}`);
    },
    create: (data: any) => fetchApi('/admin/menu/items', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => fetchApi(`/admin/menu/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    toggleStatus: (id: string, isAvailable: boolean) => fetchApi(`/admin/menu/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isAvailable }),
    }),
    delete: (id: string) => fetchApi(`/admin/menu/items/${id}`, {
      method: 'DELETE',
    }),
  },
  tables: {
    list: (cafeId: string, params: any = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetchApi(`/admin/cafes/${cafeId}/tables?${query}`);
    },
    create: (cafeId: string, data: any) => fetchApi(`/admin/cafes/${cafeId}/tables`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => fetchApi(`/admin/tables/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => fetchApi(`/admin/tables/${id}`, {
      method: 'DELETE',
    }),
  },
  reservations: {
    list: (params: any = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetchApi(`/admin/reservations?${query}`);
    },
    create: (data: any) => fetchApi('/admin/reservations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    updateStatus: (id: string, status: string) => fetchApi(`/admin/reservations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  },
  orders: {
    list: (params: any = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetchApi(`/admin/orders?${query}`);
    },
    updateStatus: (id: string, status: string) => fetchApi(`/admin/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  },
  cafeOwners: {
    list: () => fetchApi('/admin/cafe-owners'),
    listPending: () => fetchApi('/admin/cafe-owners/pending'),
    registerApplication: (data: any) => fetchApi('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    create: (data: any) => fetchApi('/admin/cafe-owners', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => fetchApi(`/admin/cafe-owners/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => fetchApi(`/admin/cafe-owners/${id}`, {
      method: 'DELETE',
    }),
    approve: (id: string) => fetchApi(`/admin/cafe-owners/${id}/approve`, {
      method: 'POST',
    }),
    reject: (id: string) => fetchApi(`/admin/cafe-owners/${id}/reject`, {
      method: 'POST',
    }),
  },
  banners: {
    list: (params: any = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetchApi(`/banners?${query}`);
    },
    adminList: (params: any = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetchApi(`/admin/banners?${query}`);
    },
    create: (data: any) => fetchApi('/admin/banners', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => fetchApi(`/admin/banners/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => fetchApi(`/admin/banners/${id}`, {
      method: 'DELETE',
    }),
  },
  rewards: {
    list: (params: any = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetchApi(`/admin/rewards?${query}`);
    },
    create: (data: any) => fetchApi('/admin/rewards', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => fetchApi(`/admin/rewards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => fetchApi(`/admin/rewards/${id}`, {
      method: 'DELETE',
    }),
    approve: (id: string) => fetchApi(`/admin/rewards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: true, status: 'ACTIVE' }),
    }),
    reject: (id: string) => fetchApi(`/admin/rewards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: false, status: 'REJECTED' }),
    }),
    redemptions: (params: any = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetchApi(`/admin/rewards/redemptions?${query}`);
    },
  },
  notifications: {
    send: (data: { title: string; body: string; targetAudience: 'all' | 'city' | 'subscribers'; city?: string; type?: string }) =>
      fetchApi('/admin/notifications/send', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    history: () => fetchApi('/admin/notifications/history'),
  },
  exploreCategories: {
    listPublic: () => fetchApi('/explore-categories'),
    list: () => fetchApi('/admin/explore-categories'),
    create: (data: any) => fetchApi('/admin/explore-categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => fetchApi(`/admin/explore-categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => fetchApi(`/admin/explore-categories/${id}`, {
      method: 'DELETE',
    }),
  },
};
