import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const protectedRoutes = [
  '/dashboard',
  '/analytics',
  '/settings',
  '/credits',
  '/returns',
  '/reports-hub',
  '/branches',
  '/roles',
  '/on-site-service',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )

  const token = request.cookies.get('auth_token')?.value

  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if ((pathname === '/login' || pathname === '/register') && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (pathname.startsWith('/setup-account')) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|_next/webpack-hmr|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)',
  ],
}
