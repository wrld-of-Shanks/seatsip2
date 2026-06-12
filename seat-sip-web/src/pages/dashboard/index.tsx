import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { api } from '@/services/api';
import {
  ShoppingBag,
  CreditCard,
  BookOpen,
  Building2,
  UserPlus,
  TrendingUp
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StatCard = ({ title, value, change, icon: Icon, color, trend = 'up' }: any) => (
  <div className="glass-panel p-6 rounded-xl shadow-[0px_24px_48px_rgba(116,85,75,0.06)] hover:-translate-y-1 transition-transform duration-300">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2.5 rounded-lg ${color} backdrop-blur-md`}>
        <Icon size={24} />
      </div>
      {change && (
        <span className={`text-xs font-label ${trend === 'up' ? 'text-emerald-300 bg-emerald-950/40 border border-emerald-500/30' : 'text-amber-300 bg-amber-950/40 border border-amber-500/30'} px-2 py-1 rounded-full backdrop-blur-sm`}>
          {change}
        </span>
      )}
    </div>
    <p className="text-sm font-semibold text-stone-200/80 mb-1">{title}</p>
    <h4 className="text-2xl font-bold font-headline text-white drop-shadow-sm">{value}</h4>
  </div>
);

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [revenue, setRevenue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('Admin');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('admin_user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          const nameValue = parsed.name || parsed.email || 'Admin';
          setUserName(typeof nameValue === 'object' ? (nameValue.message || JSON.stringify(nameValue)) : String(nameValue));
        } catch (e) {
          console.error('Failed to parse stored user:', e);
        }
      }
    }

    async function loadData() {
      try {
        const [statsRes, revenueRes] = await Promise.all([
          api.stats.getDashboard(),
          api.stats.getRevenue(7),
        ]);

        if (statsRes.success) {
          setStats(statsRes.data);
        }

        if (revenueRes.success) {
          setRevenue(revenueRes.data);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <Layout>
      {/* Dashboard Header */}
      <div className="mb-10">
        <h3 className="text-3xl font-extrabold font-headline tracking-tight text-white mb-2 italic drop-shadow-md">Morning, {userName}.</h3>
        <p className="text-stone-200/85 font-body">Here's the pulse of SEATsip for today.</p>
      </div>

      {/* Top Metrics Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Orders"
          value={loading ? '...' : (typeof stats?.totalOrders === 'object' ? '0' : (stats?.totalOrders || '0'))}
          icon={ShoppingBag}
          color="bg-amber-500/20 text-amber-200 border border-amber-500/30"
        />
        <StatCard
          title="Today's Revenue"
          value={loading ? '...' : `₹${(typeof stats?.todayRevenue === 'object' ? '0' : ((stats?.todayRevenue || 0) / 100).toLocaleString())}`}
          icon={CreditCard}
          color="bg-emerald-500/20 text-emerald-200 border border-emerald-500/30"
        />
        <StatCard
          title="Active Bookings"
          value={loading ? '...' : (typeof stats?.activeReservations === 'object' ? '0' : (stats?.activeReservations || '0'))}
          icon={BookOpen}
          color="bg-sky-500/20 text-sky-200 border border-sky-500/30"
        />
        <StatCard
          title="Partner Cafes"
          value={loading ? '...' : (typeof stats?.totalCafes === 'object' ? '0' : (stats?.totalCafes || '0'))}
          icon={Building2}
          color="bg-rose-500/20 text-rose-200 border border-rose-500/30"
        />
      </div>

      {/* Revenue Chart */}
      <div className="glass-panel p-8 rounded-xl mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold font-headline text-white drop-shadow-sm">Revenue Performance (7 Days)</h3>
            <p className="text-sm text-stone-200/80">Daily revenue breakdown</p>
          </div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.12)" />
              <XAxis
                dataKey="date"
                stroke="rgba(255, 255, 255, 0.6)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="rgba(255, 255, 255, 0.6)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `₹${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(28, 20, 16, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: '12px',
                  color: 'white',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)'
                }}
                itemStyle={{ color: '#ffdf9f' }}
                labelStyle={{ color: 'white', fontWeight: 'bold' }}
                formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, 'Revenue']}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#ffdf9f"
                strokeWidth={3}
                dot={{ fill: '#ffdf9f', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#ffffff', stroke: '#ffdf9f', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          title="New Users Today"
          value={loading ? '...' : stats?.newUsers || '0'}
          icon={UserPlus}
          color="bg-emerald-500/20 text-emerald-200 border border-emerald-500/30"
        />
        <StatCard
          title="Revenue Growth"
          value="+12.5%"
          icon={TrendingUp}
          color="bg-sky-500/20 text-sky-200 border border-sky-500/30"
        />
      </div>
    </Layout>
  );
}

