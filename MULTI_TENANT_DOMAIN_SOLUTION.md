# Multi-Tenant Domain-Based Access Control — Solution Document

> **Author:** AI Analysis  
> **Date:** April 16, 2026  
> **Status:** Proposal / Ready for Review  
> **Scope:** Buying Group domain isolation, Pharmacy subdomain access

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Architecture Analysis](#2-current-architecture-analysis)
3. [Requirement Breakdown](#3-requirement-breakdown)
4. [Proposed Solution](#4-proposed-solution)
5. [Database Changes](#5-database-changes)
6. [Backend API Changes](#6-backend-api-changes)
7. [Frontend Changes — Admin App (Buying Group + Processor Portal)](#7-frontend-changes--admin-app-buying-group--processor-portal)
8. [Frontend Changes — Pharmacy Portal](#8-frontend-changes--pharmacy-portal)
9. [MainAdmin Changes](#9-mainadmin-changes)
10. [Local Development Strategy](#10-local-development-strategy)
11. [Deployment Strategy](#11-deployment-strategy)
12. [CORS & Security](#12-cors--security)
13. [Step-by-Step Implementation Plan](#13-step-by-step-implementation-plan)
14. [Edge Cases & Considerations](#14-edge-cases--considerations)
15. [Testing Checklist](#15-testing-checklist)

---

## 1. Executive Summary

### The Goal

Each **Buying Group** gets its own domain (e.g., `abc.com`, `xyz.com`). The buying group's **Admin users** and **Processors** both log in on that same domain (both use the `admin/` portal). The buying group's dependent **Pharmacies** access the system through a subdomain (e.g., `pharmacy.abc.com`). Users of one buying group **cannot** log in on another buying group's domain. The **MainAdmin** portal remains a single, separate deployment.

### The Portal-to-Codebase Map

| Portal | Codebase Folder | Who Logs In | Domain Example |
|--------|----------------|-------------|----------------|
| **Buying Group Admin + Processor** | `admin/` | Admin (super_admin, manager, reviewer, support) + Processor (role=processor) | `abc.com` |
| **Pharmacy** | `Frontend/` | Pharmacy users (Supabase Auth) | `pharmacy.abc.com` |
| **MainAdmin** | `MainAdmin/` | Main admins + sub-main-admins | `mainadmin.yoursystem.com` (single, no domain isolation) |

### The Approach

Deploy the **same codebase** to all buying group domains and their pharmacy subdomains. Add a **`buying_group_domains`** table to the database that maps domains/subdomains to buying groups. At login time, the system checks the **request's hostname** against the database to determine which buying group the domain belongs to, and restricts login accordingly.

### What Stays the Same

- **MainAdmin** (`MainAdmin/` folder) — single deployment, no changes to its access model
- **Backend API** (`src/`) — single deployment serving all frontends
- **Database** — single Supabase instance, shared across all buying groups
- **No separate processor portal** — processors continue to use the `admin/` app

---

## 2. Current Architecture Analysis

### Current Stack

| Component | Technology | Deployment |
|-----------|-----------|------------|
| **Backend API** | Express + TypeScript | Vercel Serverless (`api/index.ts`) |
| **Admin Portal** (BG Admin + Processors) | Next.js 16 (`admin/`) | Vercel (separate project) |
| **Pharmacy Portal** | Next.js 16 (`Frontend/`) | Vercel (separate project) |
| **MainAdmin** | Next.js 16 (`MainAdmin/`) | Vercel (separate project) |
| **Database** | PostgreSQL via Supabase | Supabase Cloud |

### Current Entity Relationships

```
┌──────────────┐        manages         ┌──────────────────────┐
│  main_admin  │ ─────────────────────> │  admin (role=        │
│              │                         │  super_admin)        │
│  MainAdmin   │                         │  = BUYING GROUP      │
│  Portal      │                         │                      │
└──────────────┘                         └──────────┬───────────┘
                                                    │
                                          created_by│
                                                    │
                                ┌───────────────────┼───────────────────┐
                                │                                       │
                                ▼                                       ▼
                    ┌───────────────────┐               ┌───────────────────────┐
                    │     pharmacy      │               │     processors        │
                    │ (created_by FK    │               │ (admin_user_id FK     │
                    │  → admin.id)      │               │  → admin.id)          │
                    │                   │◄──────────────│ assigned_processor_id │
                    └───────────────────┘               └───────────────────────┘

    Both admin users (all roles) and processors log in through
    the SAME admin/ portal on the buying group's domain.
```

### Current Authentication Flow

| User Type | Login Endpoint | How It Works | Portal |
|-----------|---------------|-------------|--------|
| **BG Admin** (super_admin) | `POST /api/auth/login` | bcrypt vs `admin` table → JWT `type: 'admin'` | `admin/` |
| **BG Sub-admin** (manager, etc.) | `POST /api/auth/login` | Same as above, different role | `admin/` |
| **Processor** | `POST /api/auth/login` | Same JWT, `role: 'processor'` → loads `processors` record | `admin/` |
| **Pharmacy** | `POST /api/auth/signin` | Supabase Auth → custom JWT `sub: pharmacy.id` | `Frontend/` |
| **MainAdmin** | `POST /api/main-admin/auth/login` | bcrypt vs `main_admin`/`sub_main_admin` → JWT `type: 'main_admin'` | `MainAdmin/` |

### What's Missing for Multi-Tenancy

- No domain-to-buying-group mapping in the database
- No domain/origin validation at login time
- No `buying_group_id` on `processors` table (only indirect link via `admin_user_id`)
- No `buying_group_id` on sub-admin `admin` rows (only super_admin is the BG itself)
- No CORS configuration per buying group
- No mechanism to restrict a user's login to a specific domain
- No local development strategy for testing multi-tenant flows

---

## 3. Requirement Breakdown

| # | Requirement | Example |
|---|------------|---------|
| R1 | Each buying group has a **dedicated domain** for admin + processor portal | BG "ABC" → `abc.com` |
| R2 | Pharmacies of a buying group access via **subdomain** | `pharmacy.abc.com` |
| R3 | **No separate processor portal** — processors use the admin portal on the BG domain | Processor logs in at `abc.com` |
| R4 | Users of BG-1 **cannot login** on BG-2's domain | `user@abc.com` blocked on `xyz.com` |
| R5 | Same `admin/` code deployed to all BG domains | Single codebase, multiple deployments |
| R6 | Same `Frontend/` code deployed to all pharmacy subdomains | Single codebase, multiple deployments |
| R7 | Domain-to-BG mapping stored in **database** | MainAdmin configures this |
| R8 | MainAdmin remains a **single deployment** | No domain isolation for MainAdmin |
| R9 | Domains/subdomains created **manually** (DNS + hosting) | Not automated in code |
| R10 | **Local development** must work without real domains | Localhost bypass with configurable BG |

---

## 4. Proposed Solution

### High-Level Architecture

```
                    ┌─────────────────────────────┐
                    │         MAIN ADMIN           │
                    │   mainadmin.yoursystem.com   │
                    │   (Single deployment)        │
                    │   MainAdmin/ code            │
                    └──────────────┬──────────────┘
                                   │ manages buying groups + their domains
                                   ▼
                    ┌─────────────────────────────┐
                    │     SHARED BACKEND API       │
                    │   api.yoursystem.com         │
                    │   (Single deployment)        │
                    │   src/ code on Vercel        │
                    └──────────────┬──────────────┘
                                   │
              ┌────────────────────┼──────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
    ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
    │   BUYING GROUP 1  │  │   BUYING GROUP 2  │  │   BUYING GROUP N  │
    │                   │  │                   │  │                   │
    │  abc.com          │  │  xyz.com          │  │  ...              │
    │  (admin/ code)    │  │  (admin/ code)    │  │  (admin/ code)    │
    │  BG admins +      │  │  BG admins +      │  │  BG admins +      │
    │  Processors login │  │  Processors login │  │  Processors login │
    │                   │  │                   │  │                   │
    │  pharmacy.abc.com │  │  pharmacy.xyz.com │  │  pharmacy....com  │
    │  (Frontend/ code) │  │  (Frontend/ code) │  │  (Frontend/ code) │
    │  Pharmacies login │  │  Pharmacies login │  │  Pharmacies login │
    └───────────────────┘  └───────────────────┘  └───────────────────┘
```

### Per Buying Group: 2 Deployments

For **each buying group**, you need only **2 deployments** of the same code:

| # | Domain | Codebase | Users |
|---|--------|----------|-------|
| 1 | `abc.com` | `admin/` | BG Admin + Processors |
| 2 | `pharmacy.abc.com` | `Frontend/` | Pharmacies |

### How It Works (Login Flow)

```
SCENARIO A: Admin/Processor logs in on abc.com
─────────────────────────────────────────────────
1. User visits abc.com/login
2. Frontend (admin/ app) reads window.location.hostname → "abc.com"
3. User submits email + password
4. Frontend sends POST /api/auth/login with header:
     X-Tenant-Domain: abc.com
5. Backend:
   a. Extracts hostname "abc.com" from X-Tenant-Domain header
   b. Calls RPC resolve_domain_to_buying_group("abc.com")
   c. Gets back: { buying_group_id: "uuid-of-bg-abc", portal_type: "admin" }
   d. Normal admin login: verify email + password against admin table
   e. NEW CHECK: verify the admin user belongs to BG "uuid-of-bg-abc"
      - If super_admin: admin.id must equal buying_group_id
      - If sub-admin/processor: admin.buying_group_id must equal buying_group_id
   f. If mismatch → 403 "You do not have access to this portal"
   g. If match → issue JWT that includes buying_group_id claim
6. Subsequent requests: JWT contains buying_group_id, middleware validates it


SCENARIO B: Pharmacy user logs in on pharmacy.abc.com
─────────────────────────────────────────────────────
1. User visits pharmacy.abc.com/login
2. Frontend (Frontend/ app) reads window.location.hostname → "pharmacy.abc.com"
3. User submits email + password
4. Frontend sends POST /api/auth/signin with header:
     X-Tenant-Domain: pharmacy.abc.com
5. Backend:
   a. Extracts hostname "pharmacy.abc.com"
   b. Calls RPC resolve_domain_to_buying_group("pharmacy.abc.com")
   c. Gets back: { buying_group_id: "uuid-of-bg-abc", portal_type: "pharmacy" }
   d. Normal pharmacy auth: Supabase email/password → get user ID
   e. NEW CHECK: pharmacy.created_by must equal buying_group_id
   f. If mismatch → 403 "You do not have access to this portal"
   g. If match → issue JWT that includes buying_group_id claim
```

---

## 5. Database Changes

### 5.1 New Table: `buying_group_domains`

```sql
-- ============================================================
-- BUYING GROUP DOMAINS TABLE
-- Maps domains/subdomains to buying groups for multi-tenant access control
-- ============================================================

CREATE TABLE IF NOT EXISTS public.buying_group_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- The buying group this domain belongs to (admin.id where role = 'super_admin')
  buying_group_id UUID NOT NULL REFERENCES public.admin(id) ON DELETE CASCADE,
  
  -- The base domain (e.g., "abc.com") — informational, for grouping
  domain VARCHAR(255) NOT NULL UNIQUE,
  
  -- The exact hostname where the admin/ portal is deployed for this buying group
  -- This is where BG admins + processors log in
  -- e.g., "abc.com" or "admin.abc.com"
  admin_hostname VARCHAR(255) DEFAULT NULL,
  
  -- The exact hostname where the Frontend/ (pharmacy) portal is deployed
  -- e.g., "pharmacy.abc.com"
  pharmacy_hostname VARCHAR(255) DEFAULT NULL,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast hostname lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_bgd_admin_hostname 
  ON buying_group_domains(admin_hostname) WHERE admin_hostname IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_bgd_pharmacy_hostname 
  ON buying_group_domains(pharmacy_hostname) WHERE pharmacy_hostname IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bgd_buying_group_id ON buying_group_domains(buying_group_id);
CREATE INDEX IF NOT EXISTS idx_bgd_domain ON buying_group_domains(domain);

-- RLS
ALTER TABLE buying_group_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON buying_group_domains
  FOR ALL USING (true) WITH CHECK (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_bgd_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bgd_updated_at ON buying_group_domains;
CREATE TRIGGER trg_bgd_updated_at
  BEFORE UPDATE ON buying_group_domains
  FOR EACH ROW
  EXECUTE FUNCTION update_bgd_updated_at();
```

**Example data:**

| buying_group_id | domain | admin_hostname | pharmacy_hostname |
|----------------|--------|---------------|-------------------|
| uuid-bg-1 | abc.com | abc.com | pharmacy.abc.com |
| uuid-bg-2 | xyz.com | xyz.com | pharmacy.xyz.com |
| uuid-bg-3 | example.org | admin.example.org | pharmacy.example.org |

### 5.2 Add `buying_group_id` to `admin` Table (For Sub-Admins & Processors)

Currently, buying groups are `admin` rows with `role = 'super_admin'`. Sub-admins (manager, reviewer, support) and processors (`role = 'processor'`) in the same `admin` table need to be explicitly linked to their buying group.

```sql
-- Add buying_group_id to admin table for tenant scoping
ALTER TABLE admin 
  ADD COLUMN IF NOT EXISTS buying_group_id UUID REFERENCES admin(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_admin_buying_group_id ON admin(buying_group_id);

-- Backfill: super_admin rows ARE the buying group, so they point to themselves
UPDATE admin SET buying_group_id = id WHERE role = 'super_admin' AND buying_group_id IS NULL;

-- For existing sub-admins/processors: you must manually assign their buying_group_id
-- to the super_admin they belong to. Example:
-- UPDATE admin SET buying_group_id = 'uuid-of-parent-bg' WHERE id = 'uuid-of-sub-admin';
```

### 5.3 Add `buying_group_id` to `processors` Table

Processors also have a record in the `processors` table (linked via `admin_user_id`). Add direct BG scoping here too for convenience.

```sql
ALTER TABLE processors 
  ADD COLUMN IF NOT EXISTS buying_group_id UUID REFERENCES admin(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_processors_buying_group_id ON processors(buying_group_id);
```

### 5.4 Ensure `pharmacy.created_by` Is Populated

The `pharmacy.created_by` column already exists (references `admin.id`). This is the buying group link for pharmacies. Verify all pharmacies have it set.

```sql
-- Find any pharmacies without a buying group assignment
SELECT id, email, pharmacy_name, created_by 
FROM pharmacy 
WHERE created_by IS NULL;

-- If any are found, assign them to the correct buying group manually
```

### 5.5 RPC: Resolve Hostname to Buying Group

```sql
-- ============================================================
-- RESOLVE HOSTNAME → BUYING GROUP
-- Called by backend to identify which buying group a domain belongs to
-- and which portal type (admin or pharmacy) is being accessed.
-- ============================================================

CREATE OR REPLACE FUNCTION resolve_domain_to_buying_group(p_hostname TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_hostname TEXT;
BEGIN
  v_hostname := LOWER(TRIM(p_hostname));
  
  SELECT jsonb_build_object(
    'buying_group_id', bgd.buying_group_id,
    'domain', bgd.domain,
    'portal_type', 
      CASE
        WHEN v_hostname = bgd.admin_hostname THEN 'admin'
        WHEN v_hostname = bgd.pharmacy_hostname THEN 'pharmacy'
        ELSE 'unknown'
      END,
    'is_active', bgd.is_active,
    'buying_group_name', a.name
  )
  INTO v_result
  FROM buying_group_domains bgd
  JOIN admin a ON a.id = bgd.buying_group_id
  WHERE bgd.is_active = true
    AND a.is_active = true
    AND (
      bgd.admin_hostname = v_hostname
      OR bgd.pharmacy_hostname = v_hostname
    )
  LIMIT 1;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('error', true, 'message', 'Domain not recognized');
  END IF;

  RETURN jsonb_build_object('error', false, 'data', v_result);
END;
$$;

GRANT EXECUTE ON FUNCTION resolve_domain_to_buying_group TO authenticated, anon, service_role;
```

### 5.6 RPC: Manage Buying Group Domains (for MainAdmin)

```sql
-- ============================================================
-- UPSERT a domain config for a buying group (MainAdmin use)
-- ============================================================

CREATE OR REPLACE FUNCTION upsert_buying_group_domain(
  p_buying_group_id UUID,
  p_domain TEXT,
  p_admin_hostname TEXT DEFAULT NULL,
  p_pharmacy_hostname TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin WHERE id = p_buying_group_id AND role = 'super_admin') THEN
    RETURN jsonb_build_object('error', true, 'message', 'Buying group not found');
  END IF;

  INSERT INTO buying_group_domains (buying_group_id, domain, admin_hostname, pharmacy_hostname)
  VALUES (
    p_buying_group_id,
    LOWER(TRIM(p_domain)),
    NULLIF(LOWER(TRIM(p_admin_hostname)), ''),
    NULLIF(LOWER(TRIM(p_pharmacy_hostname)), '')
  )
  ON CONFLICT (domain) DO UPDATE SET
    admin_hostname = COALESCE(NULLIF(LOWER(TRIM(EXCLUDED.admin_hostname)), ''), buying_group_domains.admin_hostname),
    pharmacy_hostname = COALESCE(NULLIF(LOWER(TRIM(EXCLUDED.pharmacy_hostname)), ''), buying_group_domains.pharmacy_hostname),
    updated_at = NOW()
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('error', false, 'message', 'Domain configured', 'id', v_id);
END;
$$;

-- ============================================================
-- GET all domains for a buying group
-- ============================================================

CREATE OR REPLACE FUNCTION get_buying_group_domains(p_buying_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT jsonb_agg(jsonb_build_object(
      'id', bgd.id,
      'domain', bgd.domain,
      'adminHostname', bgd.admin_hostname,
      'pharmacyHostname', bgd.pharmacy_hostname,
      'isActive', bgd.is_active,
      'createdAt', bgd.created_at
    ))
    FROM buying_group_domains bgd
    WHERE bgd.buying_group_id = p_buying_group_id),
    '[]'::jsonb
  );
END;
$$;

-- ============================================================
-- DELETE a domain config
-- ============================================================

CREATE OR REPLACE FUNCTION delete_buying_group_domain(p_domain_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM buying_group_domains WHERE id = p_domain_id;
  RETURN jsonb_build_object('error', false, 'message', 'Domain deleted');
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_buying_group_domain TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_buying_group_domains TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION delete_buying_group_domain TO authenticated, anon, service_role;
```

---

## 6. Backend API Changes

### 6.1 New Service: `src/services/tenantService.ts`

Resolves hostnames to buying groups, with caching and localhost awareness.

```typescript
import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';

export interface TenantInfo {
  buyingGroupId: string;
  domain: string;
  portalType: 'admin' | 'pharmacy' | 'unknown';
  isActive: boolean;
  buyingGroupName: string;
}

// In-memory cache (TTL: 5 minutes)
const cache = new Map<string, { data: TenantInfo; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Check if the current environment is local development.
 */
export const isLocalDev = (hostname: string): boolean => {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.localhost')
  );
};

/**
 * Resolve a hostname to its buying group and portal type.
 * Returns null for localhost when in dev mode (caller decides what to do).
 */
export const resolveTenant = async (hostname: string): Promise<TenantInfo | null> => {
  const normalizedHost = hostname.toLowerCase().trim();

  // LOCAL DEV: skip DB lookup, return null so callers can use dev fallback
  if (isLocalDev(normalizedHost)) {
    return null;
  }

  // Check cache
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
  if (result?.error) {
    throw new AppError('Domain not recognized. Access denied.', 403);
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
 * Priority: X-Tenant-Domain header → Origin header → Host header
 */
export const extractHostname = (req: {
  headers: Record<string, string | string[] | undefined>;
}): string => {
  const tenantDomain = req.headers['x-tenant-domain'];
  if (tenantDomain && typeof tenantDomain === 'string') {
    return tenantDomain.replace(/^https?:\/\//, '').split(':')[0];
  }

  const origin = req.headers['origin'];
  if (origin && typeof origin === 'string') {
    try {
      return new URL(origin).hostname;
    } catch { /* fall through */ }
  }

  const host = req.headers['host'];
  if (host && typeof host === 'string') {
    return host.split(':')[0];
  }

  return '';
};
```

### 6.2 New Middleware: `src/middleware/tenantAuth.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { resolveTenant, extractHostname, TenantInfo, isLocalDev } from '../services/tenantService';
import { AppError } from '../utils/appError';

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantInfo | null;
    }
  }
}

/**
 * Resolves the tenant from the request hostname and attaches to req.tenant.
 *
 * On localhost: req.tenant is set to null (no domain enforcement).
 * On production: req.tenant is set to the resolved TenantInfo or throws 403.
 */
export const resolveTenantMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const hostname = extractHostname(req);

    if (!hostname) {
      throw new AppError('Unable to determine request origin', 400);
    }

    // For localhost, set tenant to null — login proceeds without domain check
    if (isLocalDev(hostname)) {
      req.tenant = null;
      return next();
    }

    const tenant = await resolveTenant(hostname);
    req.tenant = tenant;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Tenant resolution failed', 500));
    }
  }
};
```

### 6.3 Modify Admin Login (`src/services/adminService.ts`)

The `adminLogin` function needs a new optional parameter and a tenant check:

```typescript
// Updated function signature
export const adminLogin = async (
  data: AdminLoginData,
  tenantBuyingGroupId?: string | null  // NEW: passed from route handler
): Promise<AdminAuthResponse> => {

  // ... existing code: fetch admin, check is_active, verify password ...

  // ─── NEW: Tenant-based access control ───
  if (tenantBuyingGroupId) {
    // super_admin IS the buying group — their admin.id must match
    if (adminData.role === 'super_admin') {
      if (adminData.id !== tenantBuyingGroupId) {
        throw new AppError('You do not have access to this portal', 403);
      }
    } else {
      // Sub-admins and processors — their buying_group_id column must match
      if (adminData.buying_group_id !== tenantBuyingGroupId) {
        throw new AppError('You do not have access to this portal', 403);
      }
    }
  }
  // ─── END tenant check ───

  // Determine the buying_group_id to embed in the JWT
  const buyingGroupId = tenantBuyingGroupId
    || adminData.buying_group_id
    || (adminData.role === 'super_admin' ? adminData.id : null);

  const tokenPayload = {
    id: adminData.id,
    email: adminData.email,
    name: adminData.name,
    role: adminData.role,
    permissions,
    type: 'admin',
    buying_group_id: buyingGroupId,  // NEW claim
  };

  // ... rest of existing code (sign JWT, update last_login, return) ...
};
```

### 6.4 Modify Admin Login Handler (`src/controllers/adminController.ts`)

Pass the resolved tenant to the service:

```typescript
export const loginHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Please provide email and password', 400);
    }

    // Pass tenant buying_group_id (null on localhost = no restriction)
    const result = await adminLogin(
      { email, password },
      req.tenant?.buyingGroupId ?? null
    );

    res.status(200).json({
      token: result.token,
      accessToken: result.accessToken,
      access_token: result.access_token,
      user: result.user,
    });
  }
);
```

### 6.5 Modify Pharmacy Login (`src/services/authService.ts`)

Add tenant validation to `signin`:

```typescript
// Updated function signature
export const signin = async (
  data: SigninData,
  tenantBuyingGroupId?: string | null  // NEW
): Promise<SigninResponse> => {

  // ... existing code: Supabase auth, get userId ...

  // ─── NEW: Tenant-based access control ───
  if (tenantBuyingGroupId) {
    const { data: pharmacyRow } = await supabaseAdmin
      .from('pharmacy')
      .select('created_by')
      .eq('id', userId)
      .single();

    if (!pharmacyRow || pharmacyRow.created_by !== tenantBuyingGroupId) {
      throw new AppError('You do not have access to this portal', 403);
    }
  }
  // ─── END tenant check ───

  // ... rest of existing code (status check, generate JWT, etc.) ...
  // Include buying_group_id in the JWT payload
};
```

### 6.6 Modify Pharmacy Login Handler (`src/controllers/authController.ts`)

```typescript
export const signinHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password, fcmToken } = req.body;

    if (!email || !password) {
      throw new AppError('Please provide email and password', 400);
    }

    const result = await signin(
      { email, password, fcmToken },
      req.tenant?.buyingGroupId ?? null
    );

    res.status(200).json({
      status: 'success',
      data: result,
    });
  }
);
```

### 6.7 Update Route Registration (`src/routes/authRoutes.ts`)

```typescript
import { resolveTenantMiddleware } from '../middleware/tenantAuth';

// Add resolveTenantMiddleware BEFORE the login handlers
router.post('/login', resolveTenantMiddleware, loginHandler);
router.post('/signin', resolveTenantMiddleware, signinHandler);
```

### 6.8 Update CORS Configuration (`src/server.ts`)

Replace hardcoded `allowedOrigins` with a dynamic check:

```typescript
import { resolveTenant, isLocalDev } from './services/tenantService';

app.use(cors({
  origin: async (origin, callback) => {
    // Allow requests with no origin (Postman, mobile, curl)
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/$/, '');

    // Always allow localhost
    try {
      const hostname = new URL(normalizedOrigin).hostname;
      if (isLocalDev(hostname)) {
        return callback(null, true);
      }
    } catch { /* fall through */ }

    // Always allow MainAdmin domain
    const mainAdminUrl = process.env.MAIN_ADMIN_URL?.replace(/\/$/, '');
    if (mainAdminUrl && normalizedOrigin === mainAdminUrl) {
      return callback(null, true);
    }

    // Check if hostname is a registered buying group domain
    try {
      const hostname = new URL(normalizedOrigin).hostname;
      const tenant = await resolveTenant(hostname);
      if (tenant) {
        return callback(null, true);
      }
    } catch { /* not recognized */ }

    console.warn(`CORS blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 'Authorization', 'X-Requested-With',
    'Accept', 'Origin', 'X-Tenant-Domain',
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400,
}));
```

### 6.9 New Endpoint: Tenant Info (Public)

A lightweight endpoint frontends call on page load to validate the domain and retrieve branding:

```typescript
// GET /api/auth/tenant-info
// No authentication required

router.get('/tenant-info', resolveTenantMiddleware, async (req, res) => {
  // On localhost: no tenant resolved — return dev mode indicator
  if (!req.tenant) {
    return res.status(200).json({ tenant: null, mode: 'development' });
  }

  res.status(200).json({
    tenant: {
      buyingGroupId: req.tenant.buyingGroupId,
      buyingGroupName: req.tenant.buyingGroupName,
      portalType: req.tenant.portalType,
      domain: req.tenant.domain,
    },
  });
});
```

---

## 7. Frontend Changes — Admin App (Buying Group + Processor Portal)

The `admin/` app serves **both BG admins and processors** on the buying group's domain.

### 7.1 Add `X-Tenant-Domain` Header to API Client

Modify `admin/lib/api/apiClient.ts` to include the hostname on every request:

```typescript
// In the getHeaders() method, add:

if (typeof window !== 'undefined') {
  headers['X-Tenant-Domain'] = window.location.hostname;
}
```

This is the **only required change** in the API client. On localhost, this sends `"localhost"` which the backend recognizes as local dev and skips tenant checks.

### 7.2 Add Next.js Middleware (`admin/middleware.ts`)

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth_token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
```

### 7.3 Fetch Tenant Info on Login Page

On the login page, call the tenant-info endpoint on mount to get branding and validate domain:

```typescript
useEffect(() => {
  const fetchTenantInfo = async () => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const data = await apiClient.get('/auth/tenant-info', false);
      if (data.tenant) {
        setBranding({
          businessName: data.tenant.buyingGroupName,
          logoUrl: null,
        });
      }
      // data.mode === 'development' on localhost → use default branding
    } catch {
      // Domain not recognized on production → block login
      setError('This domain is not configured. Please contact your administrator.');
    }
  };
  fetchTenantInfo();
}, []);
```

On **localhost**, the endpoint returns `{ tenant: null, mode: 'development' }` — the login page shows default branding and allows any admin/processor to log in (no domain restriction).

On **production** (`abc.com`), it returns the buying group name for branding, and the backend login enforces the domain check.

---

## 8. Frontend Changes — Pharmacy Portal

### 8.1 Add `X-Tenant-Domain` Header to API Client

In `Frontend/lib/api/client.ts`, add the same header:

```typescript
if (typeof window !== 'undefined') {
  headers['X-Tenant-Domain'] = window.location.hostname;
}
```

### 8.2 Fetch Tenant Info on Login Page

Same approach as the admin app — call `/api/auth/tenant-info` on mount:

- On **localhost**: returns `{ tenant: null, mode: 'development' }` → default branding, no restriction
- On **`pharmacy.abc.com`**: returns buying group info → show BG branding, backend enforces pharmacy belongs to that BG

### 8.3 No Changes to `Frontend/middleware.ts`

The existing cookie-based route protection in `Frontend/middleware.ts` continues to work as-is. The domain check happens at the **API level**, not the Next.js middleware level.

---

## 9. MainAdmin Changes

### 9.1 No Domain Restriction on MainAdmin

The `MainAdmin/` app does **NOT** go through tenant resolution. It remains a single deployment accessible at its own URL (e.g., `mainadmin.yoursystem.com`). The login endpoint `POST /api/main-admin/auth/login` does **not** use `resolveTenantMiddleware`.

### 9.2 Domain Management UI

Add a **"Domains"** tab or section to the MainAdmin buying group detail page.

**UI Fields:**
- **Base Domain** (required) — e.g., `abc.com`
- **Admin Portal Hostname** — e.g., `abc.com` or `admin.abc.com`
- **Pharmacy Portal Hostname** — e.g., `pharmacy.abc.com`
- **Active** toggle
- Save / Delete buttons

### 9.3 New API Endpoints

```typescript
// In src/routes/mainAdminRoutes.ts

router.get(
  '/buying-groups/:id/domains',
  authenticateMainAdmin,
  getDomainsHandler
);

router.post(
  '/buying-groups/:id/domains',
  authenticateMainAdmin,
  upsertDomainHandler
);

router.delete(
  '/buying-groups/:id/domains/:domainId',
  authenticateMainAdmin,
  deleteDomainHandler
);
```

### 9.4 New Controllers

```typescript
// In src/controllers/mainAdminController.ts

export const getDomainsHandler = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabaseAdmin.rpc('get_buying_group_domains', {
    p_buying_group_id: id,
  });
  if (error) throw new AppError('Failed to fetch domains', 500);
  res.json({ domains: data });
});

export const upsertDomainHandler = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { domain, adminHostname, pharmacyHostname } = req.body;
  const { data, error } = await supabaseAdmin.rpc('upsert_buying_group_domain', {
    p_buying_group_id: id,
    p_domain: domain,
    p_admin_hostname: adminHostname,
    p_pharmacy_hostname: pharmacyHostname,
  });
  if (error) throw new AppError('Failed to save domain', 500);
  const result = data as any;
  if (result?.error) throw new AppError(result.message, 400);
  res.json(result);
});

export const deleteDomainHandler = catchAsync(async (req, res) => {
  const { domainId } = req.params;
  const { data, error } = await supabaseAdmin.rpc('delete_buying_group_domain', {
    p_domain_id: domainId,
  });
  if (error) throw new AppError('Failed to delete domain', 500);
  res.json(data);
});
```

---

## 10. Local Development Strategy

This is the most critical section for day-to-day developer experience. **All three portals run on localhost with different ports, and everything must work without any domain configuration.**

### 10.1 The Problem

Locally, all apps run on `localhost`:

| App | Local URL |
|-----|-----------|
| Backend API | `http://localhost:3000` |
| Admin Portal (`admin/`) | `http://localhost:3002` |
| Pharmacy Portal (`Frontend/`) | `http://localhost:3001` |
| MainAdmin (`MainAdmin/`) | `http://localhost:3003` |

There is no `abc.com` or `pharmacy.abc.com` — just `localhost` with different ports. We need a way to:

1. **Skip domain enforcement** so any user can log in
2. **Optionally test domain enforcement** when needed
3. **Require zero extra setup** for normal development

### 10.2 Solution: Automatic Localhost Bypass (Default Behavior)

The backend automatically detects `localhost` / `127.0.0.1` and **skips all tenant checks**:

```
Request from localhost:3002
  → extractHostname() returns "localhost"
  → resolveTenantMiddleware sets req.tenant = null
  → adminLogin receives tenantBuyingGroupId = null
  → tenant check is skipped entirely
  → login succeeds for ANY admin user regardless of buying group
```

**This means:**
- On localhost, any admin/processor/pharmacy can log in on any port — no restrictions
- No `.env` changes needed, no extra configuration
- Existing development workflow is **completely unchanged**

### 10.3 Solution: Optional Local Domain Testing (When You Want to Test Isolation)

When a developer wants to **test domain-based isolation locally**, they can use the system's `/etc/hosts` file to simulate real domains:

**Step 1: Edit `/etc/hosts`**

```bash
# Add to /etc/hosts (Linux/Mac) or C:\Windows\System32\drivers\etc\hosts (Windows)
127.0.0.1   local-abc.test
127.0.0.1   pharmacy.local-abc.test
127.0.0.1   local-xyz.test
127.0.0.1   pharmacy.local-xyz.test
```

**Step 2: Insert test domain records into the database**

```sql
-- Assuming BG "ABC" has admin.id = 'uuid-bg-abc'
INSERT INTO buying_group_domains (buying_group_id, domain, admin_hostname, pharmacy_hostname)
VALUES 
  ('uuid-bg-abc', 'local-abc.test', 'local-abc.test', 'pharmacy.local-abc.test'),
  ('uuid-bg-xyz', 'local-xyz.test', 'local-xyz.test', 'pharmacy.local-xyz.test');
```

**Step 3: Run the apps normally but access via the test domains**

```bash
# Admin portal (port 3002) — access as:
http://local-abc.test:3002/login

# Pharmacy portal (port 3001) — access as:
http://pharmacy.local-abc.test:3001/login

# Backend API (port 3000) — stays on localhost:3000
# The X-Tenant-Domain header carries the test domain
```

**Step 4: The backend now enforces domain checks**

Because the hostname is `local-abc.test` (not `localhost`), the tenant middleware resolves it against the database and enforces the buying group check.

**Important:** The `isLocalDev()` function only bypasses for `localhost` and `127.0.0.1`, NOT for `.test` domains. So `.test` domains get full enforcement.

### 10.4 How It Works Per Environment

| Hostname | `isLocalDev()` | Tenant Check | Use Case |
|----------|----------------|-------------|----------|
| `localhost` | `true` | **Skipped** (req.tenant = null) | Normal daily development |
| `127.0.0.1` | `true` | **Skipped** (req.tenant = null) | Normal daily development |
| `local-abc.test` | `false` | **Enforced** (DB lookup) | Testing domain isolation locally |
| `pharmacy.local-abc.test` | `false` | **Enforced** (DB lookup) | Testing pharmacy subdomain locally |
| `abc.com` | `false` | **Enforced** (DB lookup) | Production |
| `pharmacy.abc.com` | `false` | **Enforced** (DB lookup) | Production |

### 10.5 Optional: `.env` Override for Development Testing

For an even simpler local testing option (without `/etc/hosts`), add an optional env var that forces a specific buying group:

```bash
# .env.local (backend)
DEV_FORCE_BUYING_GROUP_ID=uuid-of-bg-abc
```

```typescript
// In resolveTenantMiddleware, after the localhost check:

if (isLocalDev(hostname)) {
  const forcedBgId = process.env.DEV_FORCE_BUYING_GROUP_ID;
  if (forcedBgId) {
    // Simulate being on a specific buying group's domain
    req.tenant = {
      buyingGroupId: forcedBgId,
      domain: 'localhost',
      portalType: 'admin', // or read from DEV_FORCE_PORTAL_TYPE
      isActive: true,
      buyingGroupName: 'Dev Buying Group',
    };
  } else {
    req.tenant = null; // No enforcement
  }
  return next();
}
```

This way:
- `DEV_FORCE_BUYING_GROUP_ID` not set → no domain check (default)
- `DEV_FORCE_BUYING_GROUP_ID` set → simulates being on that BG's domain

### 10.6 Development Testing Decision Tree

```
Q: Do you need to test domain-based login isolation?

  NO (normal development):
    → Just run apps on localhost as usual
    → All logins work, no restrictions
    → No configuration needed

  YES (testing multi-tenant isolation):
    → OPTION A (quick): Set DEV_FORCE_BUYING_GROUP_ID in .env.local
      → Simulates one specific BG domain
      → Easy to toggle on/off

    → OPTION B (full simulation): Edit /etc/hosts + add DB records
      → Test multiple BGs simultaneously
      → Closest to production behavior
      → Can test cross-tenant blocking
```

---

## 11. Deployment Strategy

### 11.1 Backend API — Single Deployment (No Change)

The Express API remains a **single Vercel deployment**. All frontends from all domains call this same API. The API uses the `X-Tenant-Domain` header to identify tenants.

```
api.yoursystem.com  →  Single Vercel project (root vercel.json)
```

### 11.2 Admin Portal — Per Buying Group

Each buying group domain gets a deployment of the `admin/` code. The **only difference** between deployments is the `NEXT_PUBLIC_API_URL` environment variable.

```
abc.com     →  Vercel project "bg-abc"      NEXT_PUBLIC_API_URL=https://api.yoursystem.com/api
xyz.com     →  Vercel project "bg-xyz"      NEXT_PUBLIC_API_URL=https://api.yoursystem.com/api
```

**Preferred approach (fewer projects):** Deploy `admin/` once as a single Vercel project, then add **multiple custom domains** to that project in the Vercel dashboard. Vercel supports this natively — one project, many domains, same code.

### 11.3 Pharmacy Portal — Per Buying Group

```
pharmacy.abc.com  →  Vercel project "pharmacies"  NEXT_PUBLIC_API_URL=https://api.yoursystem.com/api
pharmacy.xyz.com  →  (same project, second custom domain)
```

Same approach: deploy `Frontend/` once, add all pharmacy subdomains as custom domains.

### 11.4 MainAdmin — Single Deployment (No Change)

```
mainadmin.yoursystem.com  →  Vercel project "main-admin"
```

### 11.5 DNS Setup (Manual, Per Buying Group)

For each new buying group:

```
# Step 1: DNS records (at the buying group's domain registrar)
abc.com                CNAME  →  cname.vercel-dns.com
pharmacy.abc.com       CNAME  →  cname.vercel-dns.com

# Step 2: Add custom domains in Vercel project dashboards
#   - Add "abc.com" to the admin Vercel project
#   - Add "pharmacy.abc.com" to the pharmacy Vercel project

# Step 3: Insert domain records in the database (via MainAdmin UI)
#   - domain: abc.com
#   - admin_hostname: abc.com
#   - pharmacy_hostname: pharmacy.abc.com
#   - buying_group_id: (the BG's admin UUID)
```

### 11.6 Summary: What You Deploy Per Buying Group

| Action | One-Time or Per BG |
|--------|-------------------|
| Deploy `admin/` code | One-time (single Vercel project) |
| Deploy `Frontend/` code | One-time (single Vercel project) |
| Deploy backend API | One-time (single Vercel project) |
| Deploy MainAdmin | One-time (single Vercel project) |
| Add custom domain to Vercel (admin) | **Per buying group** |
| Add custom domain to Vercel (pharmacy) | **Per buying group** |
| Create DNS records | **Per buying group** |
| Insert DB domain record | **Per buying group** (via MainAdmin UI) |

---

## 12. CORS & Security

### 12.1 Dynamic CORS

As shown in section 6.8, CORS dynamically checks the `buying_group_domains` table. Any registered hostname is allowed. Localhost is always allowed.

### 12.2 JWT Contains Buying Group ID

After implementation, JWTs include a `buying_group_id` claim. This allows any downstream middleware to verify tenant scope without an extra DB call.

### 12.3 Request Validation Chain

```
Request arrives at backend API
  │
  ├─ CORS check (dynamic: localhost always allowed, production domains checked against DB)
  │
  ├─ resolveTenantMiddleware (on login routes)
  │     ├─ localhost → req.tenant = null (no enforcement)
  │     └─ production → req.tenant = { buyingGroupId, portalType, ... }
  │
  ├─ Login handler
  │     ├─ req.tenant is null → proceed without BG check (localhost)
  │     └─ req.tenant has buyingGroupId → verify user belongs to that BG
  │           ├─ Match → issue JWT with buying_group_id
  │           └─ Mismatch → 403 "Access denied"
  │
  └─ Subsequent authenticated requests
        └─ JWT.buying_group_id is trusted (signed, tamper-proof)
```

### 12.4 Preventing Cross-Tenant Access

Even if a user has a valid JWT from BG-1 and tries to use it on BG-2's domain:
- On login: the domain check prevents getting a token for the wrong BG
- On API calls: the JWT's `buying_group_id` is trusted and scopes all queries

For extra security on data-fetching routes (not just login), you can add `resolveTenantMiddleware` and compare `req.tenant.buyingGroupId` with the JWT's `buying_group_id`. But this is optional — the login-time check is the primary gate.

---

## 13. Step-by-Step Implementation Plan

### Phase 1: Database Foundation (Day 1–2)

- [ ] Create `buying_group_domains` table
- [ ] Add `buying_group_id` column to `admin` table
- [ ] Backfill `admin.buying_group_id` — super_admins point to themselves
- [ ] Assign `buying_group_id` for existing sub-admins and processor admin rows
- [ ] Add `buying_group_id` column to `processors` table
- [ ] Backfill `processors.buying_group_id` for existing processors
- [ ] Verify all pharmacies have `created_by` populated
- [ ] Create `resolve_domain_to_buying_group` RPC function
- [ ] Create `upsert_buying_group_domain` RPC function
- [ ] Create `get_buying_group_domains` RPC function
- [ ] Create `delete_buying_group_domain` RPC function

### Phase 2: Backend — Tenant Service & Middleware (Day 2–3)

- [ ] Create `src/services/tenantService.ts`
- [ ] Create `src/middleware/tenantAuth.ts`
- [ ] Add `resolveTenantMiddleware` to `POST /api/auth/login` route
- [ ] Add `resolveTenantMiddleware` to `POST /api/auth/signin` route
- [ ] Modify `adminLogin()` — add `tenantBuyingGroupId` parameter + validation
- [ ] Modify `loginHandler` — pass `req.tenant?.buyingGroupId` to `adminLogin()`
- [ ] Modify `signin()` — add `tenantBuyingGroupId` parameter + validation
- [ ] Modify `signinHandler` — pass `req.tenant?.buyingGroupId` to `signin()`
- [ ] Add `buying_group_id` to JWT payloads (admin, pharmacy)
- [ ] Create `GET /api/auth/tenant-info` endpoint
- [ ] Test on localhost: confirm all logins work without domain checks

### Phase 3: Backend — CORS & Security (Day 3)

- [ ] Update `server.ts` CORS to be dynamic
- [ ] Add `X-Tenant-Domain` to CORS `allowedHeaders`
- [ ] Keep `MAIN_ADMIN_URL` in allowed origins
- [ ] Test CORS: localhost allowed, registered domains allowed, unknown domains blocked

### Phase 4: Frontend — Admin App (Day 4)

- [ ] Add `X-Tenant-Domain` header to `admin/lib/api/apiClient.ts`
- [ ] Create `admin/middleware.ts` for route protection
- [ ] Update login page to call `/api/auth/tenant-info` on mount
- [ ] Display buying group branding from tenant info
- [ ] On localhost: show default branding, login works for everyone
- [ ] On production domain: show BG branding, login restricted to that BG's users

### Phase 5: Frontend — Pharmacy Portal (Day 4–5)

- [ ] Add `X-Tenant-Domain` header to `Frontend/lib/api/client.ts`
- [ ] Update pharmacy login page to call `/api/auth/tenant-info` on mount
- [ ] On localhost: default branding, all pharmacies can log in
- [ ] On production subdomain: BG branding, only that BG's pharmacies can log in

### Phase 6: MainAdmin — Domain Management UI (Day 5–6)

- [ ] Add domain management API endpoints to `mainAdminRoutes.ts`
- [ ] Add domain management controllers
- [ ] Build domain configuration UI in MainAdmin buying group detail page
- [ ] Allow MainAdmin to add/edit/remove domain configs per buying group
- [ ] Test: create a domain record, verify it resolves correctly

### Phase 7: Deployment & DNS (Day 7)

- [ ] Deploy updated backend API
- [ ] Deploy updated `admin/` app
- [ ] Deploy updated `Frontend/` app
- [ ] Set up first buying group's DNS records
- [ ] Add custom domains in Vercel
- [ ] Insert domain records via MainAdmin UI
- [ ] End-to-end test on real domains

### Phase 8: Testing & Hardening (Day 8)

- [ ] Run full test checklist (section 15)
- [ ] Test local dev: localhost bypass works
- [ ] Test local dev: `/etc/hosts` domain simulation works
- [ ] Security audit: cross-tenant access attempts
- [ ] Performance: tenant resolution caching
- [ ] Error handling: invalid domains, deactivated domains

---

## 14. Edge Cases & Considerations

### 14.1 Sub-Admins of a Buying Group

With the new `admin.buying_group_id` column, when a buying group super_admin creates a sub-admin (manager, reviewer, etc.), the system must set `buying_group_id` to the super_admin's ID. Update the admin creation flow to do this automatically.

### 14.2 Processor Creation

When a processor is created for a buying group, both `admin.buying_group_id` and `processors.buying_group_id` must be set. Update the processor creation flow.

### 14.3 A Pharmacy Moving Between Buying Groups

Update `pharmacy.created_by` to the new buying group's ID. The pharmacy can then only log in on the new BG's subdomain.

### 14.4 Multiple Domains Per Buying Group

The schema supports multiple rows per `buying_group_id`. A BG could have both `abc.com` and `abc.org`, each with their own pharmacy subdomain.

### 14.5 Caching

The `resolveTenant` function caches results in memory for 5 minutes. On Vercel serverless, each function instance has its own cache. For most use cases this is fine since:
- Domain configs rarely change
- Cache miss just means one extra DB call
- For frequent changes, add a `POST /api/admin/cache/clear` endpoint callable from MainAdmin

### 14.6 What If a Domain Record Is Missing?

If someone deploys the admin app to `newdomain.com` but forgets to add the DB record:
- The login page calls `/api/auth/tenant-info` → gets a 403
- The login page shows: "This domain is not configured. Please contact your administrator."
- No user can log in until the MainAdmin adds the domain record

---

## 15. Testing Checklist

### Local Development Tests (localhost)

| Test | Expected Result |
|------|----------------|
| Admin login on `localhost:3002` | Success — any admin can log in |
| Processor login on `localhost:3002` | Success — any processor can log in |
| Pharmacy login on `localhost:3001` | Success — any pharmacy can log in |
| MainAdmin login on `localhost:3003` | Success — unchanged |
| `GET /api/auth/tenant-info` from localhost | `{ tenant: null, mode: "development" }` |

### Local Domain Simulation Tests (`/etc/hosts` method)

| Test | Expected Result |
|------|----------------|
| BG-1 admin on `local-abc.test:3002` | Success |
| BG-2 admin on `local-abc.test:3002` | **403 — Access denied** |
| BG-1 pharmacy on `pharmacy.local-abc.test:3001` | Success |
| BG-2 pharmacy on `pharmacy.local-abc.test:3001` | **403 — Access denied** |

### Production Login Isolation Tests

| Test | Expected Result |
|------|----------------|
| BG-1 admin logs in on `abc.com` | Success |
| BG-1 admin logs in on `xyz.com` | **403 — Access denied** |
| BG-1 processor logs in on `abc.com` | Success |
| BG-1 processor logs in on `xyz.com` | **403 — Access denied** |
| BG-2 pharmacy logs in on `pharmacy.abc.com` | **403 — Access denied** |
| BG-1 pharmacy logs in on `pharmacy.abc.com` | Success |
| MainAdmin logs in on `mainadmin.yoursystem.com` | Success (no tenant check) |
| Unknown domain `random.com` | **403 — Domain not recognized** |

### Security Tests

| Test | Expected Result |
|------|----------------|
| Tampered JWT (BG-1 token used on BG-2 domain) | 403 or data scoped to BG-1 only |
| Domain record deactivated (`is_active = false`) | **403 — Domain not recognized** |
| Buying group deactivated (`admin.is_active = false`) | **403 — Domain not recognized** |
| Missing `X-Tenant-Domain` header (production) | Falls back to Origin/Host header |

### CORS Tests

| Test | Expected Result |
|------|----------------|
| Request from `http://localhost:3002` | Allowed |
| Request from `https://abc.com` | Allowed (registered) |
| Request from `https://pharmacy.abc.com` | Allowed (registered) |
| Request from `https://random.com` | **Blocked by CORS** |
| Request from `https://mainadmin.yoursystem.com` | Allowed (MAIN_ADMIN_URL) |

---

## Summary

### What This Solution Requires

| Category | Items |
|----------|-------|
| **Database** | 1 new table (`buying_group_domains`), 2 new columns (`admin.buying_group_id`, `processors.buying_group_id`), 4 RPC functions |
| **Backend** | 2 new files (`tenantService.ts`, `tenantAuth.ts`), modifications to login services + controllers + CORS + routes, 1 new endpoint (`/tenant-info`) |
| **Admin App** (`admin/`) | Add `X-Tenant-Domain` header, add `middleware.ts`, update login page |
| **Pharmacy App** (`Frontend/`) | Add `X-Tenant-Domain` header, update login page |
| **MainAdmin** | New domain management UI + 3 API endpoints |
| **Infrastructure** | DNS records + Vercel custom domains per buying group (manual) |
| **Local Dev** | Zero changes needed — localhost auto-bypasses tenant checks |

### What Does NOT Change

- MainAdmin portal — single deployment, no domain isolation
- Database — single Supabase instance shared by all
- Backend API — single deployment serving all tenants
- Processor portal — **does not exist separately**, processors use the admin app
- Existing login flows — only augmented with an optional tenant check, not replaced

### Key Design Decisions

1. **Admin + Processor share one domain** — the `admin/` app on `abc.com` handles both
2. **Only pharmacies get a subdomain** — `pharmacy.abc.com` using `Frontend/` code
3. **Localhost = no enforcement** — zero-config local development
4. **Domain check at login time only** — subsequent requests trust the JWT's `buying_group_id`
5. **Same code, different domains** — single Vercel project with multiple custom domains
