import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { api } from '@/services/api';
import { io, Socket } from 'socket.io-client';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  Search,
  Filter,
  MoreVertical,
  Clock,
  ChevronRight,
  ShoppingCart,
  Users,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Coffee,
  X,
  History,
  Building2
} from 'lucide-react';

const OrderCard = ({ id, customer, items, mode, status, time, relativeTime, active = false, onClick }: any) => (
  <div className="relative group cursor-pointer" onClick={onClick}>
    <div className={`absolute inset-0 bg-primary/5 rounded-2xl -m-1 transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></div>
    <div className={`relative grid grid-cols-12 items-center px-6 py-5 bg-surface-container-lowest border ${active ? 'border-primary/20 shadow-md' : 'border-white/60'} rounded-2xl shadow-[0px_8px_24px_rgba(116,85,75,0.04)] backdrop-blur-xl transition-transform active:scale-[0.99]`}>
      <div className={`col-span-2 font-headline font-bold ${active ? 'text-primary' : 'text-stone-400'} truncate pr-4`} title={`#${id}`}>#{id}</div>
      <div className="col-span-4">
        <p className="font-bold text-on-surface truncate">{customer}</p>
        <p className="text-xs text-stone-500 font-medium truncate">{items}</p>
      </div>
      <div className="col-span-2 flex justify-center">
        <span className="px-3 py-1 bg-secondary-container/30 text-on-secondary-container text-[10px] font-bold rounded-full border border-secondary/10 uppercase">{mode}</span>
      </div>
      <div className="col-span-2 flex justify-center">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${status === 'PREPARING' ? 'bg-amber-500 animate-pulse' : status === 'READY' ? 'bg-emerald-500' : status === 'PENDING' ? 'bg-yellow-500' : 'bg-stone-300'}`}></span>
          <span className={`text-xs font-bold ${status === 'PREPARING' ? 'text-amber-700' : status === 'READY' ? 'text-emerald-700' : status === 'PENDING' ? 'text-yellow-700' : 'text-stone-500'}`}>{status}</span>
        </div>
      </div>
      <div className="col-span-2 text-right">
        <p className="text-xs font-bold text-on-surface">{time}</p>
        <p className="text-[10px] text-stone-400 font-bold">{relativeTime}</p>
      </div>
    </div>
  </div>
);

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const getOrderItems = (itemsField: any) => {
    if (!itemsField) return [];
    if (typeof itemsField === 'string') {
      try {
        return JSON.parse(itemsField || '[]');
      } catch (e) {
        console.error('Failed to parse items:', e);
        return [];
      }
    }
    return Array.isArray(itemsField) ? itemsField : [];
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadOrders() {
    try {
      const res = await api.orders.list({ limit: 20 });
      if (res.success) {
        setOrders(res.data);
        setSelectedOrder((prev: any) => {
          if (!prev && res.data.length > 0) {
            return res.data[0];
          }
          if (prev) {
            const fresh = res.data.find((o: any) => o.id === prev.id);
            if (fresh) return fresh;
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  }

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      return api.orders.updateStatus(orderId, status);
    },
    onSuccess: (data, variables) => {
      toast.success(`Order status updated to ${variables.status}`);
      loadOrders();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update order status');
    },
  });

  const filteredOrders = statusFilter === 'ALL' 
    ? orders 
    : orders.filter((order) => order.status === statusFilter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-700';
      case 'PREPARING': return 'bg-blue-100 text-blue-700';
      case 'READY': return 'bg-green-100 text-green-700';
      case 'DELIVERED': return 'bg-emerald-100 text-emerald-700';
      case 'CANCELLED': return 'bg-red-100 text-red-700';
      default: return 'bg-stone-100 text-stone-700';
    }
  };

  const formatTime = (date: any) => {
    const d = date ? new Date(date) : null;
    if (!d || isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatRelativeTime = (date: any) => {
    const d = date ? new Date(date) : null;
    if (!d || isNaN(d.getTime())) return '';
    const diff = Date.now() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <Layout>
      <div className="grid grid-cols-12 gap-8">
        {/* Filter Section */}
        <section className="col-span-12 flex flex-wrap items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-extrabold tracking-tight text-on-surface mr-4 italic">Order Queue</h2>
            <div className="flex gap-2 p-1 bg-surface-container-low rounded-xl backdrop-blur-sm border border-white/40">
              {['ALL', 'PENDING', 'PREPARING', 'READY', 'DELIVERED'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold font-label tracking-wide transition-all ${
                    statusFilter === status
                      ? 'bg-white shadow-sm text-primary'
                      : 'text-stone-500 hover:text-primary'
                  }`}
                >
                  {status === 'ALL' ? 'ALL ORDERS' : status}
                </button>
              ))}
            </div>
          </div>
          <div className="text-sm font-bold text-stone-500">
            {filteredOrders.length} orders
          </div>
        </section>

        {/* Real-time Order List */}
        <section className="col-span-8 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-12 px-6 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-stone-400">
                <div className="col-span-2">Order ID</div>
                <div className="col-span-4">Customer / Item</div>
                <div className="col-span-2 text-center">Mode</div>
                <div className="col-span-2 text-center">Status</div>
                <div className="col-span-2 text-right">Time</div>
              </div>

              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  id={order.orderNumber || order.id}
                  customer={order.user?.name || 'Guest'}
                  items={`${getOrderItems(order.items).reduce((acc: number, item: any) => acc + (item.quantity || 1), 0)} items`}
                  mode={order.type}
                  status={order.status}
                  time={formatTime(order.created_at || order.placedAt)}
                  relativeTime={formatRelativeTime(order.created_at || order.placedAt)}
                  active={selectedOrder?.id === order.id}
                  onClick={() => setSelectedOrder(order)}
                />
              ))}

              {filteredOrders.length === 0 && (
                <div className="text-center py-12 text-stone-500">
                  No orders found
                </div>
              )}
            </>
          )}
        </section>

        {/* Order Details Sidebar */}
        {selectedOrder && (
          <aside className="col-span-4 sticky top-28 h-[calc(100vh-10rem)] bg-surface-container-low/60 backdrop-blur-3xl rounded-[2rem] border border-white/40 p-8 shadow-sm flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h4 className="text-xs font-black tracking-[0.2em] text-primary">DETAILS</h4>
                <h3 className="text-2xl font-black text-on-surface italic truncate max-w-[200px]" title={selectedOrder.orderNumber || selectedOrder.id}>Order #{selectedOrder.orderNumber || selectedOrder.id}</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm text-stone-400 hover:text-stone-900 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
              {/* Customer Info */}
              <div className="p-4 rounded-2xl bg-white/60 border border-white/40">
                <p className="text-xs font-bold text-stone-500 mb-1">Customer</p>
                <p className="font-bold text-stone-900">{selectedOrder.user?.name || 'Guest'}</p>
                <p className="text-sm text-stone-600">{selectedOrder.user?.email || ''}</p>
              </div>

              {/* Cafe Info */}
              {selectedOrder.cafe && (
                <div className="p-4 rounded-2xl bg-white/60 border border-white/40">
                  <p className="text-xs font-bold text-stone-500 mb-1">Cafe</p>
                  <p className="font-bold text-stone-900">{selectedOrder.cafe.name}</p>
                  <p className="text-sm text-stone-600">{selectedOrder.cafe.address}</p>
                </div>
              )}

              {/* Order Items */}
              <div className="space-y-4">
                <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">Items</p>
                {getOrderItems(selectedOrder.items).map((item: any) => (
                  <div key={item.id} className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-white/60 border border-white/40">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-surface-container-high" />
                      <div>
                        <p className="font-bold text-on-surface text-sm">{item.name}</p>
                        <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-on-surface">₹{((item.unit_price ?? item.price ?? 0) / 100).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              {/* Receipt Footer */}
              <div className="border-t border-dashed border-stone-200 pt-6 space-y-2">
                <div className="flex justify-between items-center text-stone-500 text-sm font-bold">
                  <span>Subtotal</span>
                  <span className="font-bold">₹{((selectedOrder.subtotal || 0) / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-stone-500 text-sm font-bold">
                  <span>Delivery Fee</span>
                  <span className="font-bold">₹{((selectedOrder.deliveryFee || 0) / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-stone-500 text-sm font-bold">
                  <span>Tax</span>
                  <span className="font-bold">₹{((selectedOrder.tax || 0) / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-on-surface font-black text-lg pt-2 italic">
                  <span>Total</span>
                  <span>₹{((selectedOrder.total || 0) / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Status Actions */}
            <div className="mt-8 space-y-3">
              <select
                value={selectedOrder.status}
                onChange={async (e) => {
                  const newStatus = e.target.value;
                  updateOrderStatusMutation.mutate({
                    orderId: selectedOrder.id,
                    status: newStatus,
                  });
                }}
                disabled={updateOrderStatusMutation.isPending}
                className="w-full py-3 px-4 rounded-xl border border-stone-300 text-sm font-bold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none disabled:opacity-50"
              >
                <option value="PENDING">Pending</option>
                <option value="PREPARING">Preparing</option>
                <option value="READY">Ready</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </aside>
        )}
      </div>
    </Layout>
  );
}
