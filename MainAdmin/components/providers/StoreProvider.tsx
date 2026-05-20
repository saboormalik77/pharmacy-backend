'use client';

import { useRef, useEffect } from 'react';
import { Provider } from 'react-redux';
import { makeStore, AppStore } from '@/lib/store/store';
import { checkAuthStatus, refreshPermissions } from '@/lib/store/authSlice';

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
    const store = storeRef.current!;
    store.dispatch(checkAuthStatus() as any).then(() => {
      store.dispatch(refreshPermissions() as any);
    });
  }, []);

  return <Provider store={storeRef.current!}>{children}</Provider>;
}
