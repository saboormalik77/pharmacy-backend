'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api/client'

export interface PharmacyAdminBranding {
  logoUrl: string | null
  businessName: string | null
}

const LS_KEY = 'pharmacyAdminBranding'
let cachedBranding: PharmacyAdminBranding | null | undefined
let inflight: Promise<PharmacyAdminBranding | null> | null = null

function normalizeBranding(value: Partial<PharmacyAdminBranding> | null | undefined): PharmacyAdminBranding {
  return {
    logoUrl: typeof value?.logoUrl === 'string' && value.logoUrl.trim() ? value.logoUrl : null,
    businessName: typeof value?.businessName === 'string' && value.businessName.trim() ? value.businessName : null,
  }
}

function readCachedBranding(): PharmacyAdminBranding | null {
  if (cachedBranding !== undefined) return cachedBranding
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(LS_KEY)
    cachedBranding = raw ? normalizeBranding(JSON.parse(raw)) : null
    return cachedBranding
  } catch {
    cachedBranding = null
    return null
  }
}

function saveBranding(branding: PharmacyAdminBranding) {
  cachedBranding = branding
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(branding))
  } catch {
    // ignore storage failures
  }
}

function applyBrandingToDocument(branding: PharmacyAdminBranding) {
  if (typeof document === 'undefined') return

  if (branding.businessName) {
    document.title = `${branding.businessName} - Data Analytics Platform`
  }

  if (branding.logoUrl) {
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']")
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = branding.logoUrl
  }
}

async function loadBranding(): Promise<PharmacyAdminBranding | null> {
  if (inflight) return inflight

  inflight = (async () => {
    try {
      const res = await apiClient.get<PharmacyAdminBranding>('/pharmacy/admin-branding')
      const branding = normalizeBranding(res.data)
      saveBranding(branding)
      applyBrandingToDocument(branding)
      return branding
    } catch {
      return readCachedBranding()
    } finally {
      inflight = null
    }
  })()

  return inflight
}

export function usePharmacyAdminBranding() {
  const [branding, setBranding] = useState<PharmacyAdminBranding | null>(() => readCachedBranding())

  useEffect(() => {
    let cancelled = false

    loadBranding().then((nextBranding) => {
      if (cancelled) return
      setBranding(nextBranding)
    })

    return () => {
      cancelled = true
    }
  }, [])

  return branding
}
