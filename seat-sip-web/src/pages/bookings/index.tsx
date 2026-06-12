import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { api } from '@/services/api';
import {
  Calendar,
  Clock,
  Users,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  XCircle,
  MoreVertical,
  CalendarCheck,
  Star,
  Mail,
  Table2,
  X,
  Building2,
  ChevronRight,
  Phone
} from 'lucide-react';
import { Sidebar } from '@/components/ui/Sidebar';

const BookingCard = ({ id, name, date, time, guests, table, status, type, confirmationCode, onConfirm, onCancel, onClick }: any) => (
  <div onClick={onClick} className="glass-panel p-6 rounded-2xl border border-white/60 hover:shadow-xl transition-all group relative overflow-hidden bg-white/40 backdrop-blur-xl cursor-pointer">
    <div className={`absolute top-0 left-0 w-1 h-full ${status === 'CONFIRMED' ? 'bg-emerald-500' : status === 'PENDING' ? 'bg-amber-500' : 'bg-stone-300'}`}></div>

    <div className="flex justify-between items-start mb-4 pl-2">
      <div>
        <h4 className="text-lg font-extrabold text-on-surface italic font-headline">{name}</h4>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-black text-amber-800 bg-amber-50/50 px-2 py-0.5 rounded border border-amber-100/50">
            Code: {confirmationCode}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${type === 'VIP' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-surface-container text-stone-500'}`}>
            {type}
          </span>
        </div>
      </div>
      <button className="p-2 hover:bg-white/60 rounded-full transition-all text-stone-400">
        <MoreVertical size={18} />
      </button>
    </div>

    <div className="grid grid-cols-2 gap-4 mb-6 pl-2">
      <div className="space-y-4">
        <div className="flex items-center gap-3 text-stone-500">
          <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary/70">
            <Calendar size={16} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Date</p>
            <p className="text-xs font-bold text-on-surface">{date}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-stone-500">
          <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary/70">
            <Clock size={16} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Arrival</p>
            <p className="text-xs font-bold text-on-surface">{time}</p>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex items-center gap-3 text-stone-500">
          <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary/70">
            <Users size={16} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Guests</p>
            <p className="text-xs font-bold text-on-surface">{guests} Persons</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-stone-500">
          <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary/70">
            <Table2 size={16} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Allocation</p>
            <p className="text-xs font-bold text-on-surface">Table {table}</p>
          </div>
        </div>
      </div>
    </div>

    <div className="flex gap-2 pt-4 border-t border-white/40 pl-2">
      {status === 'PENDING' ? (
        <>
          <button onClick={(e) => { e.stopPropagation(); onConfirm(); }} className="flex-1 py-2.5 bg-[#2c160e] text-white rounded-xl text-xs font-black shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform">Confirm</button>
          <button onClick={(e) => { e.stopPropagation(); onCancel(); }} className="px-4 py-2.5 bg-white/60 text-stone-500 rounded-xl text-xs font-bold hover:bg-white border border-white/40 transition-all">Reject</button>
        </>
      ) : (
        <button className="w-full py-2.5 bg-white/60 text-[#8D6E63] rounded-xl text-xs font-black italic border border-[#8D6E63]/20 flex items-center justify-center gap-2">
          {status} <ChevronRight size={14} />
        </button>
      )}
    </div>
  </div>
);

export default function BookingsPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [cafes, setCafes] = useState<any[]>([]);
  const [cafeTables, setCafeTables] = useState<any[]>([]);
  const [selectedCafe, setSelectedCafe] = useState<string>('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [showAddSidebar, setShowAddSidebar] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingBooking, setViewingBooking] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    guestName: '',
    email: '',
    phone: '',
    date: new Date().toISOString().split('T')[0],
    time: '19:00',
    partySize: '2',
    notes: '',
    tableId: '',
  });

  useEffect(() => {
    const role = document.cookie.split('; ').find(row => row.startsWith('admin_role='))?.split('=')[1];
    setUserRole(role || null);
    loadCafes();
  }, []);

  useEffect(() => {
    if (selectedCafe) {
      loadReservations(selectedCafe);
      loadCafeTables(selectedCafe);
    } else {
      setReservations([]);
      setCafeTables([]);
      setLoading(false);
    }
  }, [selectedCafe]);

  useEffect(() => {
    if (formData.tableId) {
      const selectedTable = cafeTables.find((t) => t.id === formData.tableId);
      const partySize = parseInt(formData.partySize) || 0;
      if (selectedTable && selectedTable.capacity < partySize) {
        setFormData((prev) => ({ ...prev, tableId: '' }));
      }
    }
  }, [formData.partySize, formData.tableId, cafeTables]);

  async function loadCafes() {
    try {
      const res = await api.cafes.list();
      if (res.success && res.data.length > 0) {
        setCafes(res.data);
        setSelectedCafe(res.data[0].id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to load cafes:', error);
      setLoading(false);
    }
  }

  async function loadReservations(cafeId: string) {
    setLoading(true);
    try {
      const res = await api.reservations.list({ cafeId, limit: 50 });
      if (res.success) {
        setReservations(res.data);
      }
    } catch (error) {
      console.error('Failed to load reservations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadCafeTables(cafeId: string) {
    try {
      const res = await api.tables.list(cafeId);
      if (res.success) {
        setCafeTables(res.data);
      }
    } catch (error) {
      console.error('Failed to load cafe tables:', error);
    }
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.reservations.create({
        ...formData,
        cafeId: selectedCafe,
        partySize: parseInt(formData.partySize),
        date: new Date(`${formData.date}T${formData.time}`).toISOString()
      });
      
      if (res.success) {
        setShowAddSidebar(false);
        setFormData({
          guestName: '',
          email: '',
          phone: '',
          date: new Date().toISOString().split('T')[0],
          time: '19:00',
          partySize: '2',
          notes: '',
          tableId: '',
        });
        loadReservations(selectedCafe);
      }
    } catch (error: any) {
      console.error('Failed to add reservation:', error);
      alert(error.message || 'Failed to add reservation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      await api.reservations.updateStatus(id, 'CONFIRMED');
      loadReservations(selectedCafe);
    } catch (error) {
      console.error('Failed to confirm reservation:', error);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.reservations.updateStatus(id, 'CANCELLED');
      loadReservations(selectedCafe);
    } catch (error) {
      console.error('Failed to cancel reservation:', error);
    }
  };

  const formatDateTime = (date: string) => {
    const d = new Date(date);
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const filteredReservations = reservations.filter((res) => {
    if (activeTab === 'upcoming') return res.status === 'CONFIRMED' && new Date(res.date) >= new Date();
    if (activeTab === 'pending') return res.status === 'PENDING';
    if (activeTab === 'completed') return res.status === 'COMPLETED' || new Date(res.date) < new Date();
    return true;
  });

  return (
    <Layout>
      {/* Page Header */}
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-on-surface mb-2 font-headline italic">Bookings & Concierge</h2>
          <p className="text-secondary font-body font-bold text-sm">Managing the sequence of arrival and specialized guest services.</p>
        </div>
        <div className="flex gap-4">
          <div className="relative group">
            <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-stone-900 transition-colors" />
            <select
              value={selectedCafe}
              onChange={(e) => setSelectedCafe(e.target.value)}
              disabled={userRole === 'CAFE_OWNER'}
              className={`pl-12 pr-10 py-3.5 bg-white border border-stone-100 rounded-2xl text-sm focus:ring-4 ring-stone-900/5 transition-all outline-none font-black italic shadow-sm appearance-none ${userRole === 'CAFE_OWNER' ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
            >
              {cafes.map((cafe) => (
                <option key={cafe.id} value={cafe.id}>{cafe.name}</option>
              ))}
              {cafes.length === 0 && <option value="">No Cafes Available</option>}
            </select>
          </div>
          <button 
            onClick={() => setShowAddSidebar(true)}
            className="bg-[#2c160e] text-white px-8 py-3.5 rounded-2xl font-black text-sm shadow-2xl shadow-primary/30 hover:scale-[1.02] transition-all flex items-center gap-3"
          >
            <Plus size={20} /> New Reservation
          </button>
        </div>
      </div>

      {/* Summary Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Total Today', value: '24', icon: CalendarCheck, color: 'text-primary' },
          { label: 'Confirmed', value: '18', icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Pending Request', value: '6', icon: Clock, color: 'text-amber-600' },
          { label: 'VIP Guests', value: '4', icon: Star, color: 'text-amber-400' }
        ].map((stat, i) => (
          <div key={i} className="glass-panel p-4 rounded-2xl flex items-center gap-4 bg-white/20 backdrop-blur-md border border-white/60 shadow-sm">
            <div className={`p-2.5 rounded-xl bg-white shadow-inner ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">{stat.label}</p>
              <p className="text-xl font-black italic">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Control Row */}
      <div className="flex flex-wrap items-center justify-between gap-6 mb-8">
        <div className="flex gap-2 p-1.5 bg-surface-container-low rounded-2xl backdrop-blur-md border border-white/40 shadow-inner">
          {['upcoming', 'pending', 'completed'].map((tab) => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-xl text-xs font-black tracking-wide transition-all uppercase ${activeTab === tab ? 'bg-white shadow-md text-primary scale-105' : 'text-stone-400 hover:text-stone-600'}`}
            >
              {tab}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Guest name or ID..." 
              className="pl-12 pr-6 py-3 bg-white/60 border border-white/60 rounded-2xl text-sm focus:ring-2 ring-primary/10 w-72 transition-all outline-none font-bold placeholder:text-stone-300 shadow-sm"
            />
          </div>
          <button className="p-3 bg-white border border-white/60 rounded-2xl text-stone-400 hover:text-primary transition-all shadow-md group">
            <Filter size={20} className="group-hover:rotate-180 transition-transform duration-500" />
          </button>
        </div>
      </div>

      {/* Bookings Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-96 mb-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {filteredReservations.map((reservation) => {
            const { date, time } = formatDateTime(reservation.date);
            return (
              <BookingCard
                key={reservation.id}
                id={reservation.id}
                name={typeof (reservation.user?.name) === 'object' ? 'Guest' : (reservation.user?.name || 'Guest')}
                date={date}
                time={time}
                guests={reservation.partySize || reservation.party_size}
                table={reservation.table?.tableNumber || reservation.table?.table_number || 'TBD'}
                status={reservation.status}
                type="Standard"
                confirmationCode={reservation.confirmation_code || reservation.confirmationCode}
                onClick={() => setViewingBooking(reservation)}
                onConfirm={() => handleConfirm(reservation.id)}
                onCancel={() => handleCancel(reservation.id)}
              />
            );
          })}
          {filteredReservations.length === 0 && (
            <div className="col-span-3 text-center py-12 text-stone-500">
              No reservations found
            </div>
          )}
        </div>
      )}

      {/* Mini Calendar View Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
        <div className="lg:col-span-1 glass-panel p-8 rounded-[2rem] bg-[#2c160e] text-white overflow-hidden relative border border-white/10 shadow-2xl">
          <h3 className="text-xl font-black italic mb-6">Concierge Insights</h3>
          <div className="space-y-6 relative z-10">
            <div className="p-4 rounded-2xl bg-white/10 border border-white/10">
              <p className="text-[10px] font-black uppercase text-amber-400 mb-1">Peak Occupancy</p>
              <p className="text-sm font-bold opacity-90">12:30 PM — 02:00 PM expected to reach 95% capacity.</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/10 border border-white/10">
              <p className="text-[10px] font-black uppercase text-primary mb-1">Staffing Suggestion</p>
              <p className="text-sm font-bold opacity-90">High VIP count today. Assign Senior Concierge to Lounge A.</p>
            </div>
          </div>
          <div className="absolute -bottom-10 -right-10 opacity-5">
             <Calendar size={240} />
          </div>
        </div>
        <div className="lg:col-span-2 glass-panel p-8 rounded-[2rem] border border-white/60 bg-white/40">
           <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black italic font-headline text-on-surface">Weekly Distribution</h3>
              <div className="flex gap-2">
                 <button className="w-8 h-8 rounded-full border border-stone-200 flex items-center justify-center text-stone-400 hover:bg-white"><ChevronRight size={16} className="rotate-180" /></button>
                 <button className="w-8 h-8 rounded-full border border-stone-200 flex items-center justify-center text-stone-400 hover:bg-white"><ChevronRight size={16} /></button>
              </div>
           </div>
           <div className="h-48 flex items-end justify-between px-6 gap-4">
              {[60, 45, 80, 70, 95, 85, 40].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-4">
                   <div className="w-full bg-primary/10 rounded-t-xl group relative cursor-pointer hover:bg-primary/20 transition-all" style={{ height: `${h}%` }}>
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-black text-primary opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{h}%</div>
                   </div>
                   <span className="text-[10px] font-black text-stone-400 uppercase">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Add Reservation Sidebar */}
      <Sidebar
        isOpen={showAddSidebar}
        onClose={() => setShowAddSidebar(false)}
        title="New Reservation"
      >
        <form onSubmit={handleAddSubmit} className="space-y-8">
          <div className="space-y-6">
            <div className="group">
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Guest Name</label>
              <input
                type="text"
                required
                value={formData.guestName}
                onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-900 italic"
                placeholder="John Doe"
              />
            </div>

            <div className="group">
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-5 top-5 text-stone-300 group-focus-within:text-stone-900 transition-colors" size={18} />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-14 pr-6 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-800"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="group">
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-5 top-5 text-stone-300 group-focus-within:text-stone-900" size={18} />
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-14 pr-6 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-800"
                    placeholder="+91..."
                  />
                </div>
              </div>
              <div className="group">
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Party Size</label>
                <div className="relative">
                  <Users className="absolute left-5 top-5 text-stone-300 group-focus-within:text-stone-900" size={18} />
                  <input
                    type="number"
                    required
                    min="1"
                    max="20"
                    value={formData.partySize}
                    onChange={(e) => setFormData({ ...formData, partySize: e.target.value })}
                    className="w-full pl-14 pr-6 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-800"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="group">
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-5 top-5 text-stone-300 group-focus-within:text-stone-900" size={18} />
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full pl-14 pr-6 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-800"
                  />
                </div>
              </div>
              <div className="group">
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Time</label>
                <div className="relative">
                  <Clock className="absolute left-5 top-5 text-stone-300 group-focus-within:text-stone-900" size={18} />
                  <input
                    type="time"
                    required
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full pl-14 pr-6 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-800"
                  />
                </div>
              </div>
            </div>

            <div className="group">
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Assign Table</label>
              <select
                value={formData.tableId}
                onChange={(e) => setFormData({ ...formData, tableId: e.target.value })}
                className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-800 cursor-pointer"
              >
                <option value="">Table TBD (To Be Decided)</option>
                {cafeTables
                  .filter((t) => {
                    const partySize = parseInt(formData.partySize) || 0;
                    return t.capacity >= partySize;
                  })
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      Table {t.tableNumber || t.table_number} ({t.capacity} Seats - {t.section || t.floor})
                    </option>
                  ))}
              </select>
            </div>

            <div className="group">
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Special Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-6 py-5 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-800 min-h-[100px] resize-none"
                placeholder="Allergies, table preference, anniversary..."
              />
            </div>
          </div>

          <div className="pt-8 border-t border-stone-100 flex gap-4">
            <button
              type="button"
              onClick={() => setShowAddSidebar(false)}
              className="flex-1 px-4 py-4 border border-stone-200 rounded-2xl font-black text-xs uppercase tracking-widest text-stone-400 hover:bg-stone-50 hover:text-stone-600 transition-all font-headline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-4 bg-[#2c160e] text-white rounded-2xl font-black italic tracking-tight hover:shadow-2xl hover:shadow-stone-900/20 active:scale-95 disabled:opacity-50 transition-all font-headline text-lg"
            >
              {isSubmitting ? 'Confirming...' : 'Book Table'}
            </button>
          </div>
        </form>
      </Sidebar>

      {/* Booking Details Sidebar */}
      <Sidebar
        isOpen={viewingBooking !== null}
        onClose={() => setViewingBooking(null)}
        title="Reservation Details"
      >
        {viewingBooking && (
          <div className="space-y-8">
            {/* Guest Profile */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest px-1">Guest Profile</h3>
              <div className="p-5 bg-stone-50 rounded-2xl border border-stone-100 space-y-3">
                <p className="text-sm font-bold text-stone-900 leading-none">{viewingBooking.user?.name || 'Guest'}</p>
                <div className="flex items-center gap-2 text-stone-500 text-xs">
                  <Mail size={12} />
                  <span>{viewingBooking.user?.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-stone-500 text-xs">
                  <Phone size={12} />
                  <span>{viewingBooking.user?.phone || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Reservation Specs */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest px-1">Seating Specifications</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                  <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-1">Confirmation Code</p>
                  <p className="text-xs font-black text-stone-800">{viewingBooking.confirmation_code || viewingBooking.confirmationCode}</p>
                </div>
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                  <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-1">Table Seating</p>
                  <p className="text-xs font-black text-stone-800">Table {viewingBooking.table?.table_number || viewingBooking.table?.tableNumber || 'TBD'}</p>
                </div>
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                  <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-1">Party Size</p>
                  <p className="text-xs font-black text-stone-800">{(viewingBooking.partySize || viewingBooking.party_size || 2)} Guests</p>
                </div>
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                  <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-1">Date & Time</p>
                  <p className="text-xs font-black text-stone-800">{viewingBooking.date} at {viewingBooking.time}</p>
                </div>
              </div>
            </div>

            {/* Special Request */}
            {viewingBooking.special_requests && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest px-1">Special Notes</h3>
                <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-100 text-xs font-bold text-amber-900 italic leading-relaxed">
                  "{viewingBooking.special_requests}"
                </div>
              </div>
            )}

            {/* Pre-order items */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest px-1">Pre-ordered Food & Drink</h3>
              <div className="p-5 bg-stone-50 rounded-2xl border border-stone-100 space-y-4">
                {(() => {
                  let items = [];
                  try {
                    items = typeof viewingBooking.pre_order_items === 'string'
                      ? JSON.parse(viewingBooking.pre_order_items)
                      : (viewingBooking.pre_order_items || viewingBooking.preOrderItems);
                  } catch (e) {
                    console.error("Failed to parse pre-order items", e);
                  }
                  if (!Array.isArray(items) || items.length === 0) {
                    return <p className="text-xs font-bold text-stone-400 text-center py-2">No pre-order menu items selected</p>;
                  }
                  return (
                    <div className="space-y-3">
                      {items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-xs font-bold text-stone-700">
                          <span>{item.name} <span className="text-stone-400">x{item.quantity}</span></span>
                          <span>₹{((item.price || item.line_total || 0) * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="h-px bg-stone-200/60 my-2 pt-2"></div>
                      <div className="flex justify-between items-center text-sm font-black text-stone-900 italic">
                        <span>Pre-order Total</span>
                        <span>₹{(viewingBooking.pre_order_total || viewingBooking.preOrderTotal || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Status Dropdown */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest px-1">Modify Booking Status</h3>
              <div className="relative">
                <select
                  value={viewingBooking.status}
                  onChange={async (e) => {
                    const nextStatus = e.target.value;
                    try {
                      const res = await api.reservations.updateStatus(viewingBooking.id, nextStatus);
                      if (res.success) {
                        setViewingBooking({ ...viewingBooking, status: nextStatus });
                        loadReservations(selectedCafe);
                      }
                    } catch (error) {
                      console.error("Failed to update status", error);
                    }
                  }}
                  className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-800 appearance-none cursor-pointer"
                >
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="SEATED">Seated</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="NO_SHOW">No Show</option>
                </select>
                <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-300 rotate-90 pointer-events-none" />
              </div>
            </div>
          </div>
        )}
      </Sidebar>
    </Layout>
  );
}
