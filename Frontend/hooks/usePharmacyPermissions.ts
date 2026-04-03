'use client'

import { usePharmacyContextStore } from '@/lib/store/pharmacyContextStore'

export function usePharmacyPermissions() {
  const {
    isParent,
    isBranch,
    isLoaded,
    isSigningOut,
    permissions,
    canManageBranches,
  } = usePharmacyContextStore()

  const isFullAccess = isParent

  // Full access: parent pharmacy, or legacy row that is neither branch nor parent (pre-multi-branch).
  // While !isLoaded or isSigningOut we do NOT grant all — avoids flashing every sidebar tab.
  const grantAll = !isSigningOut && isLoaded && ((isFullAccess) || (!isBranch && !isParent))

  const hasPermission = (key: string): boolean => {
    if (grantAll) return true
    if (!isLoaded || isSigningOut) return false
    return permissions.includes(key)
  }

  const hasAnyPermission = (keys: string[]): boolean => {
    if (grantAll) return true
    if (!isLoaded || isSigningOut) return false
    return keys.some((k) => permissions.includes(k))
  }

  const hasAllPermissions = (keys: string[]): boolean => {
    if (grantAll) return true
    if (!isLoaded || isSigningOut) return false
    return keys.every((k) => permissions.includes(k))
  }

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    permissions,
    isParent,
    isBranch,
    isFullAccess,
    isLoaded,
    isSigningOut,
    isViewingAsBranch: false, // kept for compatibility — always false now
    canManageBranches,
    grantAll,
  }
}
