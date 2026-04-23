/**
 * Ordered dashboard routes — must stay in sync with Sidebar nav order.
 * Used to pick the first page a user may open after login or when a route is forbidden.
 */
export function getFirstAllowedDashboardPath(args: {
  grantAll: boolean
  isParent: boolean
  effectivePermissions: string[]
}): string | null {
  const { grantAll, isParent, effectivePermissions } = args
  const permSet = new Set(effectivePermissions)
  const has = (key: string) => grantAll || permSet.has(key)
  const hasAny = (keys: string[]) => grantAll || keys.some((k) => permSet.has(k))

  const rows: { href: string; visible: boolean }[] = [
    { href: '/returns', visible: hasAny(['returns:view', 'returns:create']) },
    { href: '/returns/create', visible: has('returns:create') },
    { href: '/returns/tbd-items', visible: has('tbd_items:view') },
    { href: '/returns/destruction', visible: has('destruction:view') },
    { href: '/wine-cellar', visible: has('wine_cellar:view') },
    { href: '/on-site-service', visible: hasAny(['on_site_service:view', 'on_site_service:create']) },
    // { href: '/products', visible: has('products:view') },
    // { href: '/optimization', visible: has('optimization:view') },
    // { href: '/marketplace', visible: has('marketplace:view') },
    // { href: '/orders', visible: has('orders:view') },
    // { href: '/inventory-analysis', visible: has('inventory_analysis:view') },
    { href: '/credits', visible: has('credits:view') },
    { href: '/payments', visible: has('payments:view') },
    { href: '/analytics', visible: has('analytics:view') },
    // { href: '/upload', visible: has('documents:upload') },
    { href: '/branches', visible: grantAll ? false : isParent },
    { href: '/roles', visible: grantAll ? false : isParent },
    { href: '/settings', visible: has('settings:view') },
    // { href: '/subscription', visible: has('subscription:view') },
  ]

  for (const row of rows) {
    if (row.visible) return row.href
  }
  return null
}
