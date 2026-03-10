/**
 * Authentication hook to check token validity and redirect if expired
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/utils/cookies';

export function useAuth(redirectToLogin: boolean = true) {
  const router = useRouter();

  useEffect(() => {
    // Check if token exists
    const token = getToken();
    
    if (!token && redirectToLogin) {
      // No token found, redirect to login
      router.push('/login');
    }
  }, [router, redirectToLogin]);

  return {
    isAuthenticated: !!getToken(),
  };
}

