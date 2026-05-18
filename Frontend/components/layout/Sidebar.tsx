'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { usePharmacyPermissions } from '@/hooks/usePharmacyPermissions'
import { apiClient } from '@/lib/api/client'
import {
  LayoutDashboard,
  BarChart3,
  FileText,
  Settings,
  CreditCard,
  X,
  Building2,
  ClipboardList,
  Scan,
  ShieldCheck,
  Truck,
} from 'lucide-react'

interface SidebarProps {
  onClose?: () => void
}

interface AdminBranding {
  logoUrl: string | null
  businessName: string | null
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname()
  const { hasPermission, hasAnyPermission, isParent, isLoaded, isSigningOut } = usePharmacyPermissions()
  const [branding, setBranding] = useState<AdminBranding | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const res = await apiClient.get<AdminBranding>('/pharmacy/admin-branding')
        if (res.status === 'success' && res.data) {
          setBranding(res.data)
          if (typeof window !== 'undefined') {
            localStorage.setItem('pharmacyAdminBranding', JSON.stringify(res.data))
            if (res.data.businessName) {
              document.title = `${res.data.businessName} - Data Analytics Platform`
            }
            if (res.data.logoUrl) {
              let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']")
              if (!link) {
                link = document.createElement('link')
                link.rel = 'icon'
                document.head.appendChild(link)
              }
              link.href = res.data.logoUrl
            }
          }
        }
      } catch {
        // ignore
      }
    }
    fetchBranding()
  }, [])

  const navItems = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      visible: hasPermission('dashboard:view'),
    },
    {
      title: 'Returns',
      href: '/returns',
      icon: ClipboardList,
      visible: hasAnyPermission(['returns:view', 'returns:create']),
    },
    {
      title: 'Create Return',
      href: '/returns/create',
      icon: Scan,
      visible: hasPermission('returns:create'),
    },
    {
      title: 'On-Site Service',
      href: '/on-site-service',
      icon: Truck,
      visible: hasAnyPermission(['on_site_service:view', 'on_site_service:create']),
    },
    {
      title: 'Credits',
      href: '/credits',
      icon: CreditCard,
      visible: hasPermission('credits:view'),
    },
    {
      title: 'Analytics & Reports',
      href: '/analytics',
      icon: BarChart3,
      visible: hasPermission('analytics:view'),
    },
    {
      title: 'Reports',
      href: '/reports-hub',
      icon: FileText,
      visible: hasAnyPermission(['returns:view', 'analytics:view', 'documents:view']),
    },
  ].filter((item) => item.visible)

  const bottomItems = [
    {
      title: 'Branches',
      href: '/branches',
      icon: Building2,
      visible: isParent,
    },
    {
      title: 'Roles & Permissions',
      href: '/roles',
      icon: ShieldCheck,
      visible: isParent,
    },
    {
      title: 'Settings',
      href: '/settings',
      icon: Settings,
      visible: hasPermission('settings:view'),
    },
  ].filter((item) => item.visible)

  return (
    <div className="flex h-full w-64 flex-col bg-[#1d2222]">
      {/* Header with branding */}
      <div className="p-4 sm:p-6 flex items-center justify-between border-b border-[#3d4343]">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {branding?.logoUrl && (
            <img src={branding.logoUrl} alt="Logo" className="w-8 h-8 rounded-[4px] object-contain flex-shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-bold text-white truncate">{branding?.businessName || 'PharmAnalytics'}</h2>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-2 hover:bg-[#3d4343] rounded-[4px] flex-shrink-0 text-white"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto" suppressHydrationWarning>
        {!mounted || !isLoaded || isSigningOut ? (
          <div className="space-y-2 px-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-7 bg-[#3d4343]/50 rounded-[4px] animate-pulse" />
            ))}
          </div>
        ) : (
          navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-[4px] px-3 py-2 transition-colors',
                  isActive
                    ? 'bg-[#516057] text-white font-semibold border-l-2 border-[#ad916a]'
                    : 'text-[#9ca3af] font-medium hover:bg-[#516057] hover:text-white',
                  'text-sm'
                )}
              >
                <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                {item.title}
              </Link>
            )
          })
        )}
      </nav>

      {/* Bottom navigation */}
      <div className="border-t border-[#3d4343] p-3 space-y-1" suppressHydrationWarning>
        {!mounted || !isLoaded || isSigningOut ? (
          <div className="space-y-2 px-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-7 bg-[#3d4343]/50 rounded-[4px] animate-pulse" />
            ))}
          </div>
        ) : (
          bottomItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-[4px] px-3 py-2 transition-colors',
                  isActive
                    ? 'bg-[#516057] text-white font-semibold border-l-2 border-[#ad916a]'
                    : 'text-[#9ca3af] font-medium hover:bg-[#516057] hover:text-white',
                  'text-sm'
                )}
              >
                <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                {item.title}
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
