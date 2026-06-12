'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { api } from '@/services/api';
import { Sidebar } from '@/components/ui/Sidebar';
import { getCookieRole, getLocalStorageUser } from '@/utils/auth';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Gift, 
  Building2, 
  ChevronDown, 
  Sparkles, 
  BookOpen, 
  Layers, 
  Coins, 
  Package, 
  Search, 
  Filter, 
  Calendar, 
  User as UserIcon,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const TIER_BADGES: Record<string, { bg: string, text: string, name: string }> = {
  BRONZE: { bg: 'bg-orange-50', text: 'text-orange-700', name: 'Bronze' },
  SILVER: { bg: 'bg-[#3F1D0E]/10', text: 'text-[#3F1D0E]', name: 'Coffee (Silver)' },
  GOLD: { bg: 'bg-[#A2663C]/10', text: 'text-[#A2663C]', name: 'Caramel (Gold)' },
  PLATINUM: { bg: 'bg-[#E4CDB0] text-[#3F1D0E]', text: 'text-[#8C5D3A]', name: 'Cream (Platinum)' },
};

const CATEGORIES = ['Food & Drink', 'Experience', 'Merch'];
const EMOJI_SUGGESTIONS = ['☕', '🍰', '🍪', '🍔', '🥪', '🥤', '🎟️', '🎁', '📓', '🛋️', '⭐', '🛍️'];

export default function RewardsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'redemptions'>('all');
  const [rewards, setRewards] = useState<any[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [cafes, setCafes] = useState<any[]>([]);
  
  const [loadingRewards, setLoadingRewards] = useState(true);
  const [loadingRedemptions, setLoadingRedemptions] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentCafeId, setCurrentCafeId] = useState<string>('');
  
  // Search and Filters
  const [rewardSearch, setRewardSearch] = useState('');
  const [rewardCategoryFilter, setRewardCategoryFilter] = useState('All');
  const [rewardStatusFilter, setRewardStatusFilter] = useState('All');
  const [redemptionSearch, setRedemptionSearch] = useState('');
  
  // Sidebar State
  const [showAddSidebar, setShowAddSidebar] = useState(false);
  const [editingReward, setEditingReward] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    icon: '🎁',
    category: 'Food & Drink',
    description: '',
    terms: '',
    pointsCost: '100',
    tierRequired: 'SILVER',
    stock: '-1',
    isActive: true,
    cafeId: '',
  });

  useEffect(() => {
    if (router.query.tab === 'redemptions') {
      setActiveTab('redemptions');
    }
  }, [router.query.tab]);

  useEffect(() => {
    const role = getCookieRole();
    setUserRole(role || null);
    
    const user = getLocalStorageUser();
    setCurrentCafeId(user?.cafeId || '');

    loadRewards();
    loadCafes();
  }, []);

  useEffect(() => {
    if (activeTab === 'redemptions') {
      loadRedemptions();
    }
  }, [activeTab]);

  async function loadRewards() {
    try {
      setLoadingRewards(true);
      const res = await api.rewards.list();
      if (res.success) {
        setRewards(res.data.map((reward: any) => {
          const stock = reward.stock !== undefined ? reward.stock : -1;
          const isActive = reward.isActive ?? reward.is_active === 1;
          const approvalStatus = reward.status || reward.approvalStatus || (stock === -2 ? 'REJECTED' : isActive ? 'ACTIVE' : 'PENDING_APPROVAL');

          return {
            ...reward,
            pointsCost: reward.pointsCost ?? reward.points_cost,
            tierRequired: reward.tierRequired ?? reward.tier_required,
            totalRedeemed: reward.totalRedeemed ?? reward.total_redeemed,
            isActive,
            status: approvalStatus,
            approvalStatus,
          };
        }));
      }
    } catch (e) {
      console.error('Failed to load rewards:', e);
    } finally {
      setLoadingRewards(false);
    }
  }

  async function loadRedemptions() {
    try {
      setLoadingRedemptions(true);
      const res = await api.rewards.redemptions();
      if (res.success) {
        setRedemptions(res.data);
      }
    } catch (e) {
      console.error('Failed to load redemptions:', e);
    } finally {
      setLoadingRedemptions(false);
    }
  }

  async function loadCafes() {
    try {
      const res = await api.cafes.list();
      if (res.success) {
        setCafes(res.data);
        
        const user = getLocalStorageUser();
        if (user?.role === 'CAFE_OWNER' && user.cafeId) {
          setFormData(prev => ({ ...prev, cafeId: prev.cafeId || user.cafeId || '' }));
        }
      }
    } catch (e) {
      console.error('Failed to load cafes:', e);
    }
  }

  const resetForm = () => {
    const role = getCookieRole();
    const user = getLocalStorageUser();
    setFormData({
      name: '',
      icon: '🎁',
      category: 'Food & Drink',
      description: '',
      terms: '',
      pointsCost: '100',
      tierRequired: 'SILVER',
      stock: '-1',
      isActive: role === 'ADMIN',
      cafeId: role === 'CAFE_OWNER' ? (user?.cafeId || currentCafeId) : '',
    });
    setEditingReward(null);
  };

  const handleEdit = (reward: any) => {
    setEditingReward(reward);
    setFormData({
      name: reward.name || '',
      icon: reward.icon || '🎁',
      category: reward.category || 'Food & Drink',
      description: reward.description || '',
      terms: reward.terms || '',
      pointsCost: String(reward.pointsCost || reward.points_cost || 100),
      tierRequired: reward.tierRequired || reward.tier_required || 'SILVER',
      stock: String(reward.stock !== undefined ? reward.stock : -1),
      isActive: reward.isActive !== false,
      cafeId: reward.cafeId || reward.cafe_id || '',
    });
    setShowAddSidebar(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this reward option? This cannot be undone.')) return;
    try {
      const res = await api.rewards.delete(id);
      if (res.success) {
        loadRewards();
      }
    } catch (e: any) {
      alert(e.message || 'Failed to delete reward.');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.rewards.approve(id);
      loadRewards();
    } catch (e: any) {
      alert(e.message || 'Failed to approve reward.');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.rewards.reject(id);
      loadRewards();
    } catch (e: any) {
      alert(e.message || 'Failed to reject reward.');
    }
  };

  const handleToggleActive = async (reward: any) => {
    try {
      await api.rewards.update(reward.id, { isActive: !reward.isActive });
      loadRewards();
    } catch (e: any) {
      alert(e.message || 'Failed to update reward status.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        pointsCost: parseInt(formData.pointsCost),
        stock: parseInt(formData.stock),
      };
      const ownerPayload = userRole === 'CAFE_OWNER'
        ? {
            ...payload,
            cafeId: currentCafeId,
            isActive: false,
            status: 'PENDING_APPROVAL',
          }
        : payload;

      let res;
      if (editingReward) {
        res = await api.rewards.update(editingReward.id, ownerPayload);
      } else {
        res = await api.rewards.create(ownerPayload);
      }

      if (res.success) {
        setShowAddSidebar(false);
        resetForm();
        loadRewards();
      }
    } catch (err: any) {
      console.error('Failed to save reward:', err);
      alert(err.message || 'An error occurred while saving the reward.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter rewards
  const filteredRewards = rewards.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(rewardSearch.toLowerCase()) || 
                          r.description?.toLowerCase().includes(rewardSearch.toLowerCase());
    const matchesCategory = rewardCategoryFilter === 'All' || r.category === rewardCategoryFilter;
    const matchesStatus = activeTab !== 'all' || rewardStatusFilter === 'All' || r.approvalStatus === rewardStatusFilter;
    const matchesTab = activeTab !== 'pending' || r.approvalStatus === 'PENDING_APPROVAL';
    const matchesOwnerCafe = userRole !== 'CAFE_OWNER' || !currentCafeId || (r.cafeId || r.cafe_id) === currentCafeId;
    return matchesSearch && matchesCategory && matchesStatus && matchesTab && matchesOwnerCafe;
  });

  // Filter redemptions
  const filteredRedemptions = redemptions.filter((r) => {
    const nameStr = r.user?.name || '';
    const emailStr = r.user?.email || '';
    const rewardNameStr = r.reward?.name || '';
    const searchLower = redemptionSearch.toLowerCase();
    
    return nameStr.toLowerCase().includes(searchLower) || 
           emailStr.toLowerCase().includes(searchLower) || 
           rewardNameStr.toLowerCase().includes(searchLower);
  });

  return (
    <Layout>
      {/* Title */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 mb-2 font-headline italic">Rewards</h1>
          <p className="text-stone-600 font-medium">
            {userRole === 'CAFE_OWNER' ? 'Create rewards and track approval status.' : 'Review reward approvals and monitor point redemptions.'}
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowAddSidebar(true); }}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-stone-900 to-stone-800 text-white rounded-xl font-bold hover:shadow-xl transition-all shadow-lg active:scale-95"
        >
          <Plus size={20} />
          Create Reward
        </button>
      </div>

      {/* Tabs Layout */}
      <div className="flex border-b border-stone-200 mb-8 gap-6">
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-4 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'all'
              ? 'border-[#8D6E63] text-[#8D6E63]'
              : 'border-transparent text-stone-400 hover:text-stone-600'
          }`}
        >
          All Rewards ({rewards.length})
        </button>
        {userRole === 'ADMIN' && (
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-4 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'pending'
                ? 'border-[#8D6E63] text-[#8D6E63]'
                : 'border-transparent text-stone-400 hover:text-stone-600'
            }`}
          >
            Pending Approval ({rewards.filter(reward => reward.approvalStatus === 'PENDING_APPROVAL').length})
          </button>
        )}
        <button
          onClick={() => setActiveTab('redemptions')}
          className={`pb-4 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'redemptions' 
              ? 'border-[#8D6E63] text-[#8D6E63]' 
              : 'border-transparent text-stone-400 hover:text-stone-600'
          }`}
        >
          Redemptions ({redemptions.length})
        </button>
      </div>

      {/* Rewards Catalog View */}
      {activeTab !== 'redemptions' && (
        <>
          {/* Filters Row */}
          <div className="mb-6 flex gap-4 flex-wrap items-center">
            <div className="relative flex-1 min-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="text"
                placeholder="Search rewards..."
                value={rewardSearch}
                onChange={(e) => setRewardSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#8D6E63]/20 focus:border-[#8D6E63] outline-none transition-all font-medium"
              />
            </div>
            <div className="flex gap-2 p-1 bg-stone-100 rounded-xl border border-stone-200/50">
              {['All', ...CATEGORIES].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setRewardCategoryFilter(cat)}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    rewardCategoryFilter === cat 
                      ? 'bg-white text-stone-900 shadow-sm' 
                      : 'text-stone-400 hover:text-stone-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            {userRole === 'ADMIN' && activeTab === 'all' && (
              <div className="flex gap-2 p-1 bg-stone-100 rounded-xl border border-stone-200/50">
                {[
                  ['All', 'All'],
                  ['ACTIVE', 'Active'],
                  ['PENDING_APPROVAL', 'Pending'],
                  ['REJECTED', 'Rejected'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setRewardStatusFilter(value)}
                    className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                      rewardStatusFilter === value
                        ? 'bg-white text-stone-900 shadow-sm'
                        : 'text-stone-400 hover:text-stone-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {loadingRewards ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8D6E63]"></div>
            </div>
          ) : filteredRewards.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2rem] border border-stone-100 shadow-sm">
              <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-stone-100 shadow-inner">
                 <Gift size={32} className="text-stone-300" />
              </div>
              <h4 className="text-lg font-black text-stone-900 italic font-headline mb-1">No Rewards Configured</h4>
              <p className="text-stone-400 text-sm font-bold">Start by adding your first client-facing reward offering.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRewards.map((reward) => {
                const badge = TIER_BADGES[reward.tierRequired] || TIER_BADGES.SILVER;
                return (
                  <div key={reward.id} className="relative bg-white border border-stone-200/60 rounded-[2rem] p-6 shadow-md hover:shadow-xl transition-all duration-300 group flex flex-col justify-between overflow-hidden">
                    
                    {/* Top Section */}
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-4xl bg-stone-50 w-16 h-16 rounded-2xl flex items-center justify-center border border-stone-100 shadow-inner">
                          {reward.icon || '🎁'}
                        </span>
                        
                        <div className="flex flex-col gap-1.5 items-end">
                          <span className="flex items-center gap-1 bg-amber-50 border border-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-black">
                            <Coins size={12} className="fill-amber-500 text-amber-500" />
                            {reward.pointsCost} Pts
                          </span>
                          
                          <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${badge.bg} ${badge.text}`}>
                            {badge.name}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-xl font-bold text-stone-900 font-headline italic mb-2 leading-tight">{reward.name}</h3>
                      <p className="text-stone-500 text-xs line-clamp-2 font-medium mb-4">{reward.description || 'No description provided.'}</p>
                      
                      <div className="flex flex-wrap gap-2 mb-4 border-t border-stone-100 pt-4">
                        <span className="text-[10px] font-bold text-stone-400 bg-stone-50 border border-stone-100 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                          {reward.category}
                        </span>
                        {reward.stock === -1 ? (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100/50 px-2.5 py-1 rounded-lg">
                            Unlimited Stock
                          </span>
                        ) : (
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${
                            reward.stock === 0 
                              ? 'bg-rose-50 border border-rose-100 text-rose-600' 
                              : 'bg-amber-50 border border-amber-100 text-amber-700'
                          }`}>
                            Stock: {reward.stock} left
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-stone-400 bg-stone-50 border border-stone-100 px-2.5 py-1 rounded-lg">
                          Redeemed: {reward.totalRedeemed || 0} times
                        </span>
                      </div>
                    </div>

                    {/* Bottom Actions Row */}
                    <div className="flex justify-between items-center mt-4 border-t border-stone-100 pt-4">
                      <div className="flex items-center gap-1.5 text-xs text-stone-500 font-bold">
                        <Building2 size={13} className="text-stone-300" />
                        <span className="truncate max-w-[120px]">{reward.cafeName}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                          reward.approvalStatus === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            : reward.approvalStatus === 'REJECTED'
                            ? 'bg-rose-50 text-rose-600 border-rose-100'
                            : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          {reward.approvalStatus === 'PENDING_APPROVAL' ? 'Pending Review' : reward.approvalStatus === 'ACTIVE' ? 'Active' : 'Rejected'}
                        </span>
                        
                        {userRole === 'ADMIN' && reward.approvalStatus === 'PENDING_APPROVAL' && (
                          <>
                            <button
                              onClick={() => handleApprove(reward.id)}
                              className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-stone-50 rounded-xl transition-all border border-transparent hover:border-stone-100 hover:shadow-sm"
                              title="Approve Reward"
                            >
                              <CheckCircle2 size={15} />
                            </button>
                            <button
                              onClick={() => handleReject(reward.id)}
                              className="p-2 text-stone-400 hover:text-rose-600 hover:bg-stone-50 rounded-xl transition-all border border-transparent hover:border-stone-100 hover:shadow-sm"
                              title="Reject Reward"
                            >
                              <AlertCircle size={15} />
                            </button>
                          </>
                        )}

                        {userRole === 'ADMIN' && (
                          <>
                            {activeTab === 'all' && (
                              <button
                                onClick={() => handleToggleActive(reward)}
                                className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                                  reward.isActive
                                    ? 'border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                    : 'border-stone-200 bg-stone-50 text-stone-500 hover:bg-stone-100'
                                }`}
                                title="Toggle active status"
                              >
                                {reward.isActive ? 'On' : 'Off'}
                              </button>
                            )}
                            <button
                              onClick={() => handleEdit(reward)}
                              className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-xl transition-all border border-transparent hover:border-stone-100 hover:shadow-sm"
                              title="Edit Reward"
                            >
                              <Edit size={15} />
                            </button>

                            <button
                              onClick={() => handleDelete(reward.id)}
                              className="p-2 text-stone-400 hover:text-rose-600 hover:bg-stone-50 rounded-xl transition-all border border-transparent hover:border-stone-100 hover:shadow-sm"
                              title="Delete Reward"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Redemption Logs View */}
      {activeTab === 'redemptions' && (
        <>
          {/* Filters Row */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="text"
                placeholder="Search by user or reward name..."
                value={redemptionSearch}
                onChange={(e) => setRedemptionSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#8D6E63]/20 focus:border-[#8D6E63] outline-none transition-all font-medium"
              />
            </div>
          </div>

          {loadingRedemptions ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8D6E63]"></div>
            </div>
          ) : filteredRedemptions.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2rem] border border-stone-100 shadow-sm">
              <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-stone-100 shadow-inner">
                 <BookOpen size={32} className="text-stone-300" />
              </div>
              <h4 className="text-lg font-black text-stone-900 italic font-headline mb-1">No Redemptions Recorded</h4>
              <p className="text-stone-400 text-sm font-bold">When customers redeem loyalty rewards in the mobile app, logs will appear here.</p>
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] overflow-hidden shadow-[0px_24px_48px_rgba(116,85,75,0.06)] border border-stone-100">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50/50 border-b border-stone-100">
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-stone-400">Customer Details</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-stone-400">Reward Purchased</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-stone-400 text-center">Points Cost</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-stone-400">Redeemed Date</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-stone-400 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {filteredRedemptions.map((log) => (
                    <tr key={log.id} className="hover:bg-stone-50/40 transition-all">
                      {/* Customer Details */}
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8D6E63] to-[#5D4037] text-white flex items-center justify-center font-bold shadow-sm overflow-hidden border border-white">
                            {log.user?.avatar ? (
                              <img src={log.user.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span>{(log.user?.name || 'U').charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-stone-900 text-sm leading-snug">{log.user?.name || 'Unknown User'}</h4>
                            <p className="text-[10px] font-bold text-stone-400 lowercase">{log.user?.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Reward Details */}
                      <td className="px-8 py-5">
                        <div>
                          <h4 className="font-bold text-stone-900 text-sm italic font-headline leading-tight">{log.reward?.name || 'Deleted Reward'}</h4>
                          <div className="flex gap-2 items-center mt-1">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">
                              {log.reward?.category}
                            </span>
                            <span className="text-[9px] text-stone-300 font-bold">•</span>
                            <span className="text-[9px] font-bold text-stone-500 flex items-center gap-1">
                              <Building2 size={10} /> {log.reward?.cafeName}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Points Spent */}
                      <td className="px-8 py-5 text-center">
                        <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-black">
                          <Coins size={11} className="fill-amber-500 text-amber-500" />
                          {log.pointsSpent} pts
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2 text-xs font-bold text-stone-600">
                          <Calendar size={14} className="text-stone-300" />
                          <span>{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-8 py-5 text-center">
                        <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                          log.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            : log.status === 'USED'
                            ? 'bg-blue-50 text-blue-600 border-blue-100'
                            : 'bg-stone-50 text-stone-400 border-stone-200'
                        }`}>
                          {log.status}
                        </span>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Sidebar Form */}
      <Sidebar
        isOpen={showAddSidebar}
        onClose={() => { resetForm(); setShowAddSidebar(false); }}
        title={editingReward ? "Modify Reward Option" : "Add Loyalty Incentive"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-5">
            {/* Reward Name */}
            <div>
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-2">Reward Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl font-bold text-stone-900 outline-none focus:bg-white focus:ring-2 focus:ring-[#8D6E63]/20"
                placeholder="e.g. Free Hot Cappuccino"
              />
            </div>

            {/* Icon Picker */}
            <div>
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-2">Icon Emoji representation</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  required
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-16 px-2 py-3 bg-stone-50 border border-stone-100 rounded-xl font-bold text-center text-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#8D6E63]/20"
                  maxLength={2}
                />
                <div className="flex-1 flex flex-wrap gap-1.5 p-2 bg-stone-50 border border-stone-100 rounded-xl items-center justify-start">
                  {EMOJI_SUGGESTIONS.map((emo) => (
                    <button
                      key={emo}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: emo })}
                      className="text-lg hover:scale-125 transition-transform"
                    >
                      {emo}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Category & Points Cost */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl font-bold text-stone-800 outline-none cursor-pointer"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-2">Points Cost</label>
                <div className="relative">
                  <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300 w-4.5 h-4.5" />
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.pointsCost}
                    onChange={(e) => setFormData({ ...formData, pointsCost: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-100 rounded-xl font-bold text-stone-800 outline-none focus:bg-white focus:ring-2 focus:ring-[#8D6E63]/20"
                  />
                </div>
              </div>
            </div>

            {/* Membership Tier & Cafe */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-2">Required Tier</label>
                <select
                  value={formData.tierRequired}
                  onChange={(e) => setFormData({ ...formData, tierRequired: e.target.value })}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl font-bold text-stone-800 outline-none cursor-pointer"
                >
                  <option value="BRONZE">Bronze</option>
                  <option value="SILVER">Coffee (Silver)</option>
                  <option value="GOLD">Caramel (Gold)</option>
                  <option value="PLATINUM">Cream (Platinum)</option>
                </select>
              </div>

              {userRole === 'ADMIN' && (
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-2">Associated Cafe</label>
                  <select
                    value={formData.cafeId}
                    onChange={(e) => setFormData({ ...formData, cafeId: e.target.value })}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl font-bold text-stone-800 outline-none cursor-pointer"
                  >
                    <option value="">Platform-Wide (All Cafes)</option>
                    {cafes.map((cafe) => (
                      <option key={cafe.id} value={cafe.id}>
                        {cafe.name} {cafe.owner ? `(Proprietor: ${cafe.owner.name})` : ''}
                      </option>
                    ))}
                    {cafes.length === 0 && <option value="">No Cafes Available</option>}
                  </select>
                </div>
              )}
            </div>

            {/* Stock Limit */}
            <div>
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-2">Stock Limit (-1 for unlimited)</label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300 w-4.5 h-4.5" />
                <input
                  type="number"
                  required
                  min="-1"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-100 rounded-xl font-bold text-stone-800 outline-none focus:bg-white focus:ring-2 focus:ring-[#8D6E63]/20"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-2">Reward Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl font-bold text-stone-800 h-20 resize-none outline-none focus:bg-white focus:ring-2 focus:ring-[#8D6E63]/20"
                placeholder="Give a brief details of what this reward covers..."
              />
            </div>

            {/* Terms & Conditions */}
            <div>
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-2">Terms & Conditions</label>
              <textarea
                value={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl font-bold text-stone-800 h-20 resize-none outline-none focus:bg-white focus:ring-2 focus:ring-[#8D6E63]/20"
                placeholder="Terms and conditions for redemption..."
              />
            </div>

            {userRole === 'ADMIN' && (
              <div>
                <label className="flex items-center gap-2.5 p-3.5 bg-stone-50 border border-stone-100 rounded-xl cursor-pointer hover:bg-stone-100 transition-all">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="accent-[#8D6E63] w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-stone-700">Active (Visible on App)</span>
                </label>
              </div>
            )}
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
              {isSubmitting ? 'Saving...' : (editingReward ? 'Update Reward' : userRole === 'CAFE_OWNER' ? 'Submit for Review' : 'Publish Reward')}
            </button>
          </div>
        </form>
      </Sidebar>
    </Layout>
  );
}
