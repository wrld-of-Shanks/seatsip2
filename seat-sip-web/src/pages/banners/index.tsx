'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { api } from '@/services/api';
import { Sidebar } from '@/components/ui/Sidebar';
import { Plus, Edit, Trash2, Megaphone, Building2, ChevronDown, ImageIcon, User, Clock, Compass } from 'lucide-react';

export default function BannersPage() {
  const [banners, setBanners] = useState<any[]>([]);
  const [cafes, setCafes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSidebar, setShowAddSidebar] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [exploreCategories, setExploreCategories] = useState<any[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    sliderType: 'PROMO',
    tag: '',
    tagIcon: '⚡',
    tagColor: '#FFFFFF',
    tagBg: 'rgba(255,107,0,0.2)',
    title: '',
    titleAccent: '',
    subtitle: '',
    subtitleColor: '#FFBB88',
    ctaText: 'Explore now',
    ctaBg: '#FFFFFF',
    ctaTextColor: '#000000',
    bgColor: '#3D2010',
    overlayColor: 'rgba(30,14,4,0.5)',
    stripeColor: 'rgba(255,107,0,0.1)',
    emoji: '☕',
    emojiLabel: 'FRESH BREW',
    emojiLabelColor: '#FFFFFF',
    badge: '',
    bgImage: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=800&auto=format&fit=crop',
    clickAction: 'none',
    linkUrl: '',
    buttonText: 'View',
    cafeId: '',
    exploreCategory: '',
    isActive: true,
    sortOrder: '0',
  });

  useEffect(() => {
    const role = document.cookie.split('; ').find(row => row.startsWith('admin_role='))?.split('=')[1] || null;
    setUserRole(role);
    loadBanners();
    loadCafes(role);
    loadExploreCategories();
  }, []);

  async function loadExploreCategories() {
    try {
      const res = await api.exploreCategories.list();
      if (res.success) {
        setExploreCategories(res.data);
      }
    } catch (err) {
      console.error('Failed to load explore categories:', err);
    }
  }

  async function loadBanners() {
    try {
      setLoading(true);
      const res = await api.banners.adminList();
      if (res.success) {
        setBanners(res.data);
      }
    } catch (error) {
      console.error('Failed to load banners:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadCafes(role?: string | null) {
    try {
      const res = await api.cafes.list();
      if (res.success) {
        setCafes(res.data);
        const activeRole = role !== undefined ? role : userRole;
        if (activeRole === 'CAFE_OWNER' && res.data.length > 0) {
          setFormData(prev => ({
            ...prev,
            cafeId: res.data[0].id
          }));
        }
      }
    } catch (error) {
      console.error('Failed to load cafes:', error);
    }
  }

  const resetForm = () => {
    setFormData({
      sliderType: 'PROMO',
      tag: '',
      tagIcon: '⚡',
      tagColor: '#FFFFFF',
      tagBg: 'rgba(255,107,0,0.2)',
      title: '',
      titleAccent: '',
      subtitle: '',
      subtitleColor: '#FFBB88',
      ctaText: 'Explore now',
      ctaBg: '#FFFFFF',
      ctaTextColor: '#000000',
      bgColor: '#3D2010',
      overlayColor: 'rgba(30,14,4,0.5)',
      stripeColor: 'rgba(255,107,0,0.1)',
      emoji: '☕',
      emojiLabel: 'FRESH BREW',
      emojiLabelColor: '#FFFFFF',
      badge: '',
      bgImage: '',
      clickAction: 'none',
      linkUrl: '',
      buttonText: 'View',
      cafeId: userRole === 'CAFE_OWNER' && cafes.length > 0 ? cafes[0].id : '',
      exploreCategory: '',
      isActive: true,
      sortOrder: '0',
    });
    setEditingBanner(null);
  };

  const openCreateBanner = (sliderType: 'PROMO' | 'FOOD_PROMO') => {
    resetForm();
    setFormData(prev => ({
      ...prev,
      sliderType,
      tagIcon: sliderType === 'FOOD_PROMO' ? '❤️' : '⚡',
      title: '',
      subtitle: '',
      ctaText: sliderType === 'FOOD_PROMO' ? 'Explore desserts' : 'Explore now',
      buttonText: sliderType === 'FOOD_PROMO' ? 'Explore desserts' : 'View',
    }));
    setShowAddSidebar(true);
  };

  const handleEdit = (banner: any) => {
    setEditingBanner(banner);
    setFormData({
      sliderType: banner.sliderType || 'PROMO',
      tag: banner.tag || '',
      tagIcon: banner.tagIcon || '⚡',
      tagColor: banner.tagColor || '#FFFFFF',
      tagBg: banner.tagBg || 'rgba(255,107,0,0.2)',
      title: banner.title || '',
      titleAccent: banner.titleAccent || '',
      subtitle: banner.subtitle || '',
      subtitleColor: banner.subtitleColor || '#FFBB88',
      ctaText: banner.ctaText || 'Explore now',
      ctaBg: banner.ctaBg || '#FFFFFF',
      ctaTextColor: banner.ctaTextColor || banner.ctaText2 || '#000000',
      bgColor: banner.bgColor || banner.bg || '#3D2010',
      overlayColor: banner.overlayColor || 'rgba(30,14,4,0.5)',
      stripeColor: banner.stripeColor || 'rgba(255,107,0,0.1)',
      emoji: banner.emoji || '☕',
      emojiLabel: banner.emojiLabel || 'FRESH BREW',
      emojiLabelColor: banner.emojiLabelColor || '#FFFFFF',
      badge: banner.badge || '',
      bgImage: banner.bgImage || '',
      clickAction: banner.clickAction || 'none',
      linkUrl: banner.linkUrl || '',
      buttonText: banner.buttonText || banner.ctaText || 'View',
      cafeId: banner.cafeId || '',
      exploreCategory: banner.exploreCategory || banner.explore_category || '',
      isActive: banner.isActive !== false,
      sortOrder: String(banner.sortOrder || 0),
    });
    setShowAddSidebar(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this banner?')) return;
    try {
      const res = await api.banners.delete(id);
      if (res.success) {
        loadBanners();
      }
    } catch (error) {
      console.error('Failed to delete banner:', error);
    }
  };

  const handleBannerImage = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Banner image must be 2MB or smaller.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({
        ...prev,
        bgImage: String(reader.result || ''),
        title: prev.title || file.name.replace(/\.[^.]+$/, ''),
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.bgImage) {
      alert('Please upload a banner image.');
      return;
    }
    if (userRole === 'CAFE_OWNER' && !formData.cafeId) {
      alert('Please select a cafe for this promotion.');
      return;
    }
    setIsSubmitting(true);
    try {
      let res;
      if (editingBanner) {
        res = await api.banners.update(editingBanner.id, formData);
      } else {
        res = await api.banners.create(formData);
      }

      if (res.success) {
        setShowAddSidebar(false);
        resetForm();
        loadBanners();
      }
    } catch (error: any) {
      console.error('Failed to save banner:', error);
      alert(error.message || 'An error occurred while saving the banner');
    } finally {
      setIsSubmitting(false);
    }
  };

  const topBanners = banners.filter(b => b.sliderType === 'PROMO');
  const bottomBanners = banners.filter(b => b.sliderType === 'FOOD_PROMO');

  const bannerPlacementLabel = (sliderType: string) => (
    sliderType === 'FOOD_PROMO' ? 'Bottom Banner' : 'Top Banner'
  );

  const renderBannerGrid = (items: any[]) => (
    items.length === 0 ? (
      <div className="text-center py-16 bg-white rounded-[2rem] border border-stone-100 shadow-sm">
        <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-stone-100 shadow-inner">
          <Megaphone size={28} className="text-stone-200" />
        </div>
        <h4 className="text-lg font-black text-stone-900 italic font-headline mb-1">No Banners Configured</h4>
        <p className="text-stone-400 text-sm font-bold">Add a banner for this section.</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {items.map((banner) => (
          <div key={banner.id} className="bg-white rounded-[2rem] p-6 border border-stone-100 shadow-md flex flex-col justify-between group">
            {/* Dynamic Live Banner Simulation Container */}
            <div 
              className="relative h-44 rounded-2xl overflow-hidden mb-6 flex flex-row items-end select-none shadow-sm"
              style={{ backgroundColor: banner.bgColor || banner.bg }}
            >
              {banner.bgImage && (
                <>
                  <img src={banner.bgImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                  <div 
                    className="absolute inset-0" 
                    style={{ backgroundColor: banner.overlayColor || 'rgba(0,0,0,0.4)' }}
                  />
                </>
              )}

              {/* Simulated Stripe for Bottom Banner */}
              {banner.sliderType === 'FOOD_PROMO' && banner.stripeColor && (
                <div 
                  className="absolute -top-10 -right-8 w-32 h-64 rounded-full opacity-50"
                  style={{ backgroundColor: banner.stripeColor }}
                />
              )}

              {/* Left content simulation */}
              <div className="flex-1 p-5 z-10 flex flex-col justify-between h-full items-start text-left">
                {banner.sliderType === 'FOOD_PROMO' ? (
                  <div 
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider"
                    style={{ backgroundColor: banner.tagBg || 'rgba(255,107,0,0.2)' }}
                  >
                    <span className="text-[9px]">{banner.tagIcon || '⚡'}</span>
                    <span style={{ color: banner.tagColor }}>{banner.tag}</span>
                  </div>
                ) : banner.badge ? (
                  <div 
                    className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider"
                    style={{ backgroundColor: banner.tagColor || '#FFFFFF', color: banner.ctaTextColor || '#000000' }}
                  >
                    {banner.badge}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5" style={{ backgroundColor: banner.tagColor }} />
                    <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: banner.tagColor }}>{banner.tag}</span>
                  </div>
                )}

                <div className="mt-2">
                  <h3 className="text-lg font-bold text-white leading-tight whitespace-pre-line">{banner.title}</h3>
                  {banner.sliderType === 'PROMO' && banner.titleAccent && (
                    <p className="text-xs font-semibold mt-0.5" style={{ color: banner.tagColor }}>{banner.titleAccent}</p>
                  )}
                  <p className="text-[10px] mt-1 line-clamp-1" style={{ color: banner.sliderType === 'FOOD_PROMO' ? (banner.subtitleColor || '#FFFFFF') : (banner.tagColor || '#FFFFFF') }}>{banner.subtitle}</p>
                </div>

                <div 
                  className="mt-3 px-4 py-2 rounded-full text-[10px] font-bold"
                  style={{ backgroundColor: banner.ctaBg || '#FFFFFF', color: banner.ctaTextColor || '#000000' }}
                >
                  {banner.ctaText}
                </div>
              </div>

              {/* Right side emoji simulation */}
              <div className="w-24 z-10 flex flex-col items-center justify-center h-full pr-4 text-center">
                <span className="text-4xl">{banner.emoji || '☕'}</span>
                {banner.emojiLabel && (
                  <span 
                    className="text-[8px] font-black mt-1 tracking-widest uppercase text-center"
                    style={{ color: banner.emojiLabelColor || '#FFFFFF' }}
                  >
                    {banner.emojiLabel}
                  </span>
                )}
              </div>
            </div>

            {/* Info & Admin Controls */}
            <div className="flex justify-between items-center pt-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-stone-800 italic font-headline">{(banner.title || 'Banner image').replace('\n', ' ')}</span>
                  <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${banner.sliderType === 'PROMO' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-pink-50 text-pink-700 border border-pink-100'}`}>
                    {bannerPlacementLabel(banner.sliderType)}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  {banner.cafeName && (
                    <span className="text-xs text-stone-500 font-medium flex items-center gap-1">
                      <Building2 size={12} /> {banner.cafeName}
                    </span>
                  )}
                  <span className="text-xs text-stone-400 font-bold">Sort: {banner.sortOrder}</span>
                  <span className={`text-[10px] font-bold ${banner.isActive ? 'text-emerald-600' : 'text-stone-400'}`}>
                    {banner.isActive ? '● Active' : '○ Disabled'}
                  </span>
                </div>
              </div>

              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleEdit(banner)}
                  className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-xl transition-all border border-transparent hover:border-stone-100 hover:shadow-sm"
                >
                  <Edit size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(banner.id)}
                  className="p-2 text-stone-400 hover:text-rose-600 hover:bg-stone-50 rounded-xl transition-all border border-transparent hover:border-stone-100 hover:shadow-sm"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  );

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 mb-2 font-headline italic">Promotional Banners</h1>
          <p className="text-stone-600 font-medium">Manage home-screen promotional banners and campaign cards.</p>
        </div>
        <button
          onClick={() => openCreateBanner('PROMO')}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-stone-900 to-stone-800 text-white rounded-xl font-bold hover:shadow-xl transition-all shadow-lg active:scale-95"
        >
          <Plus size={20} />
          Create Banner
        </button>
      </div>

      {/* Banner Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-900"></div>
        </div>
      ) : (
        <div className="space-y-10">
          <section>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-stone-900 font-headline italic">Top Banner</h2>
                <p className="text-sm font-semibold text-stone-500">Controls the upper home-screen promo banner.</p>
              </div>
              <button
                onClick={() => openCreateBanner('PROMO')}
                className="shrink-0 rounded-xl bg-stone-900 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-stone-800"
              >
                Add Top
              </button>
            </div>
            {renderBannerGrid(topBanners)}
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-stone-900 font-headline italic">Bottom Banner</h2>
                <p className="text-sm font-semibold text-stone-500">Controls the full bottom food promo banner.</p>
              </div>
              <button
                onClick={() => openCreateBanner('FOOD_PROMO')}
                className="shrink-0 rounded-xl bg-stone-900 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-stone-800"
              >
                Add Bottom
              </button>
            </div>
            {renderBannerGrid(bottomBanners)}
          </section>
        </div>
      )}

      {/* Add/Edit Sidebar */}
      <Sidebar
        isOpen={showAddSidebar}
        onClose={() => { resetForm(); setShowAddSidebar(false); }}
        title={editingBanner ? "Update Banner" : "Add New Banner"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-2">Banner Section</label>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-stone-100 p-1">
                {[
                  { label: 'Top Banner', value: 'PROMO' },
                  { label: 'Bottom Banner', value: 'FOOD_PROMO' },
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, sliderType: option.value })}
                    className={`rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wider transition ${formData.sliderType === option.value ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-2">Banner Image</label>
              <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50 p-5 text-center transition hover:bg-stone-100">
                {formData.bgImage ? (
                  <div className="relative h-40 w-full overflow-hidden rounded-xl">
                    <img src={formData.bgImage} alt="Banner preview" className="h-full w-full object-cover" />
                    {formData.clickAction === 'button' && (
                      <span className="absolute bottom-4 left-4 rounded-full bg-white px-4 py-2 text-xs font-black text-stone-900 shadow-lg">
                        {formData.buttonText || 'View'}
                      </span>
                    )}
                  </div>
                ) : (
                  <>
                    <ImageIcon className="mb-3 h-8 w-8 text-stone-300" />
                    <span className="text-sm font-black text-stone-700">Upload banner image</span>
                    <span className="mt-1 text-xs font-semibold text-stone-400">JPG, PNG, or WEBP. Max 2MB.</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => handleBannerImage(e.target.files?.[0])}
                />
              </label>
            </div>

            <div>
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-2">Click Option</label>
              <select
                value={formData.clickAction}
                onChange={(e) => setFormData({ ...formData, clickAction: e.target.value })}
                className="w-full rounded-xl border border-stone-100 bg-stone-50 px-4 py-3 font-bold text-stone-800 outline-none"
              >
                <option value="none">No click action</option>
                <option value="banner">Make full banner clickable</option>
                <option value="button">Show a button on banner</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-2">Explore Category (Optional)</label>
              <div className="relative">
                <Compass className="absolute left-4 top-4 text-stone-300 pointer-events-none" size={16} />
                <select
                  value={formData.exploreCategory}
                  onChange={(e) => setFormData({ ...formData, exploreCategory: e.target.value })}
                  className="w-full rounded-xl border border-stone-100 bg-stone-50 pl-10 pr-4 py-3 font-bold text-stone-800 outline-none appearance-none cursor-pointer"
                >
                  <option value="">None (Not in Explore Screen)</option>
                  {exploreCategories.map(cat => (
                    <option key={cat.id} value={cat.slug}>{cat.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-4 text-stone-300 pointer-events-none" size={16} />
              </div>
            </div>

            {formData.clickAction !== 'none' && (
              <div className="space-y-4 rounded-2xl border border-stone-100 bg-stone-50 p-4">
                {formData.clickAction === 'button' && (
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-2">Button Text</label>
                    <input
                      type="text"
                      value={formData.buttonText}
                      onChange={(e) => setFormData({ ...formData, buttonText: e.target.value, ctaText: e.target.value })}
                      className="w-full rounded-xl border border-stone-100 bg-white px-4 py-3 font-bold text-stone-800 outline-none"
                      placeholder="View"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-2">Target URL</label>
                  <input
                    type="url"
                    required
                    value={formData.linkUrl}
                    onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                    className="w-full rounded-xl border border-stone-100 bg-white px-4 py-3 font-bold text-stone-800 outline-none"
                    placeholder="https://example.com"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-2">Display Order</label>
                <input
                  type="number"
                  required
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                  className="w-full rounded-xl border border-stone-100 bg-stone-50 px-4 py-3 font-bold text-stone-800 outline-none"
                  placeholder="0"
                />
              </div>
              <div className="flex items-end">
                <label className="flex h-[46px] w-full cursor-pointer items-center gap-2 rounded-xl border border-stone-100 bg-stone-50 p-3 transition hover:bg-stone-100">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="accent-stone-900"
                  />
                  <span className="text-xs font-bold text-stone-700">Active</span>
                </label>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-stone-100 flex gap-4">
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
              {isSubmitting ? 'Processing...' : (editingBanner ? 'Update Banner' : 'Create Banner')}
            </button>
          </div>
        </form>
      </Sidebar>
    </Layout>
  );
}
