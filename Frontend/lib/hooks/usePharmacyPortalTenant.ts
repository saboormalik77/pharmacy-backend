'use client'

import { useState, useEffect, useLayoutEffect } from 'react'

export interface PharmacyTenantInfo {
  buyingGroupId: string
  domain: string
  portalType: 'admin' | 'pharmacy' | 'unknown'
  isActive: boolean
  buyingGroupName: string
}

/**
 * Same tenant resolution as the pharmacy login page:
 * - localhost / 127.0.0.1 / *.localhost → skip API, no enforcement
 * - otherwise → GET /auth/tenant-info, must be portalType `pharmacy`
 */
export function usePharmacyPortalTenant() {
  const [tenantChecked, setTenantChecked] = useState(false)
  const [tenantError, setTenantError] = useState<string | null>(null)
  const [validTenant, setValidTenant] = useState<PharmacyTenantInfo | null>(null)

  useLayoutEffect(() => {
    const h = window.location.hostname
    if (
      h === 'localhost' ||
      h === '127.0.0.1' ||
      h.endsWith('.localhost')
    ) {
      setTenantChecked(true)
    }
  }, [])

  useEffect(() => {
    const fetchTenantInfo = async () => {
      const host = typeof window !== 'undefined' ? window.location.hostname : ''
      const isLocal =
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host.endsWith('.localhost')

      if (isLocal) {
        setTenantChecked(true)
        setValidTenant(null)
        return
      }

      try {
        const { apiClient } = await import('@/lib/api/client')
        const resp = await apiClient.get<{
          isLocalDev: boolean
          tenant: PharmacyTenantInfo | null
        }>('/auth/tenant-info', undefined, false)

        const tenant = resp?.data?.tenant
        if (!tenant) {
          setTenantError('This domain is not registered for any buying group.')
          setValidTenant(null)
          return
        }
        if (tenant.portalType !== 'pharmacy') {
          setTenantError('This domain is not configured for pharmacy access.')
          setValidTenant(null)
          return
        }
        setValidTenant(tenant)
      } catch (err: unknown) {
        const message =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message?: string }).message)
            : 'Unable to verify this domain. Access denied.'
        setTenantError(message)
        setValidTenant(null)
      } finally {
        setTenantChecked(true)
      }
    }

    fetchTenantInfo()
  }, [])

  const loginHost =
    typeof window !== 'undefined' ? window.location.hostname : ''
  const isLocalHost =
    loginHost === 'localhost' ||
    loginHost === '127.0.0.1' ||
    loginHost.endsWith('.localhost')

  return {
    tenantChecked,
    tenantError,
    validTenant,
    isLocalHost,
  }
}
