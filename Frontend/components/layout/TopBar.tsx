'use client'

import { Menu, ShoppingCart } from 'lucide-react'
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown'
import { UserDropdown } from './UserDropdown'
import { Button } from '@/components/ui/Button'
import { useMarketplaceStore } from '@/lib/store/marketplaceStore'

interface TopBarProps {
  onMenuClick?: () => void
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { cartItems, toggleCart } = useMarketplaceStore()

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
        <h1 className="text-lg sm:text-xl font-semibold text-teal-600">PharmAnalytics</h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <NotificationDropdown />
        <Button
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
        </Button>
        <UserDropdown />
      </div>
    </header>
  )
}
