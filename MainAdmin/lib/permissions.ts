export type PermissionKey =
  | 'dashboard'
  | 'buying_groups'
  | 'distributors'
  | 'warehouse'
  | 'payout_hub'
  | 'policies'
  | 'ndc_pricing'
  | 'tbd_items'
  | 'destruction'
  | 'settings'
  | 'sub_admins';

export interface PermissionUser {
  role?: string | null;
  permissions?: string[] | null;
}

interface RoutePermission {
  prefix: string;
  permission: PermissionKey;
  mainAdminOnly?: boolean;
  exact?: boolean;
}

interface AllowedDestination {
  href: string;
  permission: PermissionKey;
  mainAdminOnly?: boolean;
}

// Order matters: specific route prefixes must be checked before broader parents.
export const ROUTE_PERMISSIONS: RoutePermission[] = [
  { prefix: '/', permission: 'dashboard', exact: true },
  { prefix: '/warehouse/tbd-items', permission: 'tbd_items' },
  { prefix: '/warehouse/destruction', permission: 'destruction' },
  { prefix: '/warehouse/unpaid', permission: 'payout_hub' },
  { prefix: '/pharmacy-payments', permission: 'payout_hub' },
  { prefix: '/warehouse', permission: 'warehouse' },
  { prefix: '/buying-groups', permission: 'buying_groups' },
  { prefix: '/distributors', permission: 'distributors' },
  { prefix: '/payout-hub', permission: 'payout_hub' },
  { prefix: '/policies', permission: 'policies' },
  { prefix: '/ndc-pricing', permission: 'ndc_pricing' },
  { prefix: '/settings', permission: 'settings' },
  { prefix: '/sub-admins', permission: 'sub_admins', mainAdminOnly: true },
];

export const ALLOWED_DESTINATIONS: AllowedDestination[] = [
  { href: '/', permission: 'dashboard' },
  { href: '/buying-groups', permission: 'buying_groups' },
  { href: '/distributors', permission: 'distributors' },
  { href: '/warehouse', permission: 'warehouse' },
  { href: '/payout-hub', permission: 'payout_hub' },
  { href: '/policies', permission: 'policies' },
  { href: '/ndc-pricing', permission: 'ndc_pricing' },
  { href: '/warehouse/tbd-items', permission: 'tbd_items' },
  { href: '/warehouse/destruction', permission: 'destruction' },
  { href: '/settings', permission: 'settings' },
  { href: '/sub-admins', permission: 'sub_admins', mainAdminOnly: true },
];

export function isMainAdminRole(role?: string | null) {
  return role === 'main_admin' || !role;
}

export function getUserPermissions(user?: PermissionUser | null) {
  return Array.isArray(user?.permissions) ? user.permissions : [];
}

export function hasPermissionForUser(user: PermissionUser | null | undefined, permission: PermissionKey | string) {
  if (isMainAdminRole(user?.role)) return true;
  return getUserPermissions(user).includes(permission);
}

function matchesRoute(pathname: string, rule: RoutePermission) {
  if (rule.exact) return pathname === rule.prefix;
  return pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`);
}

export function getRoutePermission(pathname: string) {
  return ROUTE_PERMISSIONS.find((rule) => matchesRoute(pathname, rule)) || null;
}

export function canAccessRoute(user: PermissionUser | null | undefined, pathname: string) {
  const rule = getRoutePermission(pathname);
  if (!rule) return true;
  if (isMainAdminRole(user?.role)) return true;
  if (rule.mainAdminOnly) return false;
  return hasPermissionForUser(user, rule.permission);
}

export function getFirstAllowedPath(user: PermissionUser | null | undefined) {
  if (isMainAdminRole(user?.role)) return '/';

  const permissions = getUserPermissions(user);
  const destination = ALLOWED_DESTINATIONS.find((item) => {
    if (item.mainAdminOnly) return false;
    return permissions.includes(item.permission);
  });

  return destination?.href || null;
}
