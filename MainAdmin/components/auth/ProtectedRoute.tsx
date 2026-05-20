'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { logoutUser } from '@/lib/store/authSlice';
import { canAccessRoute, getFirstAllowedPath } from '@/lib/permissions';
import { ShieldOff } from 'lucide-react';

const PUBLIC_PAGES = ['/login', '/setup-account'];

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
  const { isAuthenticated, isLoading, token, user } = useAppSelector((state) => state.auth);
  const isPublicPage = PUBLIC_PAGES.includes(pathname);
  const canAccessCurrentRoute = isPublicPage || canAccessRoute(user, pathname);
  const firstAllowedPath = getFirstAllowedPath(user);

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
      doLogout();
      return;
    }

    const timer = setTimeout(doLogout, msUntilExpiry);
    return () => clearTimeout(timer);
  }, [token, dispatch, router]);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated && !isPublicPage) {
      window.location.href = '/login';
    } else if (isAuthenticated && isPublicPage) {
      router.push(firstAllowedPath || '/');
    } else if (isAuthenticated && !canAccessCurrentRoute && firstAllowedPath && pathname !== firstAllowedPath) {
      router.replace(firstAllowedPath);
    }
  }, [canAccessCurrentRoute, firstAllowedPath, isAuthenticated, isLoading, isPublicPage, pathname, router]);

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

  if (isAuthenticated && !isPublicPage && !canAccessCurrentRoute) {
    if (firstAllowedPath && pathname !== firstAllowedPath) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            <p className="mt-4 text-gray-600">Redirecting...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-500">
        <ShieldOff className="w-16 h-16 mb-4 text-gray-300" />
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-sm">You do not have permission to view this page.</p>
      </div>
    );
  }

  return <>{children}</>;
}
