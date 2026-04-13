'use client';

interface PermissionGateProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({ children }: PermissionGateProps) {
  return <>{children}</>;
}
