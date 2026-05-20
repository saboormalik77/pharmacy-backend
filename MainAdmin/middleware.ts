import { NextRequest, NextResponse } from 'next/server';
import { canAccessRoute, getFirstAllowedPath, isMainAdminRole } from '@/lib/permissions';
import type { PermissionUser } from '@/lib/permissions';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public routes
  if (pathname.startsWith('/login') || pathname.startsWith('/setup-account')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('main_admin_token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Parse user from cookie
  let user: PermissionUser | null = null;
  try {
    const raw = request.cookies.get('main_admin_user')?.value;
    if (raw) user = JSON.parse(raw);
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Main admin bypasses all permission checks
  if (isMainAdminRole(user?.role)) return NextResponse.next();

  if (!canAccessRoute(user, pathname)) {
    const redirectPath = getFirstAllowedPath(user);
    if (redirectPath && pathname !== redirectPath) {
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};
