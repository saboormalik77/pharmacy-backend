'use client'

import { useEffect, useState } from 'react'
import { Menu, ShoppingCart } from 'lucide-react'
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown'
import { UserDropdown } from './UserDropdown'
import { PharmacySwitcher } from './PharmacySwitcher'
import { Button } from '@/components/ui/Button'
import { useMarketplaceStore } from '@/lib/store/marketplaceStore'

interface AdminBranding {
  logoUrl: string | null
  businessName: string | null
}

interface TopBarProps {
  onMenuClick?: () => void
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { cartItems, toggleCart } = useMarketplaceStore()
  // const [branding, setBranding] = useState<AdminBranding | null>(null)

  // useEffect(() => {
  //   try {
  //     const cached = localStorage.getItem('pharmacyAdminBranding')
  //     if (cached) setBranding(JSON.parse(cached))
  //   } catch { /* ignore */ }
  // }, [])

  return (
    <header className="flex h-14 sm:h-16 items-center justify-between border-b bg-card px-4 sm:px-6">
      <div className="flex items-center gap-2 sm:gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        {/* <div className="flex items-center gap-2">
          {branding?.logoUrl && (
            <img src={branding.logoUrl} alt="Logo" className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain flex-shrink-0" />
          )}
          <h1 className="text-lg sm:text-xl font-semibold text-teal-600">{branding?.businessName || 'PharmAnalytics'}</h1>
        </div> */}
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <PharmacySwitcher />
        <NotificationDropdown />
        {/* <Button
          variant="ghost"
          size="sm"
          className="relative"
          onClick={toggleCart}
          aria-label="Shopping cart"
        >
          <ShoppingCart className="h-5 w-5" />
          {cartItems.length > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-white text-xs font-bold flex items-center justify-center">
              {cartItems.length}
            </span>
          )}
        </Button> */}
        <UserDropdown />
      </div>
    </header>
  )
}
