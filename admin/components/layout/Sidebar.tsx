'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Building2,
    Warehouse,
    ShoppingCart,
    FileText,
    CreditCard,
    BarChart3,
    Settings,
    Users,
    UserCog,
    ClipboardList,
    Scan,
    Shield,
    AlertTriangle,
    CircleDollarSign,
    DollarSign,
    Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppSelector } from '@/lib/store/hooks';
import { usePermissions } from '@/hooks/usePermissions';

// Warehouse sub-routes that activate the Warehouse sidebar link
const warehouseSubRoutes = [
    '/warehouse/receiving',
    '/warehouse/verification',
    '/warehouse/surplus',
    '/warehouse/batches',
    '/warehouse/debit-memos',
    '/warehouse/ra-tracking',
    '/warehouse/returns',
    '/warehouse/destruction',
];

// Payout sub-routes that activate the Payout Management sidebar link
const payoutSubRoutes = [
    '/pharmacy-payments',
    '/warehouse/unpaid',
    '/gpo-payment',
];

// Admin navigation (for super_admin, manager, reviewer, support)
const adminSidebarLinks = [
    { href: '/', icon: LayoutDashboard, label: 'Dashboard', permission: 'dashboard' },
    { href: '/pharmacies', icon: Building2, label: 'Pharmacies', permission: 'pharmacies' },
    { href: '/distributors', icon: Warehouse, label: 'Distributors', permission: 'distributors' },
    { href: '/marketplace', icon: ShoppingCart, label: 'Marketplace', permission: 'marketplace' },
    { href: '/documents', icon: FileText, label: 'Documents', permission: 'documents' },
    { href: '/payments', icon: CreditCard, label: 'Payments', permission: 'payments' },
    { href: '/payout-hub', icon: CircleDollarSign, label: 'Payout Mgmt', permission: 'payout_hub' },
    { href: '/analytics', icon: BarChart3, label: 'Analytics', permission: 'analytics' },
    { href: '/settings', icon: Settings, label: 'Settings', permission: 'settings' },
    { href: '/admins', icon: Users, label: 'Admins', permission: 'admins' },
    { href: '/processors', icon: UserCog, label: 'Processors', permission: 'processors' },
    { href: '/policies', icon: Shield, label: 'Labeler Info', permission: 'policies' },
    { href: '/ndc-pricing', icon: DollarSign, label: 'NDC Pricing', permission: 'ndc_pricing' },
    { href: '/warehouse/tbd-items', icon: AlertTriangle, label: 'TBD Items', permission: 'tbd_items' },
    { href: '/warehouse/destruction', icon: Trash2, label: 'Destruction', permission: 'destruction' },
    { href: '/warehouse', icon: Warehouse, label: 'Warehouse', matchPrefix: '/warehouse', permission: 'warehouse' },
];

// Processor navigation (for role = 'processor') — Receiving is warehouse-only
const processorSidebarLinks = [
    { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/warehouse/returns', icon: ClipboardList, label: 'Returns' },
    { href: '/warehouse/returns/create', icon: Scan, label: 'Create Return' },
    { href: '/ndc-pricing', icon: DollarSign, label: 'NDC Pricing' },
    { href: '/warehouse/tbd-items', icon: AlertTriangle, label: 'TBD Items' },
    { href: '/warehouse/destruction', icon: Trash2, label: 'Destruction' },
    // { href: '/warehouse/wine-cellar', icon: Archive, label: 'Wine Cellar' },
    // { href: '/settings', icon: Settings, label: 'Settings' },
];

interface SidebarProps {
    isCollapsed: boolean;
    isOpen?: boolean;
    onClose?: () => void;
}

export function Sidebar({ isCollapsed, isOpen = false, onClose }: SidebarProps) {
    const pathname = usePathname();
    const { user } = useAppSelector((state) => state.auth);
    const { hasPermission, isSuperAdmin } = usePermissions();

    // Choose navigation links based on user role, filtered by permissions
    const rawLinks = user?.role === 'processor' ? processorSidebarLinks : adminSidebarLinks;
    const sidebarLinks = rawLinks.filter((link) => {
        const perm = (link as any).permission as string | undefined;
        if (!perm) return true;
        if (perm === 'admins' && !isSuperAdmin) return false;
        return hasPermission(perm);
    });

    const handleLinkClick = () => {
        // Close sidebar on mobile when a link is clicked
        if (onClose && typeof window !== 'undefined' && window.innerWidth < 640) {
            onClose();
        }
    };

    return (
        <aside
            className={cn(
                'bg-[#1e293b] text-[#cbd5e1] h-screen fixed left-0 top-16 transition-all duration-300 z-40',
                // Mobile: hidden by default, show as overlay when open
                // Desktop: always visible (sm:translate-x-0 overrides the transform)
                isOpen ? 'translate-x-0' : '-translate-x-full',
                'sm:translate-x-0',
                // Desktop: adjust width based on collapsed state
                // Mobile: fixed width
                'w-64 sm:w-auto',
                isCollapsed ? 'sm:w-16' : 'sm:w-64'
            )}
        >
            <div
                className="h-full overflow-y-auto overflow-x-hidden p-4 pb-8"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}
            >
                <nav className="space-y-0.5">
                    {sidebarLinks.map((link) => {
                        const Icon = link.icon;
                        const isActive =
                            link.href === '/warehouse'
                                ? pathname === '/warehouse' || warehouseSubRoutes.some(r => pathname.startsWith(r))
                                : link.href === '/payout-hub'
                                ? pathname === '/payout-hub' || payoutSubRoutes.some(r => pathname.startsWith(r))
                                : pathname === link.href;

                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={handleLinkClick}
                                className={cn(
                                    'flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all',
                                    'hover:bg-[#334155]',
                                    isActive && 'bg-[#334155] text-[#4CAF50]',
                                    isCollapsed && 'justify-center'
                                )}
                            >
                                <Icon className="w-4 h-4 flex-shrink-0" />
                                {!isCollapsed && (
                                    <span className="text-xs font-medium">{link.label}</span>
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </aside>
    );
}
