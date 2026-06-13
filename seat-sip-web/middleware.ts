import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow login page and public assets
  if (pathname === '/login' || pathname === '/register' || pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Check for admin token cookie
  const token = req.cookies.get('admin_token');

  if (!token) {
    // Redirect to login if no token
    return NextResponse.redirect(new URL('/login', req.url));
  }

  let role = req.cookies.get('admin_role')?.value;

  // Optional: Decode JWT to check expiry (simplified check)
  try {
    const parts = token.value.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      const now = Math.floor(Date.now() / 1000);
      role = role || payload.role;
      
      if (payload.exp && payload.exp < now) {
        // Token expired, clear cookie and redirect
        const response = NextResponse.redirect(new URL('/login', req.url));
        response.cookies.delete('admin_token');
        return response;
      }
    }
  } catch (error) {
    // Invalid token, redirect to login
    const response = NextResponse.redirect(new URL('/login', req.url));
    response.cookies.delete('admin_token');
    return response;
  }

  if (role === 'CAFE_OWNER') {
    const blockedOwnerPaths = [
      '/admin',
      '/banners',
      '/settings',
      '/users',
      '/cafe-owners',
      '/permissions',
      '/audit-logs',
      '/staff',
      '/explore',
    ];

    if (blockedOwnerPaths.some(path => pathname === path || pathname.startsWith(`${path}/`))) {
      return NextResponse.redirect(new URL('/owner/dashboard', req.url));
    }
  }

  if (role === 'ADMIN' && (pathname === '/owner/dashboard' || pathname.startsWith('/owner/'))) {
    return NextResponse.redirect(new URL('/admin/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login/register pages
     */
    '/((?!api|_next/static|_next/image|favicon.ico|login|register).*)',
  ],
};
