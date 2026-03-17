'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
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
  TrendingUp,
  Building2,
  Search,
  ShoppingCart,
  ClipboardList,
  Warehouse,
  Archive,
} from 'lucide-react'

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Upload Documents',
    href: '/upload',
    icon: Upload,
  },
  {
    title: 'My Products',
    href: '/products',
    icon: ScanLine,
  },
  // {
  //   title: 'Analytics & Reports',
  //   href: '/reports',
  //   icon: BarChart3,
  // },
  {
    title: 'Search',
    href: '/optimization',
    icon: Search,
  },
  {
    title: 'Packages',
    href: '/packages',
    icon: Package,
  },
  {
    title: 'Marketplace',
    href: '/marketplace',
    icon: ShoppingCart,
  },
  {
    title: 'Orders',
    href: '/orders',
    icon: ClipboardList,
  },
  {
    title: 'Inventory Analysis',
    href: '/inventory-analysis',
    icon: Warehouse,
  },
  {
    title: 'Top Distributors',
    href: '/top-distributors',
    icon: Building2,
  },
  {
    title: 'Credits',
    href: '/credits',
    icon: CreditCard,
  },
  {
    title: 'Analytics & Reports',
    href: '/analytics',
    icon: BarChart3,
  },
  {
    title: 'Wine Cellar',
    href: '/wine-cellar',
    icon: Archive,
  },
  // {
  //   title: 'Documents',
  //   href: '/documents',
  //   icon: FileText,
  // },
  // {
  //   title: 'Notifications',
  //   href: '/notifications',
  //   icon: Bell,
  // },
]

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname()

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

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-teal-600 text-white'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {item.title}
            </Link>
          )
        })}
      </nav>

      <div className="border-t p-3 space-y-1">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Settings className="h-5 w-5" />
          Settings
        </Link>
        <Link
          href="/subscription"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <CreditCard className="h-5 w-5" />
          Subscription
        </Link>
        {/* <Link
          href="/support"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <HelpCircle className="h-5 w-5" />
          Support
        </Link> */}
      </div>
    </div>
  )
}
