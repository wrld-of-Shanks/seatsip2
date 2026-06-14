import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { api } from '@/services/api';
import { Sidebar } from '@/components/ui/Sidebar';
import { Plus, Search, Edit, Trash2, Compass, Tag, ImageIcon, Sparkles } from 'lucide-react';

export default function ExploreCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddSidebar, setShowAddSidebar] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    tag: '',
    tagColor: '#2D6A4F',
    tagBg: 'rgba(45,106,79,0.2)',
    imageUrl: '',
    sortOrder: '0',
  });

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      setLoading(true);
      const res = await api.exploreCategories.list();
      if (res.success) {
        setCategories(res.data);
      }
    } catch (error) {
      console.error('Failed to load explore categories:', error);
    } finally {
      setLoading(false);
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      tag: '',
      tagColor: '#2D6A4F',
      tagBg: 'rgba(45,106,79,0.2)',
      imageUrl: '',
      sortOrder: '0',
    });
    setEditingCategory(null);
  };

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || '',
      slug: category.slug || '',
      description: category.description || '',
      tag: category.tag || '',
      tagColor: category.tagColor || '#2D6A4F',
      tagBg: category.tagBg || 'rgba(45,106,79,0.2)',
      imageUrl: category.imageUrl || '',
      sortOrder: String(category.sortOrder || 0),
    });
    setShowAddSidebar(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this category? Any items tagged with this category will remain, but the explore grouping will be deleted.')) return;
    try {
      const res = await api.exploreCategories.delete(id);
      if (res.success) {
        loadCategories();
      }
    } catch (error) {
      console.error('Failed to delete explore category:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        sortOrder: parseInt(formData.sortOrder, 10),
      };

      let res;
      if (editingCategory) {
        res = await api.exploreCategories.update(editingCategory.id, payload);
      } else {
        res = await api.exploreCategories.create(payload);
      }

      if (res.success) {
        setShowAddSidebar(false);
        resetForm();
        loadCategories();
      }
    } catch (error: any) {
      console.error('Failed to save explore category:', error);
      alert(error.message || 'An error occurred while saving the category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCategories = categories.filter(cat =>
    cat.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.slug?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      {/* Header */}
      <div className="flex justify-between items-end mb-12">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-stone-900 mb-2 font-headline italic">Explore Catalog Categories</h2>
          <p className="text-stone-400 font-bold text-sm tracking-wide">Manage designated categories for the mobile Explore tab.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowAddSidebar(true); }}
          className="bg-stone-900 text-white px-8 py-4 rounded-[1.5rem] font-black text-sm shadow-2xl shadow-stone-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3 italic font-headline"
        >
          <Plus size={20} /> Add New Category
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4 mb-10">
        <div className="relative group flex-1 max-w-md">
          <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-stone-900 transition-colors" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-white border border-stone-100 rounded-[1.5rem] text-sm focus:ring-4 ring-stone-900/5 transition-all outline-none font-bold placeholder:text-stone-300 shadow-sm"
          />
        </div>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-900"></div>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="text-center py-24 bg-stone-50 rounded-[3rem] border border-dashed border-stone-200">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Compass size={32} className="text-stone-200" />
          </div>
          <h4 className="text-xl font-black text-stone-900 italic font-headline mb-2">No Explore Categories Found</h4>
          <p className="text-stone-400 font-bold max-w-xs mx-auto text-sm">Add explore categories to display curated themes on the mobile Explore page.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCategories.map((cat) => (
            <div key={cat.id} className="bg-white rounded-[2rem] p-6 border border-stone-100 shadow-md flex flex-col justify-between group relative overflow-hidden">
              {/* Image Preview Container */}
              <div className="relative h-44 rounded-2xl overflow-hidden mb-6 bg-stone-100 flex items-end">
                {cat.imageUrl ? (
                  <img src={cat.imageUrl} alt={cat.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-stone-200 bg-stone-50">
                    <ImageIcon size={48} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                
                {/* Category Metadata overlay */}
                <div className="p-5 z-10 flex flex-col items-start w-full text-left">
                  {cat.tag && (
                    <span
                      className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider mb-2"
                      style={{ backgroundColor: cat.tagBg || 'rgba(45,106,79,0.2)', color: cat.tagColor || '#FFFFFF' }}
                    >
                      {cat.tag}
                    </span>
                  )}
                  <h3 className="text-lg font-bold text-white leading-tight">{cat.name}</h3>
                </div>
              </div>

              {/* Description & Admin Controls */}
              <div className="flex-1 flex flex-col justify-between">
                <div className="mb-4">
                  <p className="text-stone-400 text-xs font-semibold uppercase tracking-wider">Slug: {cat.slug}</p>
                  <p className="text-stone-600 text-xs mt-2 line-clamp-2">{cat.description || 'No description provided.'}</p>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-stone-100">
                  <span className="text-xs text-stone-400 font-bold">Display Order: {cat.sortOrder}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(cat)}
                      className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-xl transition-all border border-transparent hover:border-stone-100 hover:shadow-sm"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="p-2 text-stone-400 hover:text-rose-600 hover:bg-stone-50 rounded-xl transition-all border border-transparent hover:border-stone-100 hover:shadow-sm"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Sidebar */}
      <Sidebar
        isOpen={showAddSidebar}
        onClose={() => { resetForm(); setShowAddSidebar(false); }}
        title={editingCategory ? "Update Explore Category" : "Add Explore Category"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-2">Category Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl font-bold text-stone-800 outline-none focus:bg-white focus:border-stone-900 focus:ring-4 focus:ring-stone-900/5 transition-all"
                placeholder="Matcha Moments"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-2">Custom Slug (Optional)</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl font-bold text-stone-800 outline-none focus:bg-white focus:border-stone-900 focus:ring-4 focus:ring-stone-900/5 transition-all"
                placeholder="matcha-moments"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl font-bold text-stone-800 outline-none focus:bg-white focus:border-stone-900 focus:ring-4 focus:ring-stone-900/5 transition-all min-h-[100px] resize-none"
                placeholder="Earthy matcha creations..."
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-2">Tag / Pill Label (Optional)</label>
              <input
                type="text"
                value={formData.tag}
                onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl font-bold text-stone-800 outline-none focus:bg-white focus:border-stone-900 focus:ring-4 focus:ring-stone-900/5 transition-all"
                placeholder="Premium"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-2">Tag Text Color</label>
                <input
                  type="text"
                  value={formData.tagColor}
                  onChange={(e) => setFormData({ ...formData, tagColor: e.target.value })}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl font-bold text-stone-800 outline-none"
                  placeholder="#2D6A4F"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-2">Tag Background</label>
                <input
                  type="text"
                  value={formData.tagBg}
                  onChange={(e) => setFormData({ ...formData, tagBg: e.target.value })}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl font-bold text-stone-800 outline-none"
                  placeholder="rgba(45,106,79,0.2)"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-2">Category Image URL</label>
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl font-bold text-stone-800 outline-none focus:bg-white focus:border-stone-900 focus:ring-4 focus:ring-stone-900/5 transition-all"
                placeholder="https://images.unsplash.com/..."
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-2">Display Order</label>
              <input
                type="number"
                required
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                className="w-full rounded-xl border border-stone-100 bg-stone-50 px-4 py-3 font-bold text-stone-800 outline-none focus:bg-white focus:border-stone-900 transition-all"
                placeholder="0"
              />
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
              {isSubmitting ? 'Processing...' : (editingCategory ? 'Update Category' : 'Create Category')}
            </button>
          </div>
        </form>
      </Sidebar>
    </Layout>
  );
}
