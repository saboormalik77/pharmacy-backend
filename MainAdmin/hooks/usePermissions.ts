'use client';

import { useAppSelector } from '@/lib/store/hooks';
import { getUserPermissions, hasPermissionForUser, isMainAdminRole } from '@/lib/permissions';

export function usePermissions() {
  const { user } = useAppSelector((state) => state.auth);
  const isMainAdmin = isMainAdminRole(user?.role);
  const isSubAdmin = user?.role === 'sub_admin';
  const permissions = getUserPermissions(user);

  const hasPermission = (perm: string) => {
    return hasPermissionForUser(user, perm);
  };

  return { hasPermission, isMainAdmin, isSubAdmin, permissions };
}
