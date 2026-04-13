'use client';

export function usePermissions() {
  const hasPermission = (_perm: string) => true;

  return { hasPermission, isSuperAdmin: true, isProcessor: false, permissions: [] as string[] };
}
