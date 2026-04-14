'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Warehouse, CircleDollarSign, FileText, DollarSign, AlertTriangle, Trash2, UserCog } from 'lucide-react';
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
                'bg-[#1e293b] text-[#cbd5e1] h-screen fixed left-0 top-16 transition-all duration-300 z-40',
                isOpen ? 'translate-x-0' : '-translate-x-full',
                'sm:translate-x-0',
                'w-64 sm:w-auto',
                isCollapsed ? 'sm:w-16' : 'sm:w-64'
            )}
        >
            <div
                className="h-full overflow-y-auto overflow-x-hidden p-4 pb-8"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}
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
                                    'flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all',
                                    'hover:bg-[#334155]',
                                    isActive && 'bg-[#334155] text-[#818cf8]',
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
