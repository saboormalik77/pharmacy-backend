'use client';

import { useAppSelector } from '@/lib/store/hooks';

export function usePermissions() {
  const { user } = useAppSelector((state) => state.auth);
  const isMainAdmin = user?.role === 'main_admin' || !user?.role;
  const isSubAdmin = user?.role === 'sub_admin';
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];

  const hasPermission = (perm: string) => {
    if (isMainAdmin) return true;
    if (perm === 'dashboard') return true;
    return permissions.includes(perm);
  };

  return { hasPermission, isMainAdmin, isSubAdmin, permissions };
}
