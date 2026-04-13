'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { usePharmacyPermissions } from '@/hooks/usePharmacyPermissions'
import {
  LayoutDashboard,
  Upload,
  Package,
  BarChart3,
  FileText,
  Settings,
  HelpCircle,
  CreditCard,
  Bell,
  X,
  ScanLine,
  Camera,
  TrendingUp,
  Building2,
  Search,
  ShoppingCart,
  ClipboardCheck,
  ClipboardList,
  Warehouse,
  Archive,
  ShieldAlert,
  AlertTriangle,
  Scan,
  DollarSign,
  Trash2,
  ShieldCheck,
} from 'lucide-react'

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname()
  const { hasPermission, hasAnyPermission, isParent, isLoaded, isSigningOut } = usePharmacyPermissions()

  const navItems = [
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
      title: 'TBD Items',
      href: '/returns/tbd-items',
      icon: AlertTriangle,
      visible: hasPermission('tbd_items:view'),
    },
    {
      title: 'Destruction',
      href: '/returns/destruction',
      icon: Trash2,
      visible: hasPermission('destruction:view'),
    },
    {
      title: 'Wine Cellar',
      href: '/wine-cellar',
      icon: Archive,
      visible: hasPermission('wine_cellar:view'),
    },
    // {
    //   title: 'My Products',
    //   href: '/products',
    //   icon: ScanLine,
    //   visible: hasPermission('products:view'),
    // },
    {
      title: 'Search',
      href: '/optimization',
      icon: Search,
      visible: hasPermission('optimization:view'),
    },
    // {
    //   title: 'Marketplace',
    //   href: '/marketplace',
    //   icon: ShoppingCart,
    //   visible: hasPermission('marketplace:view'),
    // },
    // {
    //   title: 'Orders',
    //   href: '/orders',
    //   icon: ClipboardList,
    //   visible: hasPermission('orders:view'),
    // },
    // {
    //   title: 'Inventory Analysis',
    //   href: '/inventory-analysis',
    //   icon: Warehouse,
    //   visible: hasPermission('inventory_analysis:view'),
    // },
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
    // {
    //   title: 'Upload Documents',
    //   href: '/upload',
    //   icon: Upload,
    //   visible: hasPermission('documents:upload'),
    // },
    // {
    //   title: 'Verification',
    //   href: '/warehouse/verification',
    //   icon: ClipboardCheck,
    //   visible: hasPermission('warehouse:view'),
    // },
    // {
    //   title: 'Surplus Inventory',
    //   href: '/warehouse/surplus',
    //   icon: Archive,
    //   visible: hasPermission('warehouse:view'),
    // },
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
    // {
    //   title: 'Subscription',
    //   href: '/subscription',
    //   icon: CreditCard,
    //   visible: hasPermission('subscription:view'),
    // },
  ].filter((item) => item.visible)

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="p-4 sm:p-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-teal-600">PharmAnalytics</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Data Analytics Platform</p>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-2 hover:bg-accent rounded-md"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 overflow-y-auto">
        {!isLoaded || isSigningOut ? (
          <div className="space-y-2 px-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-7 bg-muted/50 rounded-lg animate-pulse" />
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
                  'flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-teal-600 text-white'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {item.title}
              </Link>
            )
          })
        )}
      </nav>

      <div className="border-t p-3 space-y-1">
        {!isLoaded || isSigningOut ? (
          <div className="space-y-2 px-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-7 bg-muted/50 rounded-lg animate-pulse" />
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
                  'flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-teal-600 text-white'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {item.title}
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
