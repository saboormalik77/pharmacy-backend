'use client';

import { useAppSelector } from '@/lib/store/hooks';

export function usePermissions() {
  const { user } = useAppSelector((state) => state.auth);
  const isSuperAdmin = user?.role === 'super_admin';
  const isProcessor = user?.role === 'processor';
  const permissions = user?.permissions || [];

  const hasPermission = (perm: string) => {
    // Processor UI is not permission-gated.
    if (isProcessor) return true;
    if (isSuperAdmin) return true;
    return permissions.includes(perm);
  };

  return { hasPermission, isSuperAdmin, isProcessor, permissions };
}
