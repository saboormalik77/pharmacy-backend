'use client'

import { DomainNotRecognizedScreen } from '@/components/auth/DomainNotRecognizedScreen'
import { TenantInfoLoadingScreen } from '@/components/auth/TenantInfoLoadingScreen'
import { usePharmacyPortalTenant } from '@/lib/hooks/usePharmacyPortalTenant'

/**
 * Global gate for the Pharmacy portal.
 *
 * Renders children only when the current hostname resolves to a pharmacy
 * tenant (or when running on localhost). Otherwise shows a full-screen loader
 * while `/auth/tenant-info` is in flight, or the "Domain not recognized"
 * black page when the hostname is not registered / is misconfigured.
 */
export default function TenantGate({
  children,
}: {
  children: React.ReactNode
}) {
  const { tenantChecked, tenantError, isLocalHost } = usePharmacyPortalTenant()

  if (!isLocalHost && !tenantChecked) {
    return <TenantInfoLoadingScreen />
  }

  if (!isLocalHost && tenantChecked && tenantError) {
    return <DomainNotRecognizedScreen detail={tenantError} />
  }

  return <>{children}</>
}
