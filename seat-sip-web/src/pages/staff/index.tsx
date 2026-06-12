import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { DataTable } from '@/components/ui/Table';
import { Filter } from '@/components/ui/Filter';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { StaffForm } from '@/components/staff/StaffForm';
import { ColumnDef } from '@tanstack/react-table';
import { 
  Users, 
  UserPlus, 
  Edit, 
  Trash2,
  ShieldAlert,
} from 'lucide-react';

const RoleBadge = ({ role }: { role: string }) => {
  const colors: Record<string, string> = {
    ADMIN: 'bg-purple-100 text-purple-700',
    MANAGER: 'bg-blue-100 text-blue-700',
    STAFF: 'bg-stone-100 text-stone-700',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${colors[role] || colors.STAFF}`}>
      {role}
    </span>
  );
};

const StatusBadge = ({ status }: { status: boolean }) => (
  <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
    {status ? 'Active' : 'Inactive'}
  </span>
);

export default function StaffPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
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

  const handleCreate = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;
    
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('admin_token='))?.split('=')[1];
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedUsers.length} staff members?`)) return;
    
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

  const handleFormSubmit = async (data: any) => {
    const token = document.cookie.split('; ').find(row => row.startsWith('admin_token='))?.split('=')[1];
    
    try {
      if (editingUser) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/users/${editingUser.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });
      } else {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });
      }
      loadUsers();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to save user:', error);
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
      cell: (info) => <StatusBadge status={info.getValue() as boolean} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (info) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleEdit(info.row.original)}
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <Edit size={16} className="text-stone-600" />
          </button>
          <button
            onClick={() => handleDelete(info.row.original.id)}
            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
          >
            <Trash2 size={16} className="text-red-600" />
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
        { value: 'MANAGER', label: 'Manager' },
        { value: 'STAFF', label: 'Staff' },
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
          <h1 className="text-3xl font-bold text-stone-900 mb-2">Staff Management</h1>
          <p className="text-stone-600">Manage your team members and their roles</p>
        </div>
        <Button onClick={handleCreate}>
          <UserPlus size={18} className="mr-2" />
          Add Staff
        </Button>
      </div>

      <Filter configs={filterConfigs} />

      {selectedUsers.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
          <span className="text-sm text-amber-800">
            {selectedUsers.length} staff member(s) selected
          </span>
          <Button variant="danger" size="sm" onClick={handleBulkDelete}>
            <Trash2 size={16} className="mr-2" />
            Delete Selected
          </Button>
        </div>
      )}

      <DataTable
        data={users}
        columns={columns}
        selectable
        onMultiSelect={setSelectedUsers}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Edit Staff Member' : 'Add Staff Member'}
        size="md"
      >
        <StaffForm
          initialData={editingUser}
          onSubmit={handleFormSubmit}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </Layout>
  );
}
