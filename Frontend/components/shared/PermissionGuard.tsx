'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { usePharmacyPermissions } from '@/hooks/usePharmacyPermissions'
import { getFirstAllowedDashboardPath } from '@/lib/utils/pharmacyPortalRoutes'
import { AccessDenied } from './AccessDenied'
import { NoPharmacyPermissions } from './NoPharmacyPermissions'
import { Loader2 } from 'lucide-react'

interface PermissionGuardProps {
  permission?: string
  anyPermission?: string[]
  children: React.ReactNode
}

export function PermissionGuard({ permission, anyPermission, children }: PermissionGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const didRedirect = useRef(false)
  const {
    hasPermission,
    hasAnyPermission,
    isLoaded,
    grantAll,
    isParent,
    permissions,
    isBranch,
  } = usePharmacyPermissions()

  const denied =
    isLoaded &&
    ((permission != null && !hasPermission(permission)) ||
      (anyPermission != null && !hasAnyPermission(anyPermission)))

  const first =
    denied && isLoaded
      ? getFirstAllowedDashboardPath({ grantAll, isParent, effectivePermissions: permissions })
      : null

  useEffect(() => {
    if (!denied || !first || pathname === first || didRedirect.current) return
    didRedirect.current = true
    router.replace(first)
  }, [denied, first, pathname, router])

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (denied) {
    if (!first) {
      return isBranch ? <NoPharmacyPermissions /> : <AccessDenied />
    }
    if (pathname !== first) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )
    }
    return <AccessDenied />
  }

  return <>{children}</>
}
