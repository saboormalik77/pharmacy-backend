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

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 sm:px-6">
      <div className="flex items-center gap-2 sm:gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden hover:bg-primary/10 hover:text-primary"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <PharmacySwitcher />
        <NotificationDropdown />
        <UserDropdown />
      </div>
    </header>
  )
}
