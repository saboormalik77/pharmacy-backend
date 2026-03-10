'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppSelector } from '@/lib/store/hooks';

// Pages that don't require authentication
const PUBLIC_PAGES = ['/login', '/forgot-password', '/reset-password'];

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const isPublicPage = PUBLIC_PAGES.includes(pathname);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated && !isPublicPage) {
      // Redirect to login if not authenticated
      router.push('/login');
    } else if (isAuthenticated && isPublicPage) {
      // Redirect to home if authenticated and on public page
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

