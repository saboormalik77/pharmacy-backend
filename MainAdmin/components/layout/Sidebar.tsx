'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Warehouse, CircleDollarSign, FileText, DollarSign, AlertTriangle, Trash2, UserCog, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';

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

const payoutSubRoutes = [
    '/pharmacy-payments',
    '/warehouse/unpaid',
    '/gpo-payment',
];

const sidebarLinks = [
    { href: '/', icon: LayoutDashboard, label: 'Dashboard', permission: 'dashboard' },
    { href: '/buying-groups', icon: Users, label: 'Buying Groups', permission: 'buying_groups' },
    { href: '/distributors', icon: Warehouse, label: 'Distributors', permission: 'distributors' },
    { href: '/warehouse', icon: Warehouse, label: 'Warehouse', permission: 'warehouse' },
    { href: '/payout-hub', icon: CircleDollarSign, label: 'Payout Mgmt', permission: 'payout_hub' },
    { href: '/policies', icon: FileText, label: 'Labeler Info', permission: 'policies' },
    { href: '/ndc-pricing', icon: DollarSign, label: 'NDC Pricing', permission: 'ndc_pricing' },
    { href: '/warehouse/tbd-items', icon: AlertTriangle, label: 'TBD Items', permission: 'tbd_items' },
    { href: '/warehouse/destruction', icon: Trash2, label: 'Destruction', permission: 'destruction' },
    { href: '/settings', icon: Settings, label: 'Settings', permission: 'settings' },
    { href: '/sub-admins', icon: UserCog, label: 'Sub Admins', permission: 'sub_admins' },
];

interface SidebarProps {
    isCollapsed: boolean;
    isOpen?: boolean;
    onClose?: () => void;
}

export function Sidebar({ isCollapsed, isOpen = false, onClose }: SidebarProps) {
    const pathname = usePathname();
    const { hasPermission, isMainAdmin } = usePermissions();

    const filteredLinks = sidebarLinks.filter((link) => {
        if (link.permission === 'sub_admins' && !isMainAdmin) return false;
        return hasPermission(link.permission);
    });

    const handleLinkClick = () => {
        if (onClose && typeof window !== 'undefined' && window.innerWidth < 640) {
            onClose();
        }
    };

    return (
        <aside
            className={cn(
                'h-screen fixed left-0 top-0 transition-all duration-300 z-40',
                isOpen ? 'translate-x-0' : '-translate-x-full',
                'sm:translate-x-0',
                'w-64 sm:w-auto',
                isCollapsed ? 'sm:w-16' : 'sm:w-64'
            )}
            style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--on-primary)',
            }}
        >
            <div
                className="h-full overflow-y-auto overflow-x-hidden p-3"
                style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(255,255,255,0.2) transparent',
                }}
            >
                <nav className="space-y-0.5">
                    {filteredLinks.map((link) => {
                        const Icon = link.icon;
                        const isActive =
                            link.href === '/warehouse'
                                ? pathname === '/warehouse' || warehouseSubRoutes.some(r => pathname.startsWith(r))
                                : link.href === '/payout-hub'
                                ? pathname === '/payout-hub' || payoutSubRoutes.some(r => pathname.startsWith(r))
                                : pathname === link.href ||
                                  (link.href !== '/' && pathname.startsWith(link.href));

                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={handleLinkClick}
                                className={cn(
                                    'flex items-center gap-3 px-3 py-2.5 rounded-[4px] transition-all',
                                    'hover:bg-white/10',
                                    isCollapsed && 'justify-center'
                                )}
                                style={{
                                    backgroundColor: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                                    color: isActive ? '#ffffff' : 'rgba(255,255,255,0.8)',
                                }}
                            >
                                <Icon className="w-5 h-5 flex-shrink-0" />
                                {!isCollapsed && (
                                    <span className={cn('text-sm', isActive ? 'font-semibold' : 'font-normal')}>
                                        {link.label}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </aside>
    );
}
