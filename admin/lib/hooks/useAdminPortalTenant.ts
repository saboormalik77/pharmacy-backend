'use client';

import { useState, useEffect, useLayoutEffect } from 'react';

export interface AdminTenantInfo {
  buyingGroupId: string;
  domain: string;
  portalType: 'admin' | 'pharmacy' | 'unknown';
  isActive: boolean;
  buyingGroupName: string;
}

interface TenantState {
  checked: boolean;
  error: string | null;
  tenant: AdminTenantInfo | null;
}

// Module-level cache so TenantGate and individual pages don't duplicate the fetch.
let cachedState: TenantState | null = null;
let inflight: Promise<TenantState> | null = null;

const isLocalHostname = (h: string): boolean =>
  h === 'localhost' || h === '127.0.0.1' || h.endsWith('.localhost');

async function loadAdminTenant(): Promise<TenantState> {
  if (cachedState) return cachedState;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const resp = await apiClient.get<{
        status: string;
        data: { isLocalDev: boolean; tenant: AdminTenantInfo | null };
      }>('/auth/tenant-info', false);

      const tenant = resp?.data?.tenant ?? null;
      if (!tenant) {
        cachedState = {
          checked: true,
          error: 'This domain is not registered for any buying group.',
          tenant: null,
        };
      } else if (tenant.portalType !== 'admin') {
        cachedState = {
          checked: true,
          error: 'This domain is not configured for admin access.',
          tenant: null,
        };
      } else {
        cachedState = { checked: true, error: null, tenant };
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : 'Unable to verify this domain. Access denied.';
      cachedState = { checked: true, error: message, tenant: null };
    } finally {
      inflight = null;
    }
    return cachedState!;
  })();

  return inflight;
}

/**
 * Tenant resolver for the Buying Group admin portal.
 * - localhost / 127.0.0.1 / *.localhost → skip API, no enforcement
 * - otherwise → GET /auth/tenant-info, must be portalType `admin`
 *
 * Uses a module-level cache, so the global <TenantGate /> and any per-page
 * consumer share the same result without re-fetching.
 */
export function useAdminPortalTenant() {
  const [tenantChecked, setTenantChecked] = useState<boolean>(
    () => !!cachedState
  );
  const [tenantError, setTenantError] = useState<string | null>(
    () => cachedState?.error ?? null
  );
  const [validTenant, setValidTenant] = useState<AdminTenantInfo | null>(
    () => cachedState?.tenant ?? null
  );

  useLayoutEffect(() => {
    const h =
      typeof window !== 'undefined' ? window.location.hostname : '';
    if (isLocalHostname(h)) {
      setTenantChecked(true);
      return;
    }
    if (cachedState) {
      setTenantChecked(cachedState.checked);
      setTenantError(cachedState.error);
      setValidTenant(cachedState.tenant);
    }
  }, []);

  useEffect(() => {
    const h =
      typeof window !== 'undefined' ? window.location.hostname : '';
    if (isLocalHostname(h)) {
      setTenantChecked(true);
      return;
    }
    if (cachedState) {
      setTenantChecked(cachedState.checked);
      setTenantError(cachedState.error);
      setValidTenant(cachedState.tenant);
      return;
    }

    let mounted = true;
    loadAdminTenant().then((state) => {
      if (!mounted) return;
      setTenantChecked(state.checked);
      setTenantError(state.error);
      setValidTenant(state.tenant);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const hostname =
    typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocalHost = isLocalHostname(hostname);

  return { tenantChecked, tenantError, validTenant, isLocalHost };
}
