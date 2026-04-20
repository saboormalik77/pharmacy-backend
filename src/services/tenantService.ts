import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';

export interface TenantInfo {
  buyingGroupId: string;
  domain: string;
  portalType: 'admin' | 'pharmacy' | 'unknown';
  isActive: boolean;
  buyingGroupName: string;
}

// In-memory cache (TTL: 5 minutes) — keeps hostname lookups cheap on hot paths.
// Cache key includes the role hint so that the same hostname can resolve to
// different portal types (admin vs pharmacy) depending on the caller.
const cache = new Map<string, { data: TenantInfo; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Returns true only when the server is NOT running in production AND the
 * hostname looks like a local dev host. In production we never honour this
 * bypass — even if a caller tries to spoof `X-Tenant-Domain: localhost`.
 */
export const isLocalDev = (hostname: string): boolean => {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  const h = (hostname || '').toLowerCase().trim();
  return h === 'localhost' || h === '127.0.0.1' || h.endsWith('.localhost');
};

/**
 * Resolve a hostname to its buying group and portal type via RPC.
 * Returns null for localhost (no enforcement in dev).
 *
 * @param hostname - Incoming request hostname.
 * @param roleHint - Optional 'admin' | 'pharmacy' sent by the calling portal.
 *                   When a single domain is shared between both portals the hint
 *                   is the only way to determine which portalType to return.
 */
export const resolveTenant = async (
  hostname: string,
  roleHint?: 'admin' | 'pharmacy'
): Promise<TenantInfo | null> => {
  const normalizedHost = (hostname || '').toLowerCase().trim();

  if (!normalizedHost) return null;

  if (isLocalDev(normalizedHost)) {
    return null;
  }

  // Include the role hint in the cache key so admin and pharmacy portals that
  // share the same hostname get independent cache entries.
  const cacheKey = roleHint ? `${normalizedHost}::${roleHint}` : normalizedHost;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  if (!supabaseAdmin) {
    throw new AppError('Database not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc(
    'resolve_domain_to_buying_group',
    { p_hostname: normalizedHost, p_role_hint: roleHint ?? null }
  );

  if (error) {
    throw new AppError('Failed to resolve domain', 500);
  }

  let rpcResult = data as any;

  // If the RPC doesn't find the domain, fall back to a direct query.
  // When a roleHint is provided, only match the corresponding column:
  //   - admin  -> admin_hostname
  //   - pharmacy -> pharmacy_hostname
  // Without a hint, match any of admin_hostname, pharmacy_hostname, or domain.
  if (!rpcResult || rpcResult.error) {
    let orFilter: string;
    if (roleHint === 'admin') {
      orFilter = `admin_hostname.eq.${normalizedHost}`;
    } else if (roleHint === 'pharmacy') {
      orFilter = `pharmacy_hostname.eq.${normalizedHost}`;
    } else {
      orFilter = `admin_hostname.eq.${normalizedHost},pharmacy_hostname.eq.${normalizedHost},domain.eq.${normalizedHost}`;
    }

    const { data: rows, error: dbErr } = await supabaseAdmin
      .from('buying_group_domains')
      .select('buying_group_id, domain, admin_hostname, pharmacy_hostname, is_active')
      .eq('is_active', true)
      .or(orFilter)
      .limit(1);

    if (dbErr || !rows || rows.length === 0) {
      throw new AppError('Domain not recognized. Access denied.', 403);
    }

    const row = rows[0] as any;

    const { data: adminRows } = await supabaseAdmin
      .from('admin')
      .select('name, is_active')
      .eq('id', row.buying_group_id)
      .limit(1);

    const adminRow = adminRows && adminRows[0] as any;
    if (!adminRow || !adminRow.is_active) {
      throw new AppError('Domain not recognized. Access denied.', 403);
    }

    // Determine portal type: use the roleHint if provided, otherwise infer from matched column.
    let portalType: 'admin' | 'pharmacy' | 'unknown' = 'unknown';
    if (roleHint === 'admin') {
      portalType = 'admin';
    } else if (roleHint === 'pharmacy') {
      portalType = 'pharmacy';
    } else if (row.admin_hostname && normalizedHost === row.admin_hostname.toLowerCase()) {
      portalType = 'admin';
    } else if (row.pharmacy_hostname && normalizedHost === row.pharmacy_hostname.toLowerCase()) {
      portalType = 'pharmacy';
    }

    rpcResult = {
      error: false,
      data: {
        buying_group_id: row.buying_group_id,
        domain: row.domain,
        portal_type: portalType,
        is_active: row.is_active,
        buying_group_name: adminRow.name,
      },
    };
  } else if (rpcResult && !rpcResult.error && rpcResult.data && roleHint) {
    // RPC succeeded — if the caller sent a role hint, override the portal_type
    // so that a shared domain resolves correctly for each portal.
    rpcResult = {
      ...rpcResult,
      data: {
        ...rpcResult.data,
        portal_type: roleHint,
      },
    };
  }

  const result = rpcResult;
  if (!result || result.error) {
    throw new AppError(result?.message || 'Domain not recognized. Access denied.', 403);
  }

  const tenantInfo: TenantInfo = {
    buyingGroupId: result.data.buying_group_id,
    domain: result.data.domain,
    portalType: result.data.portal_type,
    isActive: result.data.is_active,
    buyingGroupName: result.data.buying_group_name,
  };

  cache.set(cacheKey, {
    data: tenantInfo,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return tenantInfo;
};

/**
 * Extract hostname from the incoming request.
 * Priority: X-Tenant-Domain header -> Origin header -> Host header
 */
export const extractHostname = (req: {
  headers: Record<string, string | string[] | undefined>;
}): string => {
  const tenantDomain = req.headers['x-tenant-domain'];
  if (tenantDomain && typeof tenantDomain === 'string') {
    return tenantDomain.replace(/^https?:\/\//, '').split(':')[0].toLowerCase().trim();
  }

  const origin = req.headers['origin'];
  if (origin && typeof origin === 'string') {
    try {
      return new URL(origin).hostname.toLowerCase().trim();
    } catch { /* fall through */ }
  }

  const host = req.headers['host'];
  if (host && typeof host === 'string') {
    return host.split(':')[0].toLowerCase().trim();
  }

  return '';
};
