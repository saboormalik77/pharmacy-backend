'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { usePharmacyPortalTenant } from '@/lib/hooks/usePharmacyPortalTenant'
import { getPharmacyId } from '@/lib/utils/cookies'

const DEFAULT_TITLE = 'PharmAnalytics'
const DEFAULT_FAVICON = '/favicon.ico'
const FAVICON_LINK_ID = 'branding-head-favicon'

// ─── Shared localStorage key ─────────────────────────────────────────────────
// The login page also reads/writes this key so both stay in sync.
const LS_KEY = 'pharmacyAdminBranding'

interface CachedBranding {
  logoUrl: string | null
  businessName: string | null
}

// Read once at module-load time for an instant first-paint value.
const cachedOnLoad: CachedBranding | null = (() => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as CachedBranding) : null
  } catch {
    return null
  }
})()

// Save branding to localStorage so future page-loads are instant.
function saveBranding(b: CachedBranding) {
  try { window.localStorage.setItem(LS_KEY, JSON.stringify(b)) } catch { /* ignore */ }
}

/**
 * Return OUR OWN <link rel="icon"> element (never the React-owned one).
 *
 * See admin/BrandingHead.tsx for the full explanation of why we append our
 * own element instead of mutating the React-owned one.
 */
const ensureFaviconLink = (): HTMLLinkElement | null => {
  if (typeof document === 'undefined') return null
  let link = document.getElementById(FAVICON_LINK_ID) as HTMLLinkElement | null
  if (link) return link
  link = document.createElement('link')
  link.id = FAVICON_LINK_ID
  link.rel = 'icon'
  document.head.appendChild(link)
  return link
}

export default function BrandingHead() {
  const pathname = usePathname()
  const { validTenant } = usePharmacyPortalTenant()
  const [cachedBranding, setCachedBranding] = useState<CachedBranding | null>(cachedOnLoad)

  const lastTitleRef = useRef<string | null>(null)
  const lastFaviconRef = useRef<string | null>(null)

  // Priority order:
  //  1. validTenant — freshest; populated on real domains via /auth/tenant-info
  //  2. cachedOnLoad — from localStorage written by the login page or a
  //                    previous session; gives an instant value at first paint
  const businessName =
    validTenant?.buyingGroupName ||
    cachedBranding?.businessName ||
    null

  const logoUrl =
    validTenant?.logoUrl ||
    cachedBranding?.logoUrl ||
    null

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(LS_KEY)
      setCachedBranding(raw ? (JSON.parse(raw) as CachedBranding) : null)
    } catch {
      setCachedBranding(null)
    }
  }, [])

  // Persist to localStorage whenever the tenant API returns fresh data.
  useEffect(() => {
    if (!validTenant) return
    saveBranding({
      logoUrl: validTenant.logoUrl || null,
      businessName: validTenant.buyingGroupName || null,
    })
  }, [validTenant])

  // ── Authenticated fetch from /pharmacy/admin-branding ─────────────────────
  // On real domains, the tenant hook already returns the logo.
  // On localhost (dev), the tenant hook returns null — so we fall back to the
  // dedicated `/pharmacy/admin-branding` endpoint which takes the pharmacy_id
  // from the auth cookie.  This gives us correct branding on localhost AND
  // avoids an extra network call when tenant-info already worked.
  useEffect(() => {
    const pharmacyId = getPharmacyId()
    if (!pharmacyId) return            // not logged in yet
    if (validTenant?.logoUrl) return   // already have branding from tenant hook

    let cancelled = false

    const fetchBranding = async () => {
      try {
        const { apiClient } = await import('@/lib/api/client')
        const res = await apiClient.get<{
          logoUrl: string | null
          businessName: string | null
        }>('/pharmacy/admin-branding')

        if (cancelled) return

        const data = res.data
        if (!data) return

        if (data.logoUrl || data.businessName) {
          saveBranding({ logoUrl: data.logoUrl, businessName: data.businessName })

          // Apply immediately — don't wait for a re-render from state.
          if (data.businessName) {
            const nextTitle = `${data.businessName}`
            if (lastTitleRef.current !== nextTitle) {
              lastTitleRef.current = nextTitle
              if (typeof document !== 'undefined') document.title = nextTitle
            }
          }
          if (data.logoUrl) {
            if (lastFaviconRef.current !== data.logoUrl) {
              lastFaviconRef.current = data.logoUrl
              const link = ensureFaviconLink()
              if (link) link.href = data.logoUrl
            }
          }
        }
      } catch {
        /* non-critical — silently ignore */
      }
    }

    fetchBranding()
    return () => { cancelled = true }
  // Re-run whenever auth state might have changed (pharmacyId, validTenant).
  // validTenant is listed so the effect re-evaluates after the tenant hook
  // resolves on a real domain (where we can skip the extra fetch).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validTenant])

  useEffect(() => {
    if (typeof document === 'undefined') return
    if (!businessName && pathname === '/login') return
    if (!businessName && document.title && document.title !== DEFAULT_TITLE) return
    const nextTitle = businessName || DEFAULT_TITLE
    if (lastTitleRef.current === nextTitle) return
    lastTitleRef.current = nextTitle
    document.title = nextTitle
  }, [businessName, pathname])

  useEffect(() => {
    const nextFavicon = logoUrl || DEFAULT_FAVICON
    if (lastFaviconRef.current === nextFavicon) return
    lastFaviconRef.current = nextFavicon
    const link = ensureFaviconLink()
    if (!link) return
    link.href = nextFavicon
  }, [logoUrl])

  return null
}
