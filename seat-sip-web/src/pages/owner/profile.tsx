import { useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Mail, Phone, User } from 'lucide-react';

export default function OwnerProfilePage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('admin_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
    }
  }, []);

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="mb-2 font-headline text-3xl font-bold italic text-stone-900">Profile</h1>
        <p className="font-medium text-stone-600">Cafe owner account details.</p>
      </div>

      <div className="max-w-xl rounded-2xl border border-stone-100 bg-white p-6 shadow-[0px_24px_48px_rgba(116,85,75,0.06)]">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-xl font-black text-amber-800">
            {(user?.name || user?.email || 'O').charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-headline text-xl font-black italic text-stone-900">{user?.name || 'Cafe Owner'}</h2>
            <p className="text-xs font-black uppercase tracking-widest text-emerald-600">Approved Cafe Owner</p>
          </div>
        </div>

        <div className="space-y-3">
          <Info icon={User} label="Name" value={user?.name || '-'} />
          <Info icon={Mail} label="Email" value={user?.email || '-'} />
          <Info icon={Phone} label="Phone" value={user?.phone || '-'} />
        </div>
      </div>
    </Layout>
  );
}

function Info({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-stone-50 px-4 py-3">
      <Icon size={18} className="text-stone-400" />
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">{label}</p>
        <p className="text-sm font-bold text-stone-800">{value}</p>
      </div>
    </div>
  );
}
