'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { logoutUser } from '@/lib/store/authSlice';

// Pages that don't require authentication
const PUBLIC_PAGES = ['/login', '/forgot-password', '/reset-password'];

/** Decode the `exp` field from a JWT payload without any external library. */
function decodeJwtExp(token: string): number | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(json);
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading, token } = useAppSelector((state) => state.auth);
  const isPublicPage = PUBLIC_PAGES.includes(pathname);

  // ── Auto-logout when JWT expires ─────────────────────────────
  useEffect(() => {
    if (!token) return;

    const exp = decodeJwtExp(token);
    if (!exp) return;

    const msUntilExpiry = exp * 1000 - Date.now();

    const doLogout = () => {
      dispatch(logoutUser());
      window.location.href = '/login';
    };

    if (msUntilExpiry <= 0) {
      // Token already expired at mount time
      doLogout();
      return;
    }

    const timer = setTimeout(doLogout, msUntilExpiry);
    return () => clearTimeout(timer);
  }, [token, dispatch, router]);

  // ── Route protection ──────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated && !isPublicPage) {
      window.location.href = '/login';
    } else if (isAuthenticated && isPublicPage) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, isPublicPage, router]);

  // Show loading state while checking auth
  if (isLoading && !isAuthenticated && !isPublicPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

