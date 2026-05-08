'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { ShieldOff } from 'lucide-react';

interface PermissionGateProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({ permission, children, fallback }: PermissionGateProps) {
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const allowed = hasPermission(permission);

  useEffect(() => {
    if (!allowed && !fallback) {
      router.replace('/');
    }
  }, [allowed, fallback, router]);

  if (!allowed) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-500">
        <ShieldOff className="w-16 h-16 mb-4 text-gray-300" />
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-sm">You do not have permission to view this page.</p>
      </div>
    );
  }

  return <>{children}</>;
}
