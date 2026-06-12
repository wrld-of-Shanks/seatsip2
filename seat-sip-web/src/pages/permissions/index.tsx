'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Shield, Check, X } from 'lucide-react';

interface Permission {
  id: string;
  name: string;
  key: string;
  description: string;
  category: string;
}

interface Role {
  id: string;
  name: string;
  permissions: string[];
}

export default function PermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRoles();
    loadPermissions();
  }, []);

  async function loadRoles() {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('admin_token='))?.split('=')[1];
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/roles`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setRoles(data.data);
        if (data.data.length > 0) setSelectedRole(data.data[0].id);
      }
    } catch (error) {
      console.error('Failed to load roles:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadPermissions() {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('admin_token='))?.split('=')[1];
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/permissions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setPermissions(data.data);
      }
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }
  }

  const handlePermissionToggle = async (permissionId: string, granted: boolean) => {
    if (!selectedRole) return;

    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('admin_token='))?.split('=')[1];
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/roles/${selectedRole}/permissions`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          permissionId,
          action: granted ? 'grant' : 'revoke',
        }),
      });
      loadRoles();
    } catch (error) {
      console.error('Failed to update permission:', error);
    }
  };

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) acc[permission.category] = [];
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const currentRole = roles.find((r) => r.id === selectedRole);

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900 mb-2">Permissions</h1>
        <p className="text-stone-600">Manage role-based access control (RBAC)</p>
      </div>

      <div className="bg-white border border-stone-200 rounded-lg p-6 mb-6">
        <div className="flex items-center space-x-4">
          <Shield size={24} className="text-amber-600" />
          <div className="flex-1">
            <label className="block text-sm font-medium text-stone-700 mb-1">Select Role</label>
            <Select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              options={roles.map((role) => ({ value: role.id, label: role.name }))}
            />
          </div>
        </div>
      </div>

      {currentRole && (
        <div className="space-y-6">
          {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
            <div key={category} className="bg-white border border-stone-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-stone-900 mb-4">{category}</h3>
              <div className="space-y-3">
                {categoryPermissions.map((permission) => {
                  const rolePermissions = currentRole.permissions || [];
                  const hasPermission = rolePermissions.includes(permission.id);
                  return (
                    <div
                      key={permission.id}
                      className="flex items-center justify-between py-3 px-4 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-stone-900">{permission.name}</h4>
                          <code className="text-xs bg-stone-200 px-2 py-0.5 rounded">{permission.key}</code>
                        </div>
                        <p className="text-sm text-stone-500 mt-1">{permission.description}</p>
                      </div>
                      <button
                        onClick={() => handlePermissionToggle(permission.id, !hasPermission)}
                        className={`p-2 rounded-lg transition-colors ${
                          hasPermission
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                        }`}
                      >
                        {hasPermission ? <Check size={18} /> : <X size={18} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
