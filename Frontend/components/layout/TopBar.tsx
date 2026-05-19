'use client'

import { Menu } from 'lucide-react'
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown'
import { UserDropdown } from './UserDropdown'
import { PharmacySwitcher } from './PharmacySwitcher'
import { Button } from '@/components/ui/Button'
import { usePharmacyAdminBranding } from '@/lib/hooks/usePharmacyAdminBranding'

interface TopBarProps {
  onMenuClick?: () => void
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const branding = usePharmacyAdminBranding()
  const logoUrl = branding?.logoUrl ?? null
  const businessName = branding?.businessName ?? null

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 sm:px-6">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden hover:bg-primary/10 hover:text-primary"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        {(logoUrl || businessName) && (
          <div className="flex items-center gap-2 min-w-0">
            {logoUrl && (
              <img src={logoUrl} alt="Logo" className="w-7 h-7 rounded-[4px] object-contain flex-shrink-0" />
            )}
            {businessName && (
              <span className="text-sm font-semibold text-foreground truncate">{businessName}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <PharmacySwitcher />
        <NotificationDropdown />
        <UserDropdown />
      </div>
    </header>
  )
}
