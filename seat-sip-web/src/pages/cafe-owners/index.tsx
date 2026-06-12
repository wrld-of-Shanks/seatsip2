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
  User, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Building2,
  FileText,
  Briefcase,
  Contact,
  ChevronRight,
  CheckCircle2,
  Eye,
  XCircle
} from 'lucide-react';
import { Sidebar } from '@/components/ui/Sidebar';
import { toast } from 'react-hot-toast';

const isPendingOwner = (status: string) => status === 'PENDING_APPROVAL' || status === 'PENDING';

const OwnerCard = ({ name, email, phone, cafes, status, businessLicense, experience, avatar, applicationCafe, onEdit, onApprove, onReject }: any) => (
  <div className="glass-panel p-6 rounded-[2rem] border border-white/60 hover:shadow-2xl transition-all group relative overflow-hidden bg-white/40 backdrop-blur-xl">
    <div className="flex justify-between items-start mb-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center text-amber-700 font-bold text-xl shadow-inner border border-white/40 overflow-hidden">
          {avatar ? (
            <img src={avatar} alt={name} className="w-full h-full object-cover" />
          ) : (
            name.charAt(0)
          )}
        </div>
        <div>
          <h4 className="font-black text-stone-900 leading-tight italic font-headline text-lg">{name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
              status === 'APPROVED'
                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                : status === 'REJECTED'
                ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
            }`}>
              {status === 'PENDING_APPROVAL' ? 'PENDING' : status}
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <button onClick={onEdit} className="p-2 hover:bg-white rounded-lg text-stone-400 hover:text-stone-900 transition-colors" title="View Application">
          <Eye size={16} />
        </button>
        {isPendingOwner(status) && (
          <>
            <button
              onClick={onApprove}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-emerald-700"
              title="Approve"
            >
              <CheckCircle2 size={16} />
              Approve
            </button>
            <button
              onClick={onReject}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-rose-700"
              title="Deny"
            >
              <XCircle size={16} />
              Deny
            </button>
          </>
        )}
      </div>
    </div>

    <div className="space-y-4">
      <div className="flex items-center gap-3 text-stone-600">
        <Mail size={14} className="text-stone-400" />
        <span className="text-xs font-medium">{email}</span>
      </div>
      {phone && (
        <div className="flex items-center gap-3 text-stone-600">
          <Phone size={14} className="text-stone-400" />
          <span className="text-xs font-medium">{phone}</span>
        </div>
      )}
      {applicationCafe && (
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Cafe Application</p>
          <p className="mt-1 text-sm font-black text-stone-800">{applicationCafe.name}</p>
          <p className="mt-1 line-clamp-2 text-xs font-semibold text-stone-500">{applicationCafe.address}</p>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-stone-100/50">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest">Business ID</p>
          <p className="text-xs font-bold text-stone-700">{businessLicense || 'N/A'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest">Experience</p>
          <p className="text-xs font-bold text-stone-700">{experience || 0} Years</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between p-3 bg-stone-50/50 rounded-xl border border-stone-100">
        <div className="flex items-center gap-2">
          <Building2 size={14} className="text-stone-400" />
          <span className="text-xs font-black text-stone-600 uppercase tracking-tight">{cafes} Cafes Owned</span>
        </div>
        <ChevronRight size={14} className="text-stone-300" />
      </div>
    </div>
  </div>
);

const DetailRow = ({ label, value }: { label: string; value: any }) => (
  <div className="rounded-xl border border-stone-100 bg-stone-50 p-3">
    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">{label}</p>
    <p className="mt-1 break-words text-sm font-bold text-stone-800">{value || 'N/A'}</p>
  </div>
);

export default function CafeOwnersPage() {
  const [owners, setOwners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddSidebar, setShowAddSidebar] = useState(false);
  const [editingOwner, setEditingOwner] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    governmentId: '',
    businessLicense: '',
    experienceYears: '',
    verificationStatus: 'PENDING_APPROVAL',
    avatar: '',
  });

  useEffect(() => {
    loadOwners();
  }, []);

  async function loadOwners() {
    try {
      setLoading(true);
      const res = await api.cafeOwners.list();
      if (res.success) {
        setOwners(res.data);
      }
    } catch (error) {
      toast.error('Failed to load cafe owners');
    } finally {
      setLoading(false);
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      governmentId: '',
      businessLicense: '',
      experienceYears: '',
      verificationStatus: 'PENDING_APPROVAL',
      avatar: '',
    });
    setEditingOwner(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingOwner) {
        await api.cafeOwners.update(editingOwner.id, formData);
        toast.success('Owner updated successfully');
      } else {
        await api.cafeOwners.create(formData);
        toast.success('Owner registered successfully');
      }
      setShowAddSidebar(false);
      resetForm();
      loadOwners();
    } catch (error: any) {
      toast.error(error.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (owner: any) => {
    setEditingOwner(owner);
    setFormData({
      name: owner.name,
      email: owner.email,
      password: '', // Don't pre-fill password
      phone: owner.phone || '',
      governmentId: owner.governmentId || '',
      businessLicense: owner.businessLicense || '',
      experienceYears: owner.experienceYears?.toString() || '',
      verificationStatus: owner.verificationStatus || 'PENDING_APPROVAL',
      avatar: owner.avatar || '',
    });
    setShowAddSidebar(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this owner? This action cannot be undone.')) return;
    
    try {
      await api.cafeOwners.delete(id);
      toast.success('Owner deleted successfully');
      loadOwners();
    } catch (error: any) {
      toast.error(error.message || 'Delete failed');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.cafeOwners.approve(id);
      toast.success('Owner approved');
      setOwners(prev => prev.filter(owner => owner.id !== id));
      if (editingOwner?.id === id) {
        setShowAddSidebar(false);
        resetForm();
      }
      loadOwners();
    } catch (error: any) {
      toast.error(error.message || 'Approval failed');
    }
  };

  const handleReject = async (id: string) => {
    if (!window.confirm('Reject this cafe owner application?')) return;

    try {
      await api.cafeOwners.reject(id);
      toast.success('Owner denied and deleted');
      setOwners(prev => prev.filter(owner => owner.id !== id));
      if (editingOwner?.id === id) {
        setShowAddSidebar(false);
        resetForm();
      }
      loadOwners();
    } catch (error: any) {
      toast.error(error.message || 'Rejection failed');
    }
  };

  const filteredOwners = owners.filter(owner => 
    owner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    owner.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (owner.businessLicense && owner.businessLicense.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Layout>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 mb-2 font-headline italic">Pending Owners</h1>
          <p className="text-stone-600 font-medium">Review cafe owner applications and approval status.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowAddSidebar(true); }}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-stone-900 to-stone-800 text-white rounded-xl font-bold hover:shadow-xl transition-all shadow-lg active:scale-95"
        >
          <Plus size={20} />
          Register Owner
        </button>
      </div>

      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative col-span-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <input
            type="text"
            placeholder="Search by name, email or business ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-stone-200 rounded-2xl focus:ring-2 focus:ring-amber-500/20 focus:border-stone-400 outline-none transition-all shadow-sm font-medium"
          />
        </div>
        <button className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-stone-200 rounded-2xl text-stone-600 font-bold hover:bg-stone-50 transition-all shadow-sm">
          <Filter size={18} />
          More Filters
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 rounded-[2rem] bg-stone-100 animate-pulse"></div>
          ))}
        </div>
      ) : filteredOwners.length === 0 ? (
        <div className="text-center py-20 glass-panel rounded-[3rem]">
          <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6 text-stone-300">
            <User size={40} />
          </div>
          <h3 className="text-xl font-bold text-stone-900 mb-2 italic">No Owners Found</h3>
          <p className="text-stone-500 max-w-xs mx-auto">Start by registering a new cafe owner in the system.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredOwners.map((owner) => (
            <OwnerCard
              key={owner.id}
              name={owner.name}
              email={owner.email}
              phone={owner.phone}
              status={owner.verificationStatus}
              businessLicense={owner.businessLicense}
              experience={owner.experienceYears}
              avatar={owner.avatar}
              applicationCafe={owner.applicationCafe}
              cafes={owner._count?.ownedCafes || 0}
              onEdit={() => handleEdit(owner)}
              onApprove={() => handleApprove(owner.id)}
              onReject={() => handleReject(owner.id)}
            />
          ))}
        </div>
      )}

      {/* Registration Sidebar */}
      <Sidebar
        isOpen={showAddSidebar}
        onClose={() => setShowAddSidebar(false)}
        title={editingOwner ? "View Application" : "Register New Owner"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {editingOwner && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Application Review</p>
                    <h3 className="mt-1 text-xl font-black text-stone-900">{editingOwner.applicationCafe?.name || 'Cafe details not available'}</h3>
                    <p className="mt-1 text-sm font-semibold text-stone-600">{editingOwner.applicationCafe?.address || 'No address submitted'}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                    editingOwner.verificationStatus === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-700'
                      : editingOwner.verificationStatus === 'REJECTED'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {editingOwner.verificationStatus === 'PENDING_APPROVAL' ? 'PENDING' : editingOwner.verificationStatus}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <DetailRow label="Owner Name" value={editingOwner.name} />
                <DetailRow label="Owner Email" value={editingOwner.email} />
                <DetailRow label="Owner Phone" value={editingOwner.phone} />
                <DetailRow label="Government ID" value={editingOwner.governmentId} />
                <DetailRow label="Business License" value={editingOwner.businessLicense} />
                <DetailRow label="Cafe Description" value={editingOwner.applicationCafe?.description} />
                <DetailRow label="Opening Hours" value={editingOwner.applicationCafe?.openingHours} />
                <DetailRow label="Cafe Photos" value={editingOwner.applicationCafe?.images?.join(', ')} />
              </div>

              {isPendingOwner(editingOwner.verificationStatus) && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleApprove(editingOwner.id)}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg transition hover:bg-emerald-700"
                  >
                    <CheckCircle2 size={18} />
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(editingOwner.id)}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg transition hover:bg-rose-700"
                  >
                    <XCircle size={18} />
                    Deny
                  </button>
                </div>
              )}

              <div className="h-px bg-stone-100" />
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest px-1">Login Credentials</h3>
            <div className="group space-y-2">
              <label className="text-xs font-black text-stone-400 uppercase tracking-wider ml-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-amber-600" size={18} />
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-100 rounded-xl focus:bg-white focus:border-amber-200 outline-none transition-all font-medium"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div className="group space-y-2">
              <label className="text-xs font-black text-stone-400 uppercase tracking-wider ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-100 rounded-xl focus:bg-white focus:border-amber-200 outline-none transition-all font-medium"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="group space-y-2">
              <label className="text-xs font-black text-stone-400 uppercase tracking-wider ml-1">Login Password</label>
              <div className="relative">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                <input
                  type="password"
                  name="password"
                  required={!editingOwner}
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-100 rounded-xl focus:bg-white focus:border-amber-200 outline-none transition-all font-medium"
                  placeholder={editingOwner ? "Leave blank to keep same" : "••••••••"}
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-stone-100 my-8"></div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest px-1 text-center">Verification Details</h3>
            
            <div className="group space-y-2">
              <label className="text-xs font-black text-stone-400 uppercase tracking-wider ml-1">Government ID / PAN</label>
              <div className="relative">
                <Contact className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                <input
                  type="text"
                  name="governmentId"
                  value={formData.governmentId}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-100 rounded-xl focus:bg-white focus:border-amber-200 outline-none transition-all font-medium"
                  placeholder="ABCDE1234F"
                />
              </div>
            </div>

            <div className="group space-y-2">
              <label className="text-xs font-black text-stone-400 uppercase tracking-wider ml-1">Business License / GST</label>
              <div className="relative">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                <input
                  type="text"
                  name="businessLicense"
                  value={formData.businessLicense}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-100 rounded-xl focus:bg-white focus:border-amber-200 outline-none transition-all font-medium"
                  placeholder="GST27AAACB..."
                />
              </div>
            </div>

            <div className="group space-y-2">
              <label className="text-xs font-black text-stone-400 uppercase tracking-wider ml-1">Industry Experience (Years)</label>
              <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                <input
                  type="number"
                  name="experienceYears"
                  value={formData.experienceYears}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-100 rounded-xl focus:bg-white focus:border-amber-200 outline-none transition-all font-medium"
                  placeholder="5"
                />
              </div>
            </div>

            <div className="group space-y-2">
              <label className="text-xs font-black text-stone-400 uppercase tracking-wider ml-1">Contact Phone</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-100 rounded-xl focus:bg-white focus:border-amber-200 outline-none transition-all font-medium"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div className="group space-y-2">
              <label className="text-xs font-black text-stone-400 uppercase tracking-wider ml-1">Avatar Image URL</label>
              <div className="relative">
                <input
                  type="text"
                  name="avatar"
                  value={formData.avatar}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl focus:bg-white focus:border-amber-200 outline-none transition-all font-medium"
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
            </div>

            <div className="group space-y-2">
              <label className="text-xs font-black text-stone-400 uppercase tracking-wider ml-1">Verification Status</label>
              <div className="relative">
                <select
                  name="verificationStatus"
                  value={formData.verificationStatus}
                  onChange={(e) => setFormData(prev => ({ ...prev, verificationStatus: e.target.value }))}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl focus:bg-white focus:border-amber-200 outline-none transition-all font-medium appearance-none"
                >
                  <option value="PENDING_APPROVAL">Pending Approval</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-4 bg-stone-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? (
              <span className="animate-pulse">Processing...</span>
            ) : (
              <>
                <ShieldCheck size={18} />
                {editingOwner ? 'Update Owner' : 'Complete Registration'}
              </>
            )}
          </button>
        </form>
      </Sidebar>
    </Layout>
  );
}
