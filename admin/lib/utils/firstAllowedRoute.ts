// Sidebar route order mirrors Sidebar.tsx — used to find the first accessible page after login.
const ORDERED_ROUTES = [
    { href: '/', permission: 'dashboard' },
    { href: '/pharmacies', permission: 'pharmacies' },
    { href: '/analytics', permission: 'analytics' },
    { href: '/settings', permission: 'settings' },
    { href: '/processors', permission: 'processors' },
    { href: '/service-requests', permission: 'service_requests' },
    { href: '/sub-admins', permission: 'sub_admins' },
];

interface UserLike {
    role?: string;
    permissions?: string[];
    buying_group_id?: string | null;
}

export function getFirstAllowedRoute(user: UserLike | null): string {
    if (!user) return '/login';

    const isSuperAdmin = user.role === 'super_admin';
    const isProcessor = user.role === 'processor';

    // Super admins and processors always have access to dashboard
    if (isSuperAdmin || isProcessor) return '/';

    const perms = user.permissions || [];

    for (const route of ORDERED_ROUTES) {
        // service-requests is hidden from buying group admins (non-processor)
        if (route.href === '/service-requests' && user.buying_group_id) continue;
        // sub-admins only for buying group super_admin — already covered above for super_admin
        if (route.href === '/sub-admins') continue;

        if (perms.includes(route.permission)) return route.href;
    }

    // No sidebar access at all — land on settings as a safe fallback
    return '/settings';
}
