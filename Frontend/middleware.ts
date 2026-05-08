import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Protected routes that require authentication.
// (Several paths are commented out in Sidebar.tsx — they stay listed here so direct URLs still require login.)
const protectedRoutes = [
  '/dashboard',
  '/portal',
  '/products',
  // '/upload',
  '/optimization',
  '/packages',
  '/top-distributors',
  '/analytics',
  '/reports',
  '/documents',
  '/notifications',
  '/settings',
  // '/subscription',
  '/support',
  '/credits',
  '/payments',
  '/orders',
  '/returns',
  '/shipments',
  '/inventory',
  '/inventory-analysis',
  '/marketplace',
  '/barcode-generator',
  '/warehouse',
  '/branches',
  '/roles',
  '/on-site-service',
]

// Routes that are publicly accessible (for external redirects like Stripe)
// These routes handle their own authentication client-side
const externalRedirectRoutes = [
  '/marketplace/checkout/success',
  '/subscription', // Stripe subscription redirect
]

// Public routes that don't require authentication
const publicRoutes = ['/login', '/register', '/', '/setup-account', '/sso-callback', '/sso-check']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if the current path is an external redirect route (Stripe, etc.)
  // These routes handle auth client-side to avoid issues with cross-origin cookies
  const isExternalRedirectRoute = externalRedirectRoutes.some((route) =>
    pathname.startsWith(route)
  )

  // Allow external redirect routes to pass through (they handle auth client-side)
  if (isExternalRedirectRoute) {
    return NextResponse.next()
  }

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )

  // Check if the current path is a public route
  const isPublicRoute = publicRoutes.some((route) => pathname === route)

  // Get the auth token from cookies
  const token = request.cookies.get('auth_token')?.value

  // If accessing a protected route without a token, redirect to login
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', request.url)
    // Preserve the intended destination for redirect after login
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If accessing login/register with a token, send to portal (picks first allowed page)
  if ((pathname === '/login' || pathname === '/register') && token) {
    return NextResponse.redirect(new URL('/portal', request.url))
  }

  // Allow setup-account page (even with token, don't redirect)
  if (pathname.startsWith('/setup-account')) {
    return NextResponse.next()
  }

  // Allow the request to proceed
  return NextResponse.next()
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)',
  ],
}

