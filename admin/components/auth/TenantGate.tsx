'use client';

import { useState, useEffect } from 'react';
import { DomainNotRecognizedScreen } from '@/components/auth/DomainNotRecognizedScreen';
import { TenantInfoLoadingScreen } from '@/components/auth/TenantInfoLoadingScreen';
import { useAdminPortalTenant } from '@/lib/hooks/useAdminPortalTenant';

/**
 * Global gate for the Buying Group admin portal.
 *
 * Renders children only when the current hostname resolves to an admin tenant
 * (or when running on localhost). Otherwise shows a full-screen loader while
 * `/auth/tenant-info` is in flight, or the "Domain not recognized" black page
 * when the hostname is not registered / is misconfigured.
 */
export default function TenantGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { tenantChecked, tenantError, isLocalHost } = useAdminPortalTenant();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show loading until client mounts to avoid hydration mismatch
  if (!mounted) {
    return <TenantInfoLoadingScreen />;
  }

  if (!isLocalHost && !tenantChecked) {
    return <TenantInfoLoadingScreen />;
  }

  if (!isLocalHost && tenantChecked && tenantError) {
    return <DomainNotRecognizedScreen detail={tenantError} />;
  }

  return <>{children}</>;
}
