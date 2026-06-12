'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { DataTable } from '@/components/ui/Table';
import { Filter } from '@/components/ui/Filter';
import { Button } from '@/components/ui/Button';
import { ColumnDef } from '@tanstack/react-table';
import { Search, Mail, Phone, Calendar, Shield, MoreVertical, User, UserCheck, UserX, Ban } from 'lucide-react';

const RoleBadge = ({ role }: { role: string }) => {
  const colors: Record<string, string> = {
    ADMIN: 'bg-purple-100 text-purple-700',
    CAFE_OWNER: 'bg-blue-100 text-blue-700',
    USER: 'bg-stone-100 text-stone-700',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${colors[role] || colors.USER}`}>
      {role}
    </span>
  );
};

const StatusBadge = ({ isActive }: { isActive: boolean }) => (
  <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
    {isActive ? 'Active' : 'Suspended'}
  </span>
);

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('admin_token='))?.split('=')[1];
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleBulkActivate = async () => {
    if (!confirm(`Are you sure you want to activate ${selectedUsers.length} user(s)?`)) return;
    
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('admin_token='))?.split('=')[1];
      await Promise.all(
        selectedUsers.map((user) =>
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/users/${user.id}/status`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ isActive: true }),
          })
        )
      );
      setSelectedUsers([]);
      loadUsers();
    } catch (error) {
      console.error('Failed to activate users:', error);
    }
  };

  const handleBulkSuspend = async () => {
    if (!confirm(`Are you sure you want to suspend ${selectedUsers.length} user(s)?`)) return;
    
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('admin_token='))?.split('=')[1];
      await Promise.all(
        selectedUsers.map((user) =>
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/users/${user.id}/status`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ isActive: false }),
          })
        )
      );
      setSelectedUsers([]);
      loadUsers();
    } catch (error) {
      console.error('Failed to suspend users:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedUsers.length} user(s)?`)) return;
    
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('admin_token='))?.split('=')[1];
      await Promise.all(
        selectedUsers.map((user) =>
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/users/${user.id}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
        )
      );
      setSelectedUsers([]);
      loadUsers();
    } catch (error) {
      console.error('Failed to delete users:', error);
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: (info) => info.getValue() as string,
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: (info) => info.getValue() as string,
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: (info) => (info.getValue() as string) || '-',
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: (info) => <RoleBadge role={info.getValue() as string} />,
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: (info) => <StatusBadge isActive={info.getValue() as boolean} />,
    },
    {
      accessorKey: 'walletBalance',
      header: 'Wallet Balance',
      cell: (info) => {
        const val = info.getValue() as number;
        return val !== undefined && val !== null ? `₹${val.toFixed(2)}` : '₹0.00';
      },
    },
    {
      accessorKey: 'loyaltyPoints',
      header: 'Loyalty Points',
      cell: (info) => {
        const val = info.getValue() as number;
        return val !== undefined && val !== null ? val : 0;
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Joined',
      cell: (info) => info.getValue() ? new Date(info.getValue() as string).toLocaleDateString() : '-',
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (info) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleBulkActivate()}
            className="p-2 hover:bg-green-100 rounded-lg transition-colors"
            title="Activate"
          >
            <UserCheck size={16} className="text-green-600" />
          </button>
          <button
            onClick={() => handleBulkSuspend()}
            className="p-2 hover:bg-amber-100 rounded-lg transition-colors"
            title="Suspend"
          >
            <UserX size={16} className="text-amber-600" />
          </button>
          <button
            onClick={() => handleBulkDelete()}
            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
            title="Delete"
          >
            <Ban size={16} className="text-red-600" />
          </button>
        </div>
      ),
    },
  ];

  const filterConfigs = [
    {
      key: 'search',
      label: 'Search',
      type: 'text' as const,
    },
    {
      key: 'role',
      label: 'Role',
      type: 'select' as const,
      options: [
        { value: 'ADMIN', label: 'Admin' },
        { value: 'CAFE_OWNER', label: 'Cafe Owner' },
        { value: 'USER', label: 'User' },
      ],
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: 'active', label: 'Active' },
        { value: 'suspended', label: 'Suspended' },
      ],
    },
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 mb-2">User Management</h1>
          <p className="text-stone-600">Manage all users and their account status</p>
        </div>
      </div>

      <Filter configs={filterConfigs} />

      {selectedUsers.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
          <span className="text-sm text-amber-800">
            {selectedUsers.length} user(s) selected
          </span>
          <div className="flex space-x-2">
            <Button variant="secondary" size="sm" onClick={handleBulkActivate}>
              <UserCheck size={16} className="mr-2" />
              Activate
            </Button>
            <Button variant="secondary" size="sm" onClick={handleBulkSuspend}>
              <UserX size={16} className="mr-2" />
              Suspend
            </Button>
            <Button variant="danger" size="sm" onClick={handleBulkDelete}>
              <Ban size={16} className="mr-2" />
              Delete
            </Button>
          </div>
        </div>
      )}

      <DataTable
        data={users}
        columns={columns}
        selectable
        onMultiSelect={setSelectedUsers}
      />
    </Layout>
  );
}
