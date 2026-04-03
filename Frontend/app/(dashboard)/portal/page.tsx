'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { NoPharmacyPermissions } from '@/components/shared/NoPharmacyPermissions'
import { usePharmacyPermissions } from '@/hooks/usePharmacyPermissions'
import { getFirstAllowedDashboardPath } from '@/lib/utils/pharmacyPortalRoutes'
import { Loader2 } from 'lucide-react'

export default function PortalPage() {
  const router = useRouter()
  const { isLoaded, grantAll, isParent, permissions } = usePharmacyPermissions()

  const first = isLoaded
    ? getFirstAllowedDashboardPath({ grantAll, isParent, effectivePermissions: permissions })
    : null

  useEffect(() => {
    if (!isLoaded || !first) return
    router.replace(first)
  }, [isLoaded, first, router])

  return (
    <DashboardLayout>
      {!isLoaded || first ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Opening your workspace…</p>
        </div>
      ) : (
        <NoPharmacyPermissions />
      )}
    </DashboardLayout>
  )
}
