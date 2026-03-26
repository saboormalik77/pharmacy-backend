'use client';

import { useRef, useEffect } from 'react';
import { Provider } from 'react-redux';
import { makeStore, AppStore } from '@/lib/store/store';
import { checkAuthStatus } from '@/lib/store/authSlice';

export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const storeRef = useRef<AppStore | undefined>(undefined);
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  useEffect(() => {
    // Hydrate auth state from cookies on the client only — after mount.
    // This keeps the server and client initial renders identical (both start
    // with isLoading:true, isAuthenticated:false), eliminating React hydration
    // mismatches caused by reading cookies at module-evaluation time.
    storeRef.current!.dispatch(checkAuthStatus() as any);
  }, []);

  return <Provider store={storeRef.current!}>{children}</Provider>;
}

