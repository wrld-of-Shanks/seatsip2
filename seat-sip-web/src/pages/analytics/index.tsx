'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Filter } from '@/components/ui/Filter';
import { api } from '@/services/api';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Calendar,
  Download,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#8B5E3C', '#D4A574', '#F5DEB3', '#FAE5C8', '#FFF8E7'];

interface StatCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  trend?: 'up' | 'down';
}

const StatCard = ({ title, value, change, icon, trend = 'up' }: StatCardProps) => (
  <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 bg-amber-100 rounded-lg text-amber-700">{icon}</div>
      <div
        className={`flex items-center space-x-1 text-sm ${
          trend === 'up' ? 'text-green-600' : 'text-red-600'
        }`}
      >
        {trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
        <span>{Math.abs(change)}%</span>
      </div>
    </div>
    <p className="text-sm text-stone-600 mb-1">{title}</p>
    <p className="text-2xl font-bold text-stone-900">{value}</p>
  </div>
);

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [orderData, setOrderData] = useState<any[]>([]);
  const [paymentData, setPaymentData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const handleFilterChange = React.useCallback((filters: any) => {
    const newRange = filters.dateRange || { start: '', end: '' };
    setDateRange(prev => {
      if (prev.start === newRange.start && prev.end === newRange.end) return prev;
      return newRange;
    });
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  async function loadAnalytics() {
    try {
      setLoading(true);
      const params: any = {};
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;

      const [statsRes, revenueRes, orderRes, paymentRes] = await Promise.all([
        api.stats.getDashboard(),
        api.stats.getRevenue(30),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/analytics/orders?${new URLSearchParams(params).toString()}`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/analytics/payments?${new URLSearchParams(params).toString()}`),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (revenueRes.success) setRevenueData(revenueRes.data);
      
      const orders = await orderRes.json();
      if (orders.success) setOrderData(orders.data);
      
      const payments = await paymentRes.json();
      if (payments.success) setPaymentData(payments.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  const exportData = async () => {
    const params: any = {};
    if (dateRange.start) params.startDate = dateRange.start;
    if (dateRange.end) params.endDate = dateRange.end;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/analytics/export?${new URLSearchParams(params).toString()}`,
        {
          headers: {
            Authorization: `Bearer ${document.cookie.split('; ').find(row => row.startsWith('admin_token='))?.split('=')[1]}`,
          },
        }
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  };

  const filterConfigs = [
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
          <h1 className="text-3xl font-bold text-stone-900 mb-2">Analytics</h1>
          <p className="text-stone-600">Track your business performance and metrics</p>
        </div>
        <button
          onClick={exportData}
          className="flex items-center space-x-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          <Download size={18} />
          <span>Export</span>
        </button>
      </div>

      <Filter configs={filterConfigs} onFilterChange={handleFilterChange} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Revenue"
          value={`₹${stats?.totalRevenue?.toLocaleString() || 0}`}
          change={12.5}
          icon={<DollarSign size={24} />}
          trend="up"
        />
        <StatCard
          title="Total Orders"
          value={stats?.totalOrders || 0}
          change={8.2}
          icon={<ShoppingCart size={24} />}
          trend="up"
        />
        <StatCard
          title="Active Users"
          value={stats?.activeUsers || 0}
          change={15.3}
          icon={<Users size={24} />}
          trend="up"
        />
        <StatCard
          title="Reservations"
          value={stats?.totalReservations || 0}
          change={-2.1}
          icon={<Calendar size={24} />}
          trend="down"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-stone-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-stone-900 mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#8B5E3C"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-stone-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-stone-900 mb-4">Orders by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={orderData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="status" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8B5E3C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-stone-900 mb-4">Payment Methods Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={paymentData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }: any) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="count"
            >
              {paymentData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Layout>
  );
}
