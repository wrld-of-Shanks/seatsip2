'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { DataTable } from '@/components/ui/Table';
import { Filter } from '@/components/ui/Filter';
import { ColumnDef } from '@tanstack/react-table';
import { Search, Clock, User, Shield, FileText } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  userId: string;
  userName: string;
  userRole: string;
  timestamp: string;
  metadata: any;
}

const ActionBadge = ({ action }: { action: string }) => {
  const colors: Record<string, string> = {
    CREATE: 'bg-green-100 text-green-700',
    UPDATE: 'bg-blue-100 text-blue-700',
    DELETE: 'bg-red-100 text-red-700',
    READ: 'bg-stone-100 text-stone-700',
    LOGIN: 'bg-purple-100 text-purple-700',
    LOGOUT: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${colors[action] || colors.READ}`}>
      {action}
    </span>
  );
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0 });

  useEffect(() => {
    loadLogs();
  }, [pagination.page]);

  async function loadLogs() {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('admin_token='))?.split('=')[1];
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/audit-logs?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
        setPagination(prev => ({ ...prev, total: data.pagination?.total || 0 }));
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  }

  const columns: ColumnDef<AuditLog>[] = [
    {
      accessorKey: 'timestamp',
      header: 'Timestamp',
      cell: (info) => new Date(info.getValue() as string).toLocaleString(),
    },
    {
      accessorKey: 'action',
      header: 'Action',
      cell: (info) => <ActionBadge action={info.getValue() as string} />,
    },
    {
      accessorKey: 'entity',
      header: 'Entity',
      cell: (info) => info.getValue() as string,
    },
    {
      accessorKey: 'userName',
      header: 'User',
      cell: (info) => (
        <div className="flex items-center space-x-2">
          <User size={16} className="text-stone-500" />
          <span>{info.getValue() as string}</span>
          <span className="text-xs text-stone-500">({info.row.original.userRole})</span>
        </div>
      ),
    },
    {
      accessorKey: 'entityId',
      header: 'Entity ID',
      cell: (info) => (
        <code className="text-xs bg-stone-100 px-2 py-1 rounded">{info.getValue() as string}</code>
      ),
    },
    {
      id: 'metadata',
      header: 'Details',
      cell: (info) => (
        <button
          onClick={() => console.log('View details:', info.row.original.metadata)}
          className="text-amber-600 hover:text-amber-800 text-sm font-medium"
        >
          View
        </button>
      ),
    },
  ];

  const filterConfigs = [
    {
      key: 'action',
      label: 'Action',
      type: 'select' as const,
      options: [
        { value: 'CREATE', label: 'Create' },
        { value: 'UPDATE', label: 'Update' },
        { value: 'DELETE', label: 'Delete' },
        { value: 'READ', label: 'Read' },
        { value: 'LOGIN', label: 'Login' },
        { value: 'LOGOUT', label: 'Logout' },
      ],
    },
    {
      key: 'entity',
      label: 'Entity',
      type: 'select' as const,
      options: [
        { value: 'User', label: 'User' },
        { value: 'Order', label: 'Order' },
        { value: 'Cafe', label: 'Cafe' },
        { value: 'Reservation', label: 'Reservation' },
        { value: 'Payment', label: 'Payment' },
      ],
    },
    {
      key: 'dateRange',
      label: 'Date Range',
      type: 'dateRange' as const,
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
          <h1 className="text-3xl font-bold text-stone-900 mb-2">Audit Logs</h1>
          <p className="text-stone-600">Track all user actions and system events</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-stone-600">
          <FileText size={16} />
          <span>Total: {pagination.total} logs</span>
        </div>
      </div>

      <Filter configs={filterConfigs} />

      <DataTable data={logs} columns={columns} />
    </Layout>
  );
}
