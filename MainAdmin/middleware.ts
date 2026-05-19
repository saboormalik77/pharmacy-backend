import { NextRequest, NextResponse } from 'next/server';

// Route → required permission. Order matters: more-specific prefixes first.
const ROUTE_PERMISSIONS: Array<{ prefix: string; permission: string; mainAdminOnly?: boolean }> = [
  { prefix: '/warehouse/tbd-items',   permission: 'tbd_items' },
  { prefix: '/warehouse/destruction', permission: 'destruction' },
  { prefix: '/warehouse',             permission: 'warehouse' },
  { prefix: '/buying-groups',         permission: 'buying_groups' },
  { prefix: '/distributors',          permission: 'distributors' },
  { prefix: '/payout-hub',            permission: 'payout_hub' },
  { prefix: '/pharmacy-payments',     permission: 'payout_hub' },
  { prefix: '/policies',              permission: 'policies' },
  { prefix: '/ndc-pricing',           permission: 'ndc_pricing' },
  { prefix: '/settings',              permission: 'settings' },
  { prefix: '/sub-admins',            permission: 'sub_admins', mainAdminOnly: true },
];

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
  let user: { role?: string; permissions?: string[] } | null = null;
  try {
    const raw = request.cookies.get('main_admin_user')?.value;
    if (raw) user = JSON.parse(raw);
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const isMainAdmin = user?.role === 'main_admin' || !user?.role;
  const permissions: string[] = Array.isArray(user?.permissions) ? user.permissions : [];

  // Main admin bypasses all permission checks
  if (isMainAdmin) return NextResponse.next();

  // Find the matching route rule
  const rule = ROUTE_PERMISSIONS.find((r) => pathname.startsWith(r.prefix));
  if (!rule) return NextResponse.next();

  // Sub-admin cannot access main-admin-only routes
  if (rule.mainAdminOnly) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Check permission
  if (!permissions.includes(rule.permission)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};
