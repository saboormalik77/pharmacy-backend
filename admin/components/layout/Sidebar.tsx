'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Building2,
    BarChart3,
    Settings,
    UserCog,
    ClipboardList,
    Scan,
    Truck,
    ChevronLeft,
    Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppSelector } from '@/lib/store/hooks';
import { usePermissions } from '@/hooks/usePermissions';
import { useEffect, useMemo, useState } from 'react';
import { fetchSettings } from '@/lib/store/settingsSlice';
import { useAppDispatch } from '@/lib/store/hooks';

// Admin navigation (for super_admin, manager, reviewer, support)
const adminSidebarLinks = [
    { href: '/', icon: LayoutDashboard, label: 'Dashboard', permission: 'dashboard' },
    { href: '/pharmacies', icon: Building2, label: 'Pharmacies', permission: 'pharmacies' },
    { href: '/analytics', icon: BarChart3, label: 'Analytics', permission: 'analytics' },
    { href: '/settings', icon: Settings, label: 'Settings', permission: 'settings' },
    { href: '/processors', icon: UserCog, label: 'Processors', permission: 'processors' },
    { href: '/service-requests', icon: Truck, label: 'Service Requests', permission: 'service_requests' },
];

// Processor navigation (for role = 'processor')
const processorSidebarLinks = [
    { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/warehouse/returns', icon: ClipboardList, label: 'Returns' },
    { href: '/warehouse/returns/create', icon: Scan, label: 'Create Return' },
    { href: '/service-requests', icon: Truck, label: 'Service Requests' },
];

interface SidebarProps {
    isCollapsed: boolean;
    isOpen?: boolean;
    onClose?: () => void;
    onToggleCollapse?: () => void;
}

export function Sidebar({ isCollapsed, isOpen = false, onClose, onToggleCollapse }: SidebarProps) {
    const pathname = usePathname();
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const { hasPermission, isSuperAdmin } = usePermissions();
    const { settings } = useAppSelector((state) => state.settings);
    const [cachedBranding, setCachedBranding] = useState<{ businessName: string | null; logoUrl: string | null } | null>(null);

    useEffect(() => {
        dispatch(fetchSettings());
    }, [dispatch]);

    // Processors may not have access to /admin/settings, but login flow stores
    // buying-group branding in localStorage as "adminBranding".
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const stored = window.localStorage.getItem('adminBranding');
            if (!stored) return;
            const parsed = JSON.parse(stored);
            setCachedBranding({
                businessName: typeof parsed?.businessName === 'string' ? parsed.businessName : null,
                logoUrl: typeof parsed?.logoUrl === 'string' ? parsed.logoUrl : null,
            });
        } catch {
            // ignore
        }
    }, []);

    const headerBusinessName = settings?.businessName ?? cachedBranding?.businessName ?? null;
    const headerLogoUrl = settings?.logoUrl ?? cachedBranding?.logoUrl ?? null;
    const headerInitials = useMemo(() => {
        const name = headerBusinessName?.trim();
        if (!name) return 'PA';
        const parts = name.split(/\s+/).filter(Boolean);
        const a = parts[0]?.[0] || '';
        const b = parts.length > 1 ? (parts[1]?.[0] || '') : (parts[0]?.[1] || '');
        const initials = (a + b).toUpperCase();
        return initials || 'PA';
    }, [headerBusinessName]);

    // Choose navigation links based on user role, filtered by permissions
    const rawLinks = user?.role === 'processor' ? processorSidebarLinks : adminSidebarLinks;
    const sidebarLinks = rawLinks.filter((link) => {
        // Hide service requests for buying group users, but allow processors to see them
        if (link.href === '/service-requests' && user?.buying_group_id && user?.role !== 'processor') {
            return false;
        }
        
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
                'bg-[#1d2222] text-[#9ca3af] h-screen fixed left-0 top-0 transition-all duration-300 z-50',
                isOpen ? 'translate-x-0' : '-translate-x-full',
                'sm:translate-x-0',
                'w-64 sm:w-auto',
                isCollapsed ? 'sm:w-16' : 'sm:w-64'
            )}
        >
            {/* Sidebar Header with Brand & Collapse */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-[#3d4343]">
                {!isCollapsed ? (
                    <>
                        <div className="flex items-center gap-2">
                            {settings?.logoUrl ? (
                                <img src={settings.logoUrl} alt="Logo" className="w-8 h-8 rounded-[4px] object-contain" />
                            ) : (
                                <>
                                    {headerLogoUrl ? (
                                        <img src={headerLogoUrl} alt="Logo" className="w-8 h-8 rounded-[4px] object-contain" />
                                    ) : (
                                        <div className="w-8 h-8 bg-[#516057] rounded-[4px] flex items-center justify-center">
                                            <span className="text-white font-bold text-xs">{headerInitials}</span>
                                        </div>
                                    )}
                                </>
                            )}
                            <span className="text-sm font-bold text-white">{headerBusinessName || 'PharmAdmin'}</span>
                        </div>
                        <button
                            onClick={() => {
                                // On mobile the sidebar is an overlay. "Collapse" should act like close.
                                if (onClose && typeof window !== 'undefined' && window.innerWidth < 640) onClose();
                                if (onToggleCollapse) onToggleCollapse();
                            }}
                            className="p-1.5 text-[#9ca3af] hover:text-white hover:bg-[#3d4343] rounded-[4px] transition-colors"
                            aria-label="Collapse sidebar"
                            type="button"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                    </>
                ) : (
                    <button
                        onClick={() => {
                            if (onToggleCollapse) onToggleCollapse();
                        }}
                        className="p-1.5 text-[#9ca3af] hover:text-white hover:bg-[#3d4343] rounded-[4px] transition-colors w-full flex items-center justify-center"
                        aria-label="Open sidebar"
                        type="button"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                )}
            </div>
            
            <div
                className="h-full overflow-y-auto overflow-x-hidden p-4 pb-10"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#3d4343 transparent' }}
            >
                <nav className="space-y-1">
                    {sidebarLinks.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href;

                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={handleLinkClick}
                                className={cn(
                                    'flex items-center gap-3 px-3 py-2.5 rounded transition-all',
                                    'hover:bg-[#516057] hover:text-white',
                                    isActive
                                        ? 'bg-[#516057] text-white border-l-3 border-[#7fb399]'
                                        : 'text-[#9ca3af]',
                                    isCollapsed && 'justify-center'
                                )}
                            >
                                <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                                {!isCollapsed && (
                                    <span className={cn('text-xs', isActive ? 'font-semibold' : 'font-medium')}>
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
