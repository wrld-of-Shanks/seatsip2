'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { api } from '@/services/api';
import { Plus, Edit, Trash2, MapPin, Star, Table as TableIcon, Search, Filter, Building2, Phone, Clock, Image as ImageIcon, User, ChevronDown } from 'lucide-react';
import { Sidebar } from '@/components/ui/Sidebar';

export default function CafesPage() {
  const [cafes, setCafes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddSidebar, setShowAddSidebar] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCafe, setSelectedCafe] = useState<any>(null);
  const [editingCafe, setEditingCafe] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [owners, setOwners] = useState<any[]>([]);
  const isCafeOwner = userRole === 'CAFE_OWNER';

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    description: '',
    imageUrl: '',
    openingHours: '',
    city: 'Mumbai',
    lat: 19.0760,
    lng: 72.8777,
    rating: 4.5,
    ownerId: '',
    wifi: true,
    parking: false,
    petFriendly: false,
    priceLevel: '2',
    prepTimeMinutes: '15',
    deliveryFee: '0',
    minOrder: '0',
    upiId: '',
    isOpen: true,
    tags: '',
    moods: '',
    images: '',
    emoji: '',
    coverColor: '',
    discount: '',
    reservationSlots: '09:00, 11:00, 13:00, 15:00, 17:00, 19:00',
  });

  useEffect(() => {
    const role = document.cookie.split('; ').find(row => row.startsWith('admin_role='))?.split('=')[1];
    setUserRole(role || null);
    loadCafes();
    if (role === 'ADMIN') {
      loadOwners();
    }
  }, []);

  async function loadCafes() {
    try {
      const res = await api.cafes.list();
      if (res.success) {
        setCafes(res.data);
      }
    } catch (error) {
      console.error('Failed to load cafes:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadOwners() {
    try {
      const res = await api.cafeOwners.list();
      if (res.success) {
        setOwners(res.data);
      }
    } catch (error) {
      console.error('Failed to load owners:', error);
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      phone: '',
      description: '',
      imageUrl: '',
      openingHours: '',
      city: 'Mumbai',
      lat: 19.0760,
      lng: 72.8777,
      rating: 4.5,
      ownerId: '',
      wifi: true,
      parking: false,
      petFriendly: false,
      priceLevel: '2',
      prepTimeMinutes: '15',
      deliveryFee: '0',
      minOrder: '0',
      upiId: '',
      isOpen: true,
      tags: '',
      moods: '',
      images: '',
      emoji: '',
      coverColor: '',
      discount: '',
      reservationSlots: '09:00, 11:00, 13:00, 15:00, 17:00, 19:00',
    });
    setEditingCafe(null);
  };

  const handleEdit = (cafe: any) => {
    setEditingCafe(cafe);
    
    const safeParseStringList = (val: any, joinStr: string = ', ') => {
      if (!val) return '';
      if (Array.isArray(val)) return val.join(joinStr);
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) return parsed.join(joinStr);
        } catch {
          return val;
        }
      }
      return '';
    };

    setFormData({
      name: cafe.name || '',
      address: cafe.address || '',
      phone: cafe.phone || '',
      description: cafe.description || '',
      imageUrl: cafe.imageUrl || cafe.image_url || '',
      openingHours: cafe.openingHours || (cafe.open_time && cafe.close_time ? `${cafe.open_time} - ${cafe.close_time}` : ''),
      city: cafe.city || 'Mumbai',
      lat: cafe.latitude !== undefined ? cafe.latitude : 19.0760,
      lng: cafe.longitude !== undefined ? cafe.longitude : 72.8777,
      rating: cafe.rating || 4.5,
      ownerId: cafe.owner_id || cafe.ownerId || '',
      wifi: cafe.wifi !== 0,
      parking: cafe.parking === 1,
      petFriendly: cafe.pet_friendly === 1 || cafe.petFriendly === 1,
      priceLevel: String(cafe.price_level || 2),
      prepTimeMinutes: String(cafe.prep_time_minutes || 15),
      deliveryFee: String(cafe.delivery_fee || 0),
      minOrder: String(cafe.min_order || 0),
      upiId: cafe.upi_id || cafe.upiId || '',
      isOpen: cafe.isOpen !== false && cafe.is_open !== 0,
      tags: safeParseStringList(cafe.tags, ', '),
      moods: safeParseStringList(cafe.moods, ', '),
      images: safeParseStringList(cafe.images, '\n'),
      emoji: cafe.emoji || '',
      coverColor: cafe.coverColor || cafe.cover_color || '',
      discount: cafe.discount || '',
      reservationSlots: safeParseStringList(cafe.reservation_slots || cafe.reservationSlots, ', '),
    });
    setShowAddSidebar(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let res;
      if (editingCafe) {
        res = await api.cafes.update(editingCafe.id, formData);
      } else {
        res = await api.cafes.create(formData);
      }
      
      if (res.success) {
        setShowAddSidebar(false);
        resetForm();
        loadCafes();
      }
    } catch (error: any) {
      console.error('Failed to save cafe:', error);
      alert(error.message || 'An error occurred while saving the cafe');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCafes = isCafeOwner ? cafes : cafes.filter(cafe =>
    cafe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cafe.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async () => {
    if (!selectedCafe) return;

    try {
      await api.cafes.delete(selectedCafe.id);
      setShowDeleteModal(false);
      setSelectedCafe(null);
      loadCafes();
    } catch (error) {
      console.error('Failed to delete cafe:', error);
    }
  };

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
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 mb-2 font-headline italic">{isCafeOwner ? 'My Cafe' : 'Cafes'}</h1>
          <p className="text-stone-600 font-medium">
            {isCafeOwner ? 'Edit your cafe profile and customer-facing details.' : 'Manage your partner cafes and their configurations.'}
          </p>
        </div>
        {!isCafeOwner && (
          <button
            onClick={() => setShowAddSidebar(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-stone-900 to-stone-800 text-white rounded-xl font-bold hover:shadow-xl transition-all shadow-lg active:scale-95"
          >
            <Plus size={20} />
            Add Cafe
          </button>
        )}
      </div>

      {/* Search & Filter */}
      {!isCafeOwner && (
      <div className="mb-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input
            type="text"
            placeholder="Search cafes by name or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all font-medium"
          />
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition-all font-bold text-stone-600 shadow-sm">
          <Filter size={20} />
          Filters
        </button>
      </div>
      )}

      {/* Cafes Table */}
      <div className="bg-white rounded-[2rem] overflow-hidden shadow-[0px_24px_48px_rgba(116,85,75,0.06)] border border-stone-100">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-stone-50/50 border-b border-stone-100">
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-stone-400">Cafe Details</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-stone-400">Location</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-stone-400">Recognition</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-stone-400 text-center">Tables</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-stone-400 text-center">Status</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-stone-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {filteredCafes.map((cafe) => (
              <tr key={cafe.id} className="hover:bg-stone-50/40 transition-all group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-stone-100 overflow-hidden flex-shrink-0 border border-stone-200 shadow-inner group-hover:scale-105 transition-transform duration-500">
                      {cafe.imageUrl ? (
                        <img src={cafe.imageUrl} alt={cafe.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-300">
                          <Building2 size={24} />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-900 font-headline italic">{cafe.name}</h3>
                      <p className="text-xs font-bold text-stone-400 flex items-center gap-1 mt-0.5">
                        <Phone size={10} /> {cafe.phone}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-stone-600 max-w-[200px]">
                    <MapPin size={14} className="text-stone-300 flex-shrink-0" />
                    <span className="truncate">{cafe.address}</span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100/50">
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                      <span className="text-xs font-black text-amber-700">{cafe.rating || '4.5'}</span>
                    </div>
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-tighter">({cafe.reviewCount || 0} reviews)</span>
                  </div>
                </td>
                <td className="px-8 py-5 text-center">
                  <div className="inline-flex items-center gap-2 bg-stone-100 px-3 py-1.5 rounded-xl border border-stone-200/50">
                    <TableIcon size={14} className="text-stone-500" />
                    <span className="text-xs font-black text-stone-700">{cafe._count?.tables || 0}</span>
                  </div>
                </td>
                <td className="px-8 py-5 text-center">
                  <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    cafe.isActive !== false
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      : 'bg-rose-50 text-rose-600 border border-rose-100'
                  }`}>
                    {cafe.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-8 py-5 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(cafe)}
                      className="p-2 text-stone-400 hover:text-stone-900 hover:bg-white hover:shadow-md rounded-xl transition-all"
                    >
                      <Edit size={16} />
                    </button>
                    {userRole === 'ADMIN' && (
                      <button
                        onClick={() => {
                          setSelectedCafe(cafe);
                          setShowDeleteModal(true);
                        }}
                        className="p-2 text-stone-400 hover:text-rose-600 hover:bg-white hover:shadow-md rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredCafes.length === 0 && (
          <div className="text-center py-20 bg-white">
            <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-stone-100 shadow-inner">
               <Building2 size={32} className="text-stone-200" />
            </div>
            <h4 className="text-lg font-black text-stone-900 italic font-headline mb-1">No Cafes Found</h4>
            <p className="text-stone-400 text-sm font-bold">Try adjusting your filters or start by adding a new partner cafe.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Cafe Sidebar */}
      <Sidebar
        isOpen={showAddSidebar}
        onClose={() => { resetForm(); setShowAddSidebar(false); }}
        title={isCafeOwner ? "Edit My Cafe" : editingCafe ? "Update Cafe" : "Add New Cafe"}
      >
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-6">
            <div className="group">
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Establishment Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-900 italic"
                placeholder="The Artisanal Roast..."
              />
            </div>

            {userRole === 'ADMIN' && (
              <div className="group">
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Assign Cafe Proprietor</label>
                <div className="relative">
                  <User className="absolute left-5 top-5 text-stone-300 group-focus-within:text-stone-900 transition-colors" size={18} />
                  <select
                    value={formData.ownerId}
                    onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                    className="w-full pl-14 pr-12 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-800 appearance-none cursor-pointer"
                  >
                    <option value="">Select an Owner</option>
                    {owners.map(owner => (
                      <option key={owner.id} value={owner.id}>{owner.name} ({owner.email})</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-5 top-5 text-stone-300 pointer-events-none" size={18} />
                </div>
              </div>
            )}

            {!isCafeOwner && (
            <div className="group">
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Location Details</label>
              <div className="relative">
                <MapPin className="absolute left-5 top-5 text-stone-300 group-focus-within:text-stone-900 transition-colors" size={18} />
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full pl-14 pr-6 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-800"
                  placeholder="Street address, City"
                />
              </div>
            </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <div className="group">
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Contact</label>
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
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Hours</label>
                <div className="relative">
                  <Clock className="absolute left-5 top-5 text-stone-300 group-focus-within:text-stone-900" size={18} />
                  <input
                    type="text"
                    value={formData.openingHours}
                    onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
                    className="w-full pl-14 pr-6 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-800"
                    placeholder="9 AM - 10 PM"
                  />
                </div>
              </div>
            </div>

            {!isCafeOwner && (
            <div className="group">
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Reservation Time Slots (Comma-separated)</label>
              <div className="relative">
                <Clock className="absolute left-5 top-5 text-stone-300 group-focus-within:text-stone-900" size={18} />
                <input
                  type="text"
                  value={formData.reservationSlots}
                  onChange={(e) => setFormData({ ...formData, reservationSlots: e.target.value })}
                  className="w-full pl-14 pr-6 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-800"
                  placeholder="09:00, 11:00, 13:00, 15:00, 17:00, 19:00"
                />
              </div>
              <p className="text-[10px] text-stone-400 font-bold mt-1.5">Specify custom reservation times for customer bookings.</p>
            </div>
            )}

            {!isCafeOwner && (
            <>
            <div className="grid grid-cols-2 gap-6">
              <div className="group">
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Price Level</label>
                <select
                  value={formData.priceLevel}
                  onChange={(e) => setFormData({ ...formData, priceLevel: e.target.value })}
                  className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-800 cursor-pointer"
                >
                  <option value="1">₹ (Budget)</option>
                  <option value="2">₹₹ (Moderate)</option>
                  <option value="3">₹₹₹ (Premium)</option>
                  <option value="4">₹₹₹₹ (Luxury)</option>
                </select>
              </div>
              <div className="group">
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Prep Time (Min)</label>
                <input
                  type="number"
                  required
                  value={formData.prepTimeMinutes}
                  onChange={(e) => setFormData({ ...formData, prepTimeMinutes: e.target.value })}
                  className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-800"
                  placeholder="15"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="group">
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Delivery Fee (₹)</label>
                <input
                  type="number"
                  required
                  value={formData.deliveryFee}
                  onChange={(e) => setFormData({ ...formData, deliveryFee: e.target.value })}
                  className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-800"
                  placeholder="0"
                />
              </div>
              <div className="group">
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Min Order (₹)</label>
                <input
                  type="number"
                  required
                  value={formData.minOrder}
                  onChange={(e) => setFormData({ ...formData, minOrder: e.target.value })}
                  className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-800"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">UPI ID (Payments)</label>
              <input
                type="text"
                value={formData.upiId}
                onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-800"
                placeholder="merchant@upi"
              />
            </div>
            </>
            )}

            {!isCafeOwner && (
            <div className="grid grid-cols-3 gap-6">
              <div className="group">
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Emoji Icon</label>
                <input
                  type="text"
                  value={formData.emoji}
                  onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                  className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-800"
                  placeholder="☕"
                />
              </div>
              <div className="group">
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Cover Color</label>
                <input
                  type="text"
                  value={formData.coverColor}
                  onChange={(e) => setFormData({ ...formData, coverColor: e.target.value })}
                  className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-800"
                  placeholder="#5C3320"
                />
              </div>
              <div className="group">
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Discount Tag</label>
                <input
                  type="text"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                  className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-800"
                  placeholder="30% off"
                />
              </div>
            </div>
            )}

            <div className="space-y-4">
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Amenities</label>
              <div className="grid grid-cols-3 gap-4">
                <label className="flex items-center gap-2 p-3 bg-stone-50 rounded-xl border border-stone-100 cursor-pointer hover:bg-stone-100 transition-all">
                  <input
                    type="checkbox"
                    checked={formData.wifi}
                    onChange={(e) => setFormData({ ...formData, wifi: e.target.checked })}
                    className="accent-stone-900"
                  />
                  <span className="text-xs font-bold text-stone-700">WiFi</span>
                </label>
                <label className="flex items-center gap-2 p-3 bg-stone-50 rounded-xl border border-stone-100 cursor-pointer hover:bg-stone-100 transition-all">
                  <input
                    type="checkbox"
                    checked={formData.parking}
                    onChange={(e) => setFormData({ ...formData, parking: e.target.checked })}
                    className="accent-stone-900"
                  />
                  <span className="text-xs font-bold text-stone-700">Parking</span>
                </label>
                <label className="flex items-center gap-2 p-3 bg-stone-50 rounded-xl border border-stone-100 cursor-pointer hover:bg-stone-100 transition-all">
                  <input
                    type="checkbox"
                    checked={formData.petFriendly}
                    onChange={(e) => setFormData({ ...formData, petFriendly: e.target.checked })}
                    className="accent-stone-900"
                  />
                  <span className="text-xs font-bold text-stone-700">Pets Ok</span>
                </label>
              </div>
            </div>

            {!isCafeOwner && (
            <div className="space-y-4">
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Operations Status</label>
              <label className="flex items-center gap-2 p-3 bg-stone-50 rounded-xl border border-stone-100 cursor-pointer hover:bg-stone-100 transition-all w-full">
                <input
                  type="checkbox"
                  checked={formData.isOpen}
                  onChange={(e) => setFormData({ ...formData, isOpen: e.target.checked })}
                  className="accent-stone-900"
                />
                <span className="text-xs font-bold text-stone-700">Cafe is Open for Booking</span>
              </label>
            </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <div className="group">
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">More Reasons to Love It (Comma-separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-800"
                  placeholder="e.g. Art space, Board games, Vegan options, Instagrammable"
                />
              </div>
              <div className="group">
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Perfect For (Comma-separated)</label>
                <input
                  type="text"
                  value={formData.moods}
                  onChange={(e) => setFormData({ ...formData, moods: e.target.value })}
                  className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-800"
                  placeholder="e.g. Work, Date, Chill"
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Gallery Images Carousel (URLs)</label>
              <textarea
                value={formData.images}
                onChange={(e) => setFormData({ ...formData, images: e.target.value })}
                className="w-full px-6 py-5 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-800 min-h-[100px] resize-none"
                placeholder="Enter one image URL per line (or comma-separated) for the detail page slider..."
              />
            </div>

            <div className="group">
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Cafe Narrative</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-6 py-5 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-800 min-h-[120px] resize-none"
                placeholder="Tell us about the cafe's atmosphere..."
              />
            </div>

            <div className="group">
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Cover Image Representation</label>
              <div className="relative">
                <ImageIcon className="absolute left-5 top-5 text-stone-300 group-focus-within:text-stone-900" size={18} />
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full pl-14 pr-6 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-800"
                  placeholder="https://images.unsplash.com/..."
                />
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-stone-100 flex gap-4">
            <button
              type="button"
              onClick={() => { resetForm(); setShowAddSidebar(false); }}
              className="flex-1 px-4 py-4 border border-stone-200 rounded-2xl font-black text-xs uppercase tracking-widest text-stone-400 hover:bg-stone-50 hover:text-stone-600 transition-all font-headline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-4 bg-stone-900 text-white rounded-2xl font-black italic tracking-tight hover:shadow-2xl hover:shadow-stone-900/20 active:scale-95 disabled:opacity-50 transition-all font-headline text-lg"
            >
              {isSubmitting ? 'Processing...' : (editingCafe ? 'Update Cafe' : 'Integrate Cafe')}
            </button>
          </div>
        </form>
      </Sidebar>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-md" onClick={() => setShowDeleteModal(false)} />
          <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full relative shadow-[0px_48px_96px_rgba(0,0,0,0.12)] border border-stone-100">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
               <Trash2 size={32} />
            </div>
            <h3 className="text-3xl font-black text-stone-900 mb-2 italic font-headline leading-tight">Dissolve Partnership?</h3>
            <p className="text-stone-500 mb-10 font-bold leading-relaxed">
              Are you sure you want to remove <span className="text-stone-900 font-black">"{selectedCafe?.name}"</span>? All associated data including tables and menus will be archived.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleDelete}
                className="w-full px-4 py-4 bg-rose-600 text-white rounded-2xl font-black italic tracking-tight hover:bg-rose-700 transition-all shadow-xl shadow-rose-200 font-headline text-lg"
              >
                Yes, Delete Cafe
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedCafe(null);
                }}
                className="w-full px-4 py-4 bg-stone-50 text-stone-400 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-stone-100 hover:text-stone-600 transition-all font-headline"
              >
                No, Keep it
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
