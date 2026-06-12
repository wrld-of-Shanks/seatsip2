import { http, HttpResponse } from 'msw'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1'

export const handlers = [
  // Dashboard stats
  http.get(`${API_BASE_URL}/admin/stats`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        totalRevenue: 125000,
        totalOrders: 450,
        activeUsers: 120,
        totalReservations: 78,
      },
    })
  }),

  // Revenue data
  http.get(`${API_BASE_URL}/admin/revenue`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        { date: '2024-01-01', revenue: 15000 },
        { date: '2024-01-02', revenue: 18000 },
        { date: '2024-01-03', revenue: 22000 },
        { date: '2024-01-04', revenue: 19000 },
        { date: '2024-01-05', revenue: 25000 },
        { date: '2024-01-06', revenue: 26000 },
      ],
    })
  }),

  // Users list
  http.get(`${API_BASE_URL}/admin/users`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          role: 'ADMIN',
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '+0987654321',
          role: 'CAFE_OWNER',
          isActive: true,
          createdAt: '2024-01-02T00:00:00Z',
        },
        {
          id: '3',
          name: 'Bob Wilson',
          email: 'bob@example.com',
          phone: '+1122334455',
          role: 'USER',
          isActive: false,
          createdAt: '2024-01-03T00:00:00Z',
        },
      ],
    })
  }),

  // Create user
  http.post(`${API_BASE_URL}/admin/users`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        id: '4',
        name: 'New User',
        email: 'new@example.com',
        phone: '+1111111111',
        role: 'STAFF',
        isActive: true,
        createdAt: '2024-01-04T00:00:00Z',
      },
    })
  }),

  // Update user
  http.patch<{ userId: string }>(`${API_BASE_URL}/admin/users/:userId`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        id: '1',
        name: 'Updated Name',
        email: 'updated@example.com',
        role: 'ADMIN',
        isActive: true,
      },
    })
  }),

  // Delete user
  http.delete<{ userId: string }>(`${API_BASE_URL}/admin/users/:userId`, () => {
    return HttpResponse.json({
      success: true,
      message: 'User deleted successfully',
    })
  }),

  // Update user status
  http.patch<{ userId: string }>(`${API_BASE_URL}/admin/users/:userId/status`, () => {
    return HttpResponse.json({
      success: true,
      data: { isActive: true },
    })
  }),

  // Cafes list
  http.get(`${API_BASE_URL}/admin/cafes`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: '1',
          name: 'Cafe One',
          location: 'Downtown',
          status: 'ACTIVE',
        },
        {
          id: '2',
          name: 'Cafe Two',
          location: 'Uptown',
          status: 'INACTIVE',
        },
      ],
    })
  }),

  // Orders list
  http.get(`${API_BASE_URL}/orders`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: '1',
          orderId: 'ORD-001',
          customerName: 'John Doe',
          amount: 250,
          status: 'COMPLETED',
        },
        {
          id: '2',
          orderId: 'ORD-002',
          customerName: 'Jane Smith',
          amount: 180,
          status: 'PENDING',
        },
      ],
    })
  }),

  // Reservations list
  http.get(`${API_BASE_URL}/reservations`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: '1',
          customerName: 'John Doe',
          date: '2024-01-15',
          time: '18:00',
          guests: 4,
          status: 'CONFIRMED',
        },
      ],
    })
  }),

  // Audit logs
  http.get(`${API_BASE_URL}/admin/audit-logs`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: '1',
          action: 'CREATE',
          entity: 'User',
          entityId: '1',
          userId: 'admin-1',
          userName: 'Admin User',
          userRole: 'ADMIN',
          timestamp: '2024-01-01T10:00:00Z',
          metadata: {},
        },
        {
          id: '2',
          action: 'UPDATE',
          entity: 'User',
          entityId: '2',
          userId: 'admin-1',
          userName: 'Admin User',
          userRole: 'ADMIN',
          timestamp: '2024-01-02T11:00:00Z',
          metadata: {},
        },
      ],
      pagination: {
        total: 50,
        page: 1,
        limit: 50,
      },
    })
  }),

  // Settings
  http.get(`${API_BASE_URL}/admin/settings`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: '1',
          key: 'app.name',
          value: 'SEATsip',
          type: 'string',
          category: 'General',
          description: 'Application name',
        },
        {
          id: '2',
          key: 'maintenance.mode',
          value: false,
          type: 'boolean',
          category: 'System',
          description: 'Enable maintenance mode',
        },
      ],
    })
  }),

  // Feature flags
  http.get(`${API_BASE_URL}/admin/feature-flags`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: '1',
          name: 'New Dashboard',
          key: 'new_dashboard',
          enabled: true,
          description: 'Enable new dashboard UI',
        },
        {
          id: '2',
          name: 'Beta Features',
          key: 'beta_features',
          enabled: false,
          description: 'Enable experimental features',
        },
      ],
    })
  }),

  // Roles
  http.get(`${API_BASE_URL}/admin/roles`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: '1',
          name: 'Admin',
          permissions: ['users.read', 'users.write', 'users.delete', 'orders.read'],
        },
        {
          id: '2',
          name: 'Manager',
          permissions: ['users.read', 'orders.read', 'orders.write'],
        },
      ],
    })
  }),

  // Permissions
  http.get(`${API_BASE_URL}/admin/permissions`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: '1',
          name: 'Read Users',
          key: 'users.read',
          description: 'View user information',
          category: 'Users',
        },
        {
          id: '2',
          name: 'Write Users',
          key: 'users.write',
          description: 'Create and update users',
          category: 'Users',
        },
        {
          id: '3',
          name: 'Delete Users',
          key: 'users.delete',
          description: 'Delete users',
          category: 'Users',
        },
        {
          id: '4',
          name: 'Read Orders',
          key: 'orders.read',
          description: 'View order information',
          category: 'Orders',
        },
      ],
    })
  }),
]
