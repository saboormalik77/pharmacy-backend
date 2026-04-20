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
 */
export const resolveTenant = async (hostname: string): Promise<TenantInfo | null> => {
  const normalizedHost = (hostname || '').toLowerCase().trim();

  if (!normalizedHost) return null;

  if (isLocalDev(normalizedHost)) {
    return null;
  }

  const cached = cache.get(normalizedHost);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  if (!supabaseAdmin) {
    throw new AppError('Database not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc(
    'resolve_domain_to_buying_group',
    { p_hostname: normalizedHost }
  );

  if (error) {
    throw new AppError('Failed to resolve domain', 500);
  }

  const result = data as any;
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

  cache.set(normalizedHost, {
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
