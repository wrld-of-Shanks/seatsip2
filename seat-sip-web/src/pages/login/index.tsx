// src/pages/login/index.tsx

import { useState } from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Coffee, Lock, Mail, AlertCircle, ArrowRight, Store, Eye, EyeOff } from 'lucide-react';
import { persistAuthSession } from '@/utils/auth';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorData = result.error || result.message;
        const errorMessage = typeof errorData === 'object' 
          ? (errorData.message || JSON.stringify(errorData)) 
          : (errorData || 'Login failed');
        setError(errorMessage);
        return;
      }

      const token = result.token || result.data?.token;
      const user = result.user || result.data?.user;

      if (!token || !user) {
        setError('Login response was missing user session details.');
        return;
      }

      const status = user.status || user.verification_status || 'PENDING_APPROVAL';

      if (status === 'PENDING_APPROVAL' || status === 'PENDING') {
        setError("Your application is under review. You'll be notified once approved.");
        return;
      }

      if (status === 'REJECTED') {
        setError('Your application was rejected. Contact support.');
        return;
      }

      persistAuthSession(token, user);

      if (user.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else if (user.role === 'CAFE_OWNER' && status === 'APPROVED') {
        router.push('/owner/dashboard');
      } else {
        setError('Your account is not approved for access yet.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden font-body text-white">
      <div className="cafe-bg-root" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,223,159,0.24),transparent_30%),linear-gradient(135deg,rgba(19,12,8,0.28),rgba(19,12,8,0.72))]" />

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
        <section className="grid w-full max-w-5xl items-center gap-8 lg:grid-cols-[1fr_440px]">
          <div className="hidden lg:block">
            <div className="max-w-xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-amber-200 backdrop-blur-xl">
                <Coffee size={16} />
                Admin and Owner Login
              </div>
              <h1 className="font-headline text-6xl font-black italic tracking-tight text-white drop-shadow-lg">
                SEATsip
              </h1>
              <p className="mt-4 max-w-md text-lg font-medium leading-8 text-white/80 drop-shadow">
                Admins review the platform. Cafe owners manage their approved cafe from the same secure login.
              </p>
            </div>
          </div>

          <div className="w-full">
            <div className="mb-7 text-center lg:hidden">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-white/30 bg-white/20 text-amber-100 shadow-xl backdrop-blur-2xl">
                <Coffee size={32} />
              </div>
              <h1 className="font-headline text-3xl font-black italic tracking-tight text-white drop-shadow-lg">
                  SEATsip
                </h1>
              <p className="mt-2 text-sm font-medium text-white/70">Sign in to continue</p>
            </div>

            <div className="glass-panel rounded-2xl p-6 shadow-2xl sm:p-8">
              <div className="mb-7 hidden lg:block">
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/30 bg-white/20 text-amber-100 shadow-lg backdrop-blur-2xl">
                  <Coffee size={28} />
                </div>
                <h2 className="font-headline text-3xl font-black tracking-tight text-white">
                  Welcome back
                </h2>
                <p className="mt-2 text-sm font-medium text-white/70">
                  Sign in as an admin or cafe owner.
                </p>
              </div>

              {error && (
                <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200/30 bg-red-500/20 p-4 text-red-50 backdrop-blur-xl">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-200" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Email */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-white/90">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
                    <input
                      type="email"
                      {...register('email')}
                      className="w-full rounded-lg border border-white/25 bg-white/15 py-3 pl-10 pr-4 text-white outline-none backdrop-blur-xl transition-all placeholder:text-white/50 focus:border-amber-200/70 focus:ring-4 focus:ring-amber-200/20"
                      placeholder="admin@cafe.app"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-2 text-sm font-medium text-red-200">{errors.email.message}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-white/90">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      {...register('password')}
                      className="w-full rounded-lg border border-white/25 bg-white/15 py-3 pl-10 pr-12 text-white outline-none backdrop-blur-xl transition-all placeholder:text-white/50 focus:border-amber-200/70 focus:ring-4 focus:ring-amber-200/20"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-white/65 transition hover:bg-white/10 hover:text-white"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-2 text-sm font-medium text-red-200">{errors.password.message}</p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="group flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-gradient-to-r from-[#74554b] to-[#5d4037] px-4 py-3 font-bold text-white shadow-lg shadow-black/20 transition-all hover:from-[#836359] hover:to-[#694b42] focus:ring-4 focus:ring-amber-200/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <span>{loading ? 'Logging in...' : 'Login'}</span>
                  {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
                </button>
              </form>

              <div className="mt-6 border-t border-white/15 pt-6 text-center">
                <p className="text-sm font-semibold text-white/75">Don't have an account?</p>
                <button
                  type="button"
                  onClick={() => router.push('/register')}
                  className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/15 px-4 py-3 text-sm font-bold text-white backdrop-blur-xl transition-all hover:bg-white/25"
                >
                  <Store size={16} />
                  Register Your Cafe
                </button>
              </div>

              <p className="mt-6 text-center text-xs font-medium text-white/60">
                © 2024 SEATsip. All rights reserved.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
