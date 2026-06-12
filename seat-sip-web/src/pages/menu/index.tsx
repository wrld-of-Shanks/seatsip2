import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { api } from '@/services/api';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Star, 
  Coffee, 
  Utensils, 
  CheckCircle2,
  Tag,
  IndianRupee,
  Building2,
  ChevronDown,
  Image as ImageIcon
} from 'lucide-react';
import { Sidebar } from '@/components/ui/Sidebar';

const MenuItem = ({ name, category, price, status, image, onToggleStatus, onEdit, onDelete }: any) => (
  <div className="glass-panel p-5 rounded-[2rem] border border-white/60 hover:shadow-2xl transition-all group relative overflow-hidden bg-white/40 backdrop-blur-xl">
    <div className="relative aspect-square rounded-[1.5rem] bg-stone-100 overflow-hidden mb-5 border border-stone-200/50 shadow-inner">
      {image ? (
        <img src={image} alt={name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-stone-200">
          <Coffee size={48} />
        </div>
      )}
      <div className="absolute top-3 right-3">
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md shadow-lg border ${status ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/20' : 'bg-stone-500/20 text-stone-500 border-stone-500/20'}`}>
          {status ? 'Available' : 'Sold Out'}
        </span>
      </div>
    </div>
    <div className="flex justify-between items-start mb-1">
      <div>
        <h4 className="font-black text-stone-900 leading-tight italic font-headline text-lg">{typeof name === 'object' ? 'Unnamed Item' : name}</h4>
        <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mt-1">{typeof category === 'object' ? 'Uncategorized' : category}</p>
      </div>
      <div className="flex flex-col items-end">
        <span className="font-black text-stone-900 text-lg italic tracking-tighter">₹{price}</span>
      </div>
    </div>
    <div className="flex gap-2 mt-6 pt-5 border-t border-stone-100/50">
      <button 
        onClick={onToggleStatus}
        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${status ? 'bg-stone-100 text-stone-600 hover:bg-stone-200' : 'bg-stone-900 text-white hover:bg-stone-800'}`}
      >
        {status ? 'Mark Unavailable' : 'Mark Available'}
      </button>
      <div className="flex gap-1">
        <button 
          onClick={onEdit}
          className="p-3 bg-white border border-stone-100 rounded-xl text-stone-400 hover:text-stone-900 hover:shadow-md transition-all"
        >
          <Edit size={14} />
        </button>
        <button 
          onClick={onDelete}
          className="p-3 bg-white border border-stone-100 rounded-xl text-stone-400 hover:text-rose-600 hover:shadow-md transition-all"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  </div>
);

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [cafes, setCafes] = useState<any[]>([]);
  const [selectedCafe, setSelectedCafe] = useState<string>('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Items');
  const [showAddSidebar, setShowAddSidebar] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    description: '',
    imageUrl: '',
    isAvailable: true,
    isVeg: true,
    isPopular: false,
    prepTimeMinutes: '10',
    calories: '',
    stockQuantity: '999',
    tags: '',
    caffeine: '',
  });

  useEffect(() => {
    const role = document.cookie.split('; ').find(row => row.startsWith('admin_role='))?.split('=')[1];
    setUserRole(role || null);
    loadCafes();
  }, []);

  useEffect(() => {
    if (selectedCafe) {
      loadMenuItems(selectedCafe);
    } else {
      setMenuItems([]);
      setLoading(false);
    }
  }, [selectedCafe]);

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

  async function loadMenuItems(cafeId: string) {
    setLoading(true);
    try {
      const res = await api.menu.list({ cafeId });
      if (res.success) {
        setMenuItems(res.data);
      }
    } catch (error) {
      console.error('Failed to load menu items:', error);
    } finally {
      setLoading(false);
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      price: '',
      description: '',
      imageUrl: '',
      isAvailable: true,
      isVeg: true,
      isPopular: false,
      prepTimeMinutes: '10',
      calories: '',
      stockQuantity: '999',
      tags: '',
      caffeine: '',
    });
    setEditingItem(null);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    
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
      name: item.name || '',
      category: item.category || '',
      price: String((item.price / 100).toFixed(2)),
      description: item.description || '',
      imageUrl: item.imageUrl || item.image_url || '',
      isAvailable: item.isAvailable !== false,
      isVeg: item.isVeg !== false,
      isPopular: item.isPopular === true,
      prepTimeMinutes: String(item.prepTimeMinutes || item.prep_time_minutes || 10),
      calories: String(item.calories || ''),
      stockQuantity: String(item.stockQuantity !== undefined ? item.stockQuantity : (item.stock_quantity !== undefined ? item.stock_quantity : 999)),
      tags: safeParseStringList(item.tags, ', '),
      caffeine: String(item.caffeine || ''),
    });
    setShowAddSidebar(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) return;
    try {
      const res = await api.menu.delete(id);
      if (res.success) {
        loadMenuItems(selectedCafe);
      }
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        cafeId: selectedCafe,
        price: Math.round(parseFloat(formData.price) * 100), // Convert to subunits
      };

      let res;
      if (editingItem) {
        res = await api.menu.update(editingItem.id, payload);
      } else {
        res = await api.menu.create(payload);
      }
      
      if (res.success) {
        setShowAddSidebar(false);
        resetForm();
        loadMenuItems(selectedCafe);
      }
    } catch (error: any) {
      console.error('Failed to save menu item:', error);
      alert(error.message || 'An error occurred while saving the item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await api.menu.toggleStatus(id, !currentStatus);
      loadMenuItems(selectedCafe);
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All Items' || item.category?.toLowerCase() === categoryFilter.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const categories = ['All Items', ...Array.from(new Set(menuItems.map(item => item.category).filter(Boolean)))];

  return (
    <Layout>
      {/* Header Section */}
      <div className="flex justify-between items-end mb-12">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-stone-900 mb-2 font-headline italic">Culinary Collection</h2>
          <p className="text-stone-400 font-bold text-sm tracking-wide">Curate your collection of artisanal offerings and seasonal specialties.</p>
        </div>
        <div className="flex gap-4">
          <div className="relative group">
            <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-stone-900 transition-colors" />
            <select
              value={selectedCafe}
              onChange={(e) => setSelectedCafe(e.target.value)}
              disabled={userRole === 'CAFE_OWNER'}
              className={`pl-12 pr-10 py-4 bg-white border border-stone-100 rounded-[1.5rem] text-sm focus:ring-4 ring-stone-900/5 transition-all outline-none font-black italic shadow-sm appearance-none ${userRole === 'CAFE_OWNER' ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
            >
              {cafes.map((cafe) => (
                <option key={cafe.id} value={cafe.id}>{cafe.name}</option>
              ))}
              {cafes.length === 0 && <option value="">No Cafes Available</option>}
            </select>
          </div>
          <button 
            onClick={() => setShowAddSidebar(true)}
            className="bg-stone-900 text-white px-8 py-4 rounded-[1.5rem] font-black text-sm shadow-2xl shadow-stone-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3 italic font-headline"
          >
            <Plus size={20} /> Add New Offering
          </button>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-8 mb-10">
        <div className="flex gap-2 p-1.5 bg-stone-100 rounded-[1.5rem] border border-stone-200/50 shadow-inner">
          {categories.slice(0, 6).map((category, i) => (
            <button 
              key={category} 
              onClick={() => setCategoryFilter(category)}
              className={`px-6 py-2.5 rounded-2xl text-[10px] font-black tracking-[0.1em] transition-all uppercase ${categoryFilter === category ? 'bg-white shadow-md text-stone-900 scale-105' : 'text-stone-400 hover:text-stone-600'}`}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-stone-900 transition-colors" />
            <input 
              type="text" 
              placeholder="Search offerings..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-14 pr-6 py-4 bg-white border border-stone-100 rounded-[1.5rem] text-sm focus:ring-4 ring-stone-900/5 w-80 transition-all outline-none font-bold placeholder:text-stone-300 shadow-sm"
            />
          </div>
          <button className="p-4 bg-white border border-stone-100 rounded-[1.5rem] text-stone-400 hover:text-stone-900 hover:shadow-lg transition-all shadow-sm">
            <Filter size={20} />
          </button>
        </div>
      </div>

      {/* Menu Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-96 mb-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-900"></div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-24 bg-stone-50 rounded-[3rem] border border-dashed border-stone-200 mb-12">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
             <Utensils size={32} className="text-stone-200" />
          </div>
          <h4 className="text-xl font-black text-stone-900 italic font-headline mb-2">The Pantry is Empty</h4>
          <p className="text-stone-400 font-bold max-w-xs mx-auto text-sm">Create your first menu item to start building your culinary experience.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-8 mb-12">
          {filteredItems.map((item) => (
            <MenuItem
              key={item.id}
              name={item.name}
              category={item.category || 'Bespoke'}
              price={(item.price / 100).toFixed(2)}
              status={item.isAvailable}
              image={item.imageUrl}
              onToggleStatus={() => handleToggleStatus(item.id, item.isAvailable)}
              onEdit={() => handleEdit(item)}
              onDelete={() => handleDelete(item.id)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Menu Item Sidebar */}
      <Sidebar
        isOpen={showAddSidebar}
        onClose={() => { resetForm(); setShowAddSidebar(false); }}
        title={editingItem ? "Update Offering" : "Add New Offering"}
      >
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-6">
            <div className="group">
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Item Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-900 italic"
                placeholder="e.g. Artisanal Espresso..."
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="group">
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Category</label>
                <div className="relative">
                  <Tag className="absolute left-5 top-5 text-stone-300 group-focus-within:text-stone-900" size={18} />
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full pl-14 pr-12 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-800 appearance-none cursor-pointer"
                  >
                    <option value="">Select a Category</option>
                    <option value="drinks">Drinks</option>
                    <option value="food">Food</option>
                    <option value="desserts">Desserts</option>
                  </select>
                  <ChevronDown className="absolute right-5 top-5 text-stone-300 pointer-events-none" size={18} />
                </div>
              </div>
              <div className="group">
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Price (₹)</label>
                <div className="relative">
                  <IndianRupee className="absolute left-5 top-5 text-stone-300 group-focus-within:text-stone-900" size={18} />
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full pl-14 pr-6 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-800"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="group">
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3">Prep Time (m)</label>
                <input
                  type="number"
                  required
                  value={formData.prepTimeMinutes}
                  onChange={(e) => setFormData({ ...formData, prepTimeMinutes: e.target.value })}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl focus:ring-2 focus:ring-stone-900/10 focus:bg-white outline-none transition-all font-bold text-stone-800"
                  placeholder="10"
                />
              </div>
              <div className="group">
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3">Calories</label>
                <input
                  type="number"
                  value={formData.calories}
                  onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl focus:ring-2 focus:ring-stone-900/10 focus:bg-white outline-none transition-all font-bold text-stone-800"
                  placeholder="120"
                />
              </div>
              <div className="group">
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3">Stock Qty</label>
                <input
                  type="number"
                  required
                  value={formData.stockQuantity}
                  onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl focus:ring-2 focus:ring-stone-900/10 focus:bg-white outline-none transition-all font-bold text-stone-800"
                  placeholder="999"
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Tags & Flags</label>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 p-3 bg-stone-50 rounded-xl border border-stone-100 cursor-pointer hover:bg-stone-100 transition-all">
                  <input
                    type="checkbox"
                    checked={formData.isVeg}
                    onChange={(e) => setFormData({ ...formData, isVeg: e.target.checked })}
                    className="accent-stone-900"
                  />
                  <span className="text-xs font-bold text-stone-700">Vegetarian</span>
                </label>
                <label className="flex items-center gap-2 p-3 bg-stone-50 rounded-xl border border-stone-100 cursor-pointer hover:bg-stone-100 transition-all">
                  <input
                    type="checkbox"
                    checked={formData.isPopular}
                    onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                    className="accent-stone-900"
                  />
                  <span className="text-xs font-bold text-stone-700">Popular Item</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="group">
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Item Tags / Descriptors</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-800"
                  placeholder="e.g. Rich, Chocolatey, Iced"
                />
              </div>
              <div className="group">
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Caffeine Content (mg)</label>
                <input
                  type="number"
                  value={formData.caffeine}
                  onChange={(e) => setFormData({ ...formData, caffeine: e.target.value })}
                  className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-800"
                  placeholder="e.g. 150"
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Gastronomic Details</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-6 py-5 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:ring-4 focus:ring-stone-900/5 focus:bg-white focus:border-stone-900 outline-none transition-all font-bold text-stone-800 min-h-[120px] resize-none"
                placeholder="Describe the flavors, ingredients, and soul of this dish..."
              />
            </div>

            <div className="group">
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 group-focus-within:text-stone-900 transition-colors">Visual Representation</label>
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
              {isSubmitting ? 'Processing...' : (editingItem ? 'Update Offering' : 'Launch Offering')}
            </button>
          </div>
        </form>
      </Sidebar>
    </Layout>
  );
}
