import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTheme } from '@/contexts/ThemeContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Table2,
  Menu as MenuIcon,
  Settings,
  Bell,
  Search,
  ChevronDown,
  Moon,
  Sun,
  CalendarCheck,
  TrendingDown,
  LogOut,
  Building2,
  UtensilsCrossed,
  Calendar,
  X,
  BarChart3,
  Shield,
  User,
  Megaphone,
  Gift,
  Compass
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { AdminRole, getCookieRole, getLocalStorageUser, logout } from '@/utils/auth';

const SidebarItem = ({ icon: Icon, label, href, active = false, collapsed = false }: any) => (
  <Link
    href={href}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 scale-98 active:scale-95 font-manrope tracking-tight text-sm font-semibold ${
      active
        ? 'text-amber-200 bg-white/25 shadow-md border border-white/30'
        : 'text-stone-200 hover:bg-white/15 hover:text-white'
    }`}
  >
    <Icon size={20} />
    {!collapsed && <span>{label}</span>}
  </Link>
);

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = router.pathname;
  const allowedRoles = useMemo<AdminRole[]>(() => {
    if (pathname.startsWith('/owner')) return ['CAFE_OWNER'];
    if (pathname.startsWith('/admin')) return ['ADMIN'];
    if (pathname === '/banners') return ['ADMIN'];
    if (['/cafe-owners', '/users', '/settings', '/permissions', '/audit-logs', '/explore'].includes(pathname)) return ['ADMIN'];
    return ['ADMIN', 'CAFE_OWNER'];
  }, [pathname]);

  useAuthGuard(allowedRoles);

  const { isDark, toggleTheme } = useTheme();
  const [showLogout, setShowLogout] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('Admin');

  useEffect(() => {
    const role = getCookieRole();
    const storedUser = getLocalStorageUser();
    setUserRole(role);
    if (storedUser) {
      const nameValue = storedUser.name || storedUser.email || 'Admin';
      setUserName(String(nameValue));
    }

    // Session Expiration check & Immediate Logout
    const checkExpiry = () => {
      const expiresAt = localStorage.getItem('admin_expires_at');
      if (expiresAt) {
        const remaining = parseInt(expiresAt) - Date.now();
        if (remaining <= 0) {
          logout();
          alert('Session expired. Please log in again.');
          router.push('/login');
        }
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 5000);
    return () => clearInterval(interval);
  }, []);

  const isAdmin = userRole === 'ADMIN';
  const isCafeOwner = userRole === 'CAFE_OWNER';
  const dashboardHref = isCafeOwner ? '/owner/dashboard' : '/admin/dashboard';
  const isDashboardActive = ['/dashboard', '/admin/dashboard', '/owner/dashboard'].includes(pathname);

  const handleLogout = async () => {
    logout();
    router.replace('/login');
  };

  return (
    <div className="flex min-h-screen font-body selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Cafe background */}
      <div className="cafe-bg-root" />
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* SideNavBar */}
      <aside
        className={`fixed left-0 top-0 h-screen glass-sidebar flex flex-col py-8 px-6 z-50 transition-all duration-300 ${
          sidebarCollapsed ? 'w-20' : 'w-72'
        } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="mb-10 px-2 flex items-center justify-between">
          {!sidebarCollapsed && (
            <div>
              <h1 className="text-2xl font-bold tracking-tighter text-white font-headline uppercase italic drop-shadow-md">SEATsip</h1>
              <p className="text-[10px] font-label uppercase tracking-widest text-amber-300/80 mt-1 font-bold">
                {isAdmin ? 'Admin Panel' : isCafeOwner ? 'Cafe Dashboard' : 'Panel'}
              </p>
            </div>
          )}
          <button
            onClick={() => {
              setSidebarCollapsed(!sidebarCollapsed);
              setMobileMenuOpen(false);
            }}
            className="p-2 hover:bg-white/20 text-white/70 hover:text-white rounded-lg transition-colors lg:block hidden"
          >
            {sidebarCollapsed ? <MenuIcon size={20} /> : <X size={20} />}
          </button>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" href={dashboardHref} active={isDashboardActive} collapsed={sidebarCollapsed} />
          {isCafeOwner ? (
            <>
              <SidebarItem icon={Building2} label="My Cafe" href="/cafes" active={pathname === '/cafes'} collapsed={sidebarCollapsed} />
              <SidebarItem icon={Table2} label="Tables" href="/tables" active={pathname === '/tables'} collapsed={sidebarCollapsed} />
              <SidebarItem icon={UtensilsCrossed} label="Menu" href="/menu" active={pathname === '/menu'} collapsed={sidebarCollapsed} />
              <SidebarItem icon={ShoppingCart} label="Orders" href="/orders" active={pathname === '/orders'} collapsed={sidebarCollapsed} />
              <SidebarItem icon={Calendar} label="Reservations" href="/bookings" active={pathname === '/bookings'} collapsed={sidebarCollapsed} />
              <SidebarItem icon={Gift} label="Rewards" href="/owner/rewards" active={pathname === '/rewards' || pathname === '/owner/rewards'} collapsed={sidebarCollapsed} />
              <SidebarItem icon={Calendar} label="Redemptions" href="/owner/rewards?tab=redemptions" active={pathname === '/rewards' || pathname === '/owner/rewards'} collapsed={sidebarCollapsed} />
              <SidebarItem icon={BarChart3} label="Analytics" href="/analytics" active={pathname === '/analytics'} collapsed={sidebarCollapsed} />
              <SidebarItem icon={User} label="Profile" href="/owner/profile" active={pathname === '/owner/profile'} collapsed={sidebarCollapsed} />
            </>
          ) : (
            <>
              <SidebarItem icon={User} label="Pending Owners" href="/cafe-owners" active={pathname === '/cafe-owners'} collapsed={sidebarCollapsed} />
              <SidebarItem icon={Building2} label="Cafes" href="/cafes" active={pathname === '/cafes'} collapsed={sidebarCollapsed} />
              <SidebarItem icon={Compass} label="Explore" href="/explore" active={pathname === '/explore'} collapsed={sidebarCollapsed} />
              <SidebarItem icon={Gift} label="Rewards" href="/admin/rewards" active={pathname === '/rewards' || pathname === '/admin/rewards'} collapsed={sidebarCollapsed} />
              {isAdmin && <SidebarItem icon={Megaphone} label="Banners" href="/admin/banners" active={pathname === '/banners' || pathname === '/admin/banners'} collapsed={sidebarCollapsed} />}
              <SidebarItem icon={BarChart3} label="Analytics" href="/analytics" active={pathname === '/analytics'} collapsed={sidebarCollapsed} />
              <SidebarItem icon={Shield} label="Permissions" href="/permissions" active={pathname === '/permissions'} collapsed={sidebarCollapsed} />
              <SidebarItem icon={CalendarCheck} label="Audit Logs" href="/audit-logs" active={pathname === '/audit-logs'} collapsed={sidebarCollapsed} />
              {isAdmin && <SidebarItem icon={Bell} label="Notifications" href="/admin/notifications" active={pathname === '/admin/notifications'} collapsed={sidebarCollapsed} />}
            </>
          )}
        </nav>

        <div className="mt-auto space-y-2 border-t border-white/15 pt-6">
          {!isCafeOwner && (
            <SidebarItem icon={Settings} label="Settings" href="/settings" active={pathname === '/settings'} collapsed={sidebarCollapsed} />
          )}
          <button
            onClick={() => setShowLogout(true)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 scale-98 active:scale-95 font-manrope tracking-tight text-sm font-semibold text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 w-full group"
          >
            <LogOut size={20} />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Stage */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'}`}>
        {/* TopNavBar */}
        <header className="fixed top-0 right-0 z-40 glass-header flex justify-between items-center h-20 px-4 lg:px-10 w-full lg:w-[calc(100%-5rem)]">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-surface-container-high rounded-lg transition-colors"
            >
              <MenuIcon size={24} />
            </button>
            <h2 className="hidden md:block text-xl font-black text-white font-headline tracking-tighter italic drop-shadow">SEATsip Admin</h2>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            <div className="relative group hidden sm:block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
              <input
                className="pl-10 pr-4 py-2 bg-white/15 border border-white/20 rounded-full text-sm text-white placeholder-white/40 focus:ring-1 ring-amber-300/30 w-32 lg:w-64 transition-all outline-none backdrop-blur"
                placeholder="Search..."
                type="text"
              />
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-white/70 hover:bg-white/15 hover:text-white rounded-full transition-colors">
                <Bell size={20} />
              </button>
              <button
                onClick={toggleTheme}
                className="p-2 text-white/70 hover:bg-white/15 hover:text-white rounded-full transition-colors"
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
            <div className="h-8 w-[1px] bg-white/20 hidden lg:block"></div>
            <div className="flex items-center gap-2 pl-2 relative group">
              <button 
                onClick={() => setShowLogout(true)}
                className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-white flex items-center justify-center text-xs lg:text-sm font-bold border-2 border-white shadow-sm hover:ring-2 ring-amber-500/30 transition-all"
              >
                {userName ? userName.charAt(0).toUpperCase() : 'A'}
              </button>
              <div className="absolute right-0 top-full mt-2 hidden group-hover:block transition-all">
                <div className="bg-white border border-stone-200 rounded-lg shadow-xl py-2 w-48">
                  <div className="px-4 py-2 border-b border-stone-100 mb-1">
                    <p className="text-sm font-bold text-stone-900">{userName}</p>
                    <p className="text-xs text-stone-500">
                      {isAdmin ? 'Administrator' : isCafeOwner ? 'Cafe Owner' : 'Staff'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowLogout(true)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="pt-28 px-4 lg:px-10 pb-12 min-h-screen text-white">
          {children}
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={showLogout}
        onClose={() => setShowLogout(false)}
        title="Confirm Logout"
        size="sm"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogOut size={32} />
          </div>
          <p className="text-stone-600 mb-8">
            Are you sure you want to sign out? You will need to login again to access the admin panel.
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowLogout(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleLogout}
              className="flex-1"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
