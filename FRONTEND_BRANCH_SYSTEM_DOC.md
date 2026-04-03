# Pharmacy Multi-Branch System — Frontend Integration Guide

**For: Younas (Frontend Developer)**
**Date: April 3, 2026**
**Backend Status: Complete — all APIs, RPCs, edge functions, and middleware are ready.**

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Key Concepts](#2-key-concepts)
3. [API Reference](#3-api-reference)
4. [Frontend Tasks — Setup Account Page Update](#4-frontend-tasks--setup-account-page-update)
5. [Frontend Tasks — Pharmacy Context & Permissions](#5-frontend-tasks--pharmacy-context--permissions)
6. [Frontend Tasks — Branch Management UI (Parent Pharmacy)](#6-frontend-tasks--branch-management-ui-parent-pharmacy)
7. [Frontend Tasks — Role & Permission Management UI](#7-frontend-tasks--role--permission-management-ui)
8. [Frontend Tasks — Portal Switching](#8-frontend-tasks--portal-switching)
9. [Frontend Tasks — Permission-Based UI Gating (Branch Pharmacy)](#9-frontend-tasks--permission-based-ui-gating-branch-pharmacy)
10. [Permission Keys Reference](#10-permission-keys-reference)
11. [Edge Cases & Error Handling](#11-edge-cases--error-handling)
12. [Implementation Priority Order](#12-implementation-priority-order)

---

## 1. System Overview

### What Changed

Admin-created pharmacies are now **"Pharmacy Admins"** that can:
- Create **branch pharmacies** (sub-pharmacies under them)
- Define custom **roles** with specific permissions
- **Assign roles** to branch pharmacies
- **Switch** to any branch's portal to view/manage their data

Branch pharmacies:
- Receive an invite email, set their password, and login normally
- Can only see/use features their **assigned permissions** allow
- Cannot create sub-branches

### Flow Summary

```
System Admin creates Pharmacy XYZ (existing flow - unchanged)
       ↓
Pharmacy XYZ completes setup (existing flow - unchanged)
       ↓
Pharmacy XYZ is now a "Pharmacy Admin" (can_manage_branches = true)
       ↓
Pharmacy XYZ creates Branch A, Branch B, etc.
       ↓
Branch receives email → sets password → logs in
       ↓
Pharmacy XYZ creates roles (e.g. "Manager", "Viewer")
       ↓
Pharmacy XYZ assigns roles to branches
       ↓
Branch pharmacy sees only permitted features
```

---

## 2. Key Concepts

| Concept | Description |
|---------|-------------|
| **Parent Pharmacy** | An admin-created pharmacy with `can_manage_branches = true` and `parent_pharmacy_id = null`. Can create branches. |
| **Branch Pharmacy** | A pharmacy with `parent_pharmacy_id` set to its parent. Created by a parent pharmacy. |
| **Permission** | A granular access right (e.g., `returns:view`, `marketplace:purchase`). 27 total permissions exist. |
| **Role** | A named collection of permissions created by a parent pharmacy (e.g., "Branch Manager", "View Only"). |
| **Role Assignment** | A role assigned to a branch. A branch can have multiple roles; permissions are merged (union). |
| **Portal Switch** | Parent pharmacy operates as a branch by sending `X-Switch-Pharmacy` header with all API requests. |

---

## 3. API Reference

**Base URL:** `NEXT_PUBLIC_API_URL` (same as existing)
**Auth:** All endpoints (except verify/complete-setup) require `Authorization: Bearer <token>`

### 3.1 Branch Management APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/pharmacy-branches` | Create a branch pharmacy (sends invite email) |
| `GET` | `/api/pharmacy-branches` | List branches (search, status filter, pagination) |
| `GET` | `/api/pharmacy-branches/:id` | Get branch detail (with roles & permissions) |
| `PUT` | `/api/pharmacy-branches/:id/status` | Update branch status (`active` / `suspended`) |
| `GET` | `/api/pharmacy-branches/invites` | List pending branch invites |
| `POST` | `/api/pharmacy-branches/invites/:id/resend` | Resend branch invite email |
| `GET` | `/api/pharmacy-branches/context` | Get full pharmacy context (parent/branch info, permissions, branches list) |
| `POST` | `/api/pharmacy-branches/switch/:branchId` | Validate switch access + get branch permissions |

### 3.2 Role Management APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/pharmacy-roles` | Create a role with permissions |
| `GET` | `/api/pharmacy-roles` | List all roles for this pharmacy |
| `GET` | `/api/pharmacy-roles/:id` | Get role detail (permissions + assigned branches) |
| `PUT` | `/api/pharmacy-roles/:id` | Update role name/description/permissions |
| `DELETE` | `/api/pharmacy-roles/:id` | Delete a role (removes all assignments) |
| `POST` | `/api/pharmacy-roles/:roleId/assign/:branchId` | Assign role to a branch |
| `DELETE` | `/api/pharmacy-roles/:roleId/assign/:branchId` | Remove role from a branch |
| `GET` | `/api/pharmacy-roles/permissions` | Get master list of all available permissions |
| `GET` | `/api/pharmacy-roles/branch-permissions/:branchId` | Get effective permissions for a branch |

### 3.3 Branch Auth APIs (Public — no auth required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/verify-branch-invite` | Verify branch invite token |
| `POST` | `/api/auth/complete-branch-setup` | Complete branch setup (set password) |

---

### 3.4 Detailed Request/Response Examples

#### POST `/api/pharmacy-branches` — Create Branch

**Request Body:**
```json
{
  "pharmacyName": "XYZ Downtown Branch",
  "email": "downtown@xyzpharmacy.com",
  "contactName": "John Manager",
  "phone": "555-0102",
  "fax": "555-0103",
  "street": "456 Branch St",
  "city": "New York",
  "state": "NY",
  "zip": "10002",
  "wholesaler": "McKesson",
  "wholesalerAccount": "MCK-54321",
  "secondaryWholesaler": "Cardinal",
  "deaNumber": "AB1234567",
  "deaExpiration": "2027-12-31",
  "serviceType": "full_service",
  "daysBetweenVisits": "90"
}
```

**Response (201):**
```json
{
  "status": "success",
  "message": "Branch pharmacy created successfully. Invite email has been sent.",
  "data": {
    "inviteId": "uuid-here",
    "inviteToken": "hex-token-here",
    "email": "downtown@xyzpharmacy.com",
    "pharmacyName": "XYZ Downtown Branch",
    "parentPharmacyName": "XYZ Pharmacy"
  }
}
```

#### GET `/api/pharmacy-branches?search=downtown&status=all&page=1&limit=20`

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "branches": [
      {
        "id": "branch-uuid",
        "email": "downtown@xyzpharmacy.com",
        "name": "John Manager",
        "pharmacyName": "XYZ Downtown Branch",
        "phone": "555-0102",
        "physicalAddress": { "street": "456 Branch St", "city": "New York", "state": "NY", "zip": "10002" },
        "status": "active",
        "deaNumber": "AB1234567",
        "createdAt": "2026-04-03T...",
        "updatedAt": "2026-04-03T...",
        "assignedRoles": [
          { "roleId": "role-uuid", "roleName": "Branch Manager" }
        ]
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

#### GET `/api/pharmacy-branches/context` — Pharmacy Context

**Response for Parent Pharmacy:**
```json
{
  "status": "success",
  "data": {
    "pharmacyId": "parent-uuid",
    "pharmacyName": "XYZ Pharmacy",
    "email": "admin@xyzpharmacy.com",
    "isParent": true,
    "isBranch": false,
    "canManageBranches": true,
    "branches": [
      { "id": "branch-1-uuid", "pharmacyName": "XYZ Downtown", "email": "downtown@xyz.com", "status": "active" },
      { "id": "branch-2-uuid", "pharmacyName": "XYZ Uptown", "email": "uptown@xyz.com", "status": "active" }
    ],
    "parentPharmacy": null,
    "permissions": ["returns:view", "returns:create", "...all 27 permissions..."],
    "roles": []
  }
}
```

**Response for Branch Pharmacy:**
```json
{
  "status": "success",
  "data": {
    "pharmacyId": "branch-uuid",
    "pharmacyName": "XYZ Downtown Branch",
    "email": "downtown@xyzpharmacy.com",
    "isParent": false,
    "isBranch": true,
    "canManageBranches": false,
    "branches": [],
    "parentPharmacy": { "id": "parent-uuid", "pharmacyName": "XYZ Pharmacy", "email": "admin@xyz.com" },
    "permissions": ["returns:view", "returns:create", "products:view"],
    "roles": [{ "roleId": "role-uuid", "roleName": "Branch Manager" }]
  }
}
```

#### POST `/api/pharmacy-roles` — Create Role

**Request Body:**
```json
{
  "roleName": "Branch Manager",
  "description": "Full access except subscription and settings management",
  "permissionKeys": [
    "returns:view", "returns:create", "returns:edit", "returns:delete",
    "tbd_items:view", "tbd_items:manage",
    "destruction:view", "destruction:manage",
    "wine_cellar:view", "wine_cellar:manage",
    "products:view", "products:manage",
    "optimization:view",
    "marketplace:view", "marketplace:purchase",
    "orders:view",
    "inventory_analysis:view",
    "credits:view",
    "analytics:view",
    "documents:view", "documents:upload",
    "settings:view",
    "payments:view",
    "notifications:view"
  ]
}
```

**Response (201):**
```json
{
  "status": "success",
  "message": "Role created successfully",
  "data": { "roleId": "role-uuid", "roleName": "Branch Manager" }
}
```

#### PUT `/api/pharmacy-roles/:id` — Update Role

**Request Body (any combination):**
```json
{
  "roleName": "Updated Name",
  "description": "Updated description",
  "permissionKeys": ["returns:view", "products:view"]
}
```

#### POST `/api/pharmacy-roles/:roleId/assign/:branchId` — Assign Role

No request body needed.

**Response (200):**
```json
{ "status": "success", "message": "Role assigned to branch successfully" }
```

#### POST `/api/pharmacy-branches/switch/:branchId` — Switch to Branch

No request body needed.

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "branch": {
      "branchId": "branch-uuid",
      "pharmacyName": "XYZ Downtown Branch",
      "email": "downtown@xyz.com",
      "status": "active"
    },
    "permissions": ["returns:view", "returns:create", "products:view"]
  }
}
```

#### POST `/api/auth/verify-branch-invite` — Verify Branch Invite

**Request Body:**
```json
{ "token": "hex-invite-token" }
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "inviteId": "uuid",
    "email": "branch@xyz.com",
    "pharmacyName": "XYZ Downtown",
    "parentPharmacyName": "XYZ Pharmacy",
    "contactName": "John",
    "phone": "555-0102",
    "deaNumber": "AB1234567",
    "physicalAddress": { "street": "...", "city": "...", "state": "...", "zip": "..." },
    "serviceType": "full_service",
    "wholesaler": "McKesson",
    "wholesalerAccount": "MCK-54321",
    "isBranch": true
  }
}
```

#### POST `/api/auth/complete-branch-setup` — Complete Branch Setup

**Request Body:**
```json
{ "token": "hex-invite-token", "password": "SecurePassword123!" }
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Branch account setup completed successfully. You can now log in.",
  "data": { "email": "branch@xyz.com" }
}
```

---

## 4. Frontend Tasks — Setup Account Page Update

**File:** `Frontend/app/setup-account/page.tsx`

### What to Change

The existing setup-account page handles admin pharmacy invites. It needs to also handle **branch invites**.

### How to Detect Branch vs Admin Invite

The branch invite URL includes `?token=xxx&type=branch`. Check for `type=branch` in the URL query params.

### Implementation Steps

1. Read `type` from URL search params alongside `token`
2. If `type === 'branch'`:
   - Call `POST /api/auth/verify-branch-invite` (instead of `/api/auth/verify-invite`)
   - Display parent pharmacy name: "Your account was created by **{parentPharmacyName}**"
   - On password submit, call `POST /api/auth/complete-branch-setup` (instead of `/api/auth/complete-setup`)
3. If no `type` or `type !== 'branch'`:
   - Keep existing behavior (admin invite flow — no changes)

### UI Notes

- Show the parent pharmacy name prominently so the branch user knows who created their account
- The `isBranch: true` field in the verify response confirms it's a branch invite
- After successful setup, redirect to `/login` with success message (same as current)

---

## 5. Frontend Tasks — Pharmacy Context & Permissions

### When to Fetch Context

Call `GET /api/pharmacy-branches/context` **once after login** (or on app mount after auth check). Store the result in global state (Zustand store or React context).

### Create a New Store/Hook

**Suggested file:** `Frontend/lib/store/pharmacyContextStore.ts` (Zustand)

```typescript
interface PharmacyContext {
  pharmacyId: string;
  pharmacyName: string;
  email: string;
  isParent: boolean;
  isBranch: boolean;
  canManageBranches: boolean;
  branches: { id: string; pharmacyName: string; email: string; status: string }[];
  parentPharmacy: { id: string; pharmacyName: string; email: string } | null;
  permissions: string[];
  roles: { roleId: string; roleName: string }[];
}
```

### Create a Permission Check Hook

**Suggested file:** `Frontend/hooks/usePharmacyPermissions.ts`

```typescript
export function usePharmacyPermissions() {
  const { permissions, isParent, isBranch } = usePharmacyContext();

  const hasPermission = (key: string): boolean => {
    if (isParent) return true; // Parent has all permissions
    return permissions.includes(key);
  };

  const hasAnyPermission = (keys: string[]): boolean => {
    if (isParent) return true;
    return keys.some(k => permissions.includes(k));
  };

  return { hasPermission, hasAnyPermission, permissions, isParent, isBranch };
}
```

### Where to Call the Context API

In `DashboardLayout` component or a provider that wraps all dashboard pages. Fetch on mount if not already loaded.

---

## 6. Frontend Tasks — Branch Management UI (Parent Pharmacy)

These pages/components are **only visible to parent pharmacies** (`isParent === true`).

### 6.1 New Sidebar Items

**File:** `Frontend/components/layout/Sidebar.tsx`

Add these navigation items (conditionally shown when `isParent`):

```typescript
// Show only for parent pharmacies
{ title: 'Branches', href: '/branches', icon: Building2 },
{ title: 'Roles & Permissions', href: '/roles', icon: ShieldCheck },
```

Place them at the bottom of the nav, above Settings.

### 6.2 Branch List Page

**New file:** `Frontend/app/(dashboard)/branches/page.tsx`

**Features:**
- Table listing all branches with columns: Name, Email, Status, Roles, Created Date, Actions
- Search bar (filters by name/email)
- Status filter dropdown (all, active, suspended)
- Pagination
- "Add Branch" button → opens create branch modal/dialog
- Row actions: View Details, Suspend/Activate, Resend Invite (for pending)

**API calls:**
- `GET /api/pharmacy-branches?search=&status=all&page=1&limit=20` for the list
- `GET /api/pharmacy-branches/invites` for pending invites section
- `PUT /api/pharmacy-branches/:id/status` for suspend/activate
- `POST /api/pharmacy-branches/invites/:id/resend` for resend invite

### 6.3 Create Branch Modal/Dialog

**Triggered by:** "Add Branch" button on branches page

**Form fields** (same fields as admin create pharmacy — reuse the pattern):

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `pharmacyName` | Yes | text | Branch pharmacy name |
| `email` | Yes | email | Branch user's email |
| `contactName` | No | text | Contact person name |
| `phone` | No | tel | Phone number |
| `fax` | No | tel | Fax number |
| `street` | No | text | Address street |
| `city` | No | text | City |
| `state` | No | select | US state dropdown |
| `zip` | No | text | ZIP code |
| `wholesaler` | No | text | Primary wholesaler |
| `wholesalerAccount` | No | text | Wholesaler account number |
| `secondaryWholesaler` | No | text | |
| `deaNumber` | No | text | DEA number |
| `deaExpiration` | No | date | DEA expiration |
| `serviceType` | No | select | `full_service` or `self_service` (default: full_service) |
| `daysBetweenVisits` | No | number | Default: 120 |

**API call:** `POST /api/pharmacy-branches`

**On success:** Show toast "Branch created. Invite email sent to {email}", refresh branch list.

### 6.4 Branch Detail Page

**New file:** `Frontend/app/(dashboard)/branches/[id]/page.tsx`

**Sections:**
1. **Branch Info** — Name, email, phone, address, DEA, status, created date
2. **Assigned Roles** — List of roles with their permissions. Actions: Remove role, Add role dropdown
3. **Effective Permissions** — Flat list of all permission keys this branch has (merged from all roles)

**API calls:**
- `GET /api/pharmacy-branches/:id` for branch detail
- `POST /api/pharmacy-roles/:roleId/assign/:branchId` to assign role
- `DELETE /api/pharmacy-roles/:roleId/assign/:branchId` to remove role

---

## 7. Frontend Tasks — Role & Permission Management UI

### 7.1 Roles List Page

**New file:** `Frontend/app/(dashboard)/roles/page.tsx`

**Features:**
- Card or table listing all roles
- Each role shows: name, description, number of permissions, number of assigned branches
- "Create Role" button → opens create role modal
- Row actions: Edit, Delete

**API call:** `GET /api/pharmacy-roles`

### 7.2 Create/Edit Role Modal

**Form fields:**

| Field | Required | Type |
|-------|----------|------|
| `roleName` | Yes | text |
| `description` | No | textarea |
| `permissionKeys` | No | multi-select/checkbox grid |

**Permission Selection UI:**
- Fetch all permissions via `GET /api/pharmacy-roles/permissions`
- Group permissions by `module` (returns, tbd_items, destruction, etc.)
- Show checkboxes for each permission within each module
- Include "Select All" / "Deselect All" per module

**API calls:**
- Create: `POST /api/pharmacy-roles` with `{ roleName, description, permissionKeys: [...] }`
- Update: `PUT /api/pharmacy-roles/:id` with same body

### 7.3 Role Detail Page

**New file:** `Frontend/app/(dashboard)/roles/[id]/page.tsx`

**Sections:**
1. **Role Info** — Name, description, created date
2. **Permissions** — Grouped checkbox view of assigned permissions
3. **Assigned Branches** — List of branches with this role. Action: Remove role from branch

**API call:** `GET /api/pharmacy-roles/:id`

---

## 8. Frontend Tasks — Portal Switching

### How It Works

When a parent pharmacy wants to view/manage a branch's portal, they "switch" to that branch. All subsequent API calls include the branch's pharmacy_id.

### Implementation Steps

#### 8.1 Switch Dropdown in TopBar

**File:** `Frontend/components/layout/TopBar.tsx` or `UserDropdown.tsx`

Add a pharmacy switcher dropdown:
- Shows current pharmacy name
- Lists all branches from `pharmacyContext.branches`
- Option to "Switch back to {parentPharmacyName}"

#### 8.2 Switch Logic

**In the pharmacy context store:**

```typescript
// State
currentPharmacyId: string | null;  // null = own pharmacy, set = viewing branch
switchedBranch: { id: string; name: string } | null;

// Actions
switchToBranch: async (branchId: string) => {
  // 1. Call POST /api/pharmacy-branches/switch/:branchId to validate
  // 2. Store branchId and permissions
  // 3. Set currentPharmacyId = branchId
}

switchBack: () => {
  // 1. Clear currentPharmacyId
  // 2. Restore parent permissions
}
```

#### 8.3 API Client Modification

**File:** `Frontend/lib/api/client.ts`

When a branch is switched, add the `X-Switch-Pharmacy` header to **all** API requests:

```typescript
// In the request interceptor / fetch wrapper:
const switchPharmacyId = usePharmacyContextStore.getState().currentPharmacyId;
if (switchPharmacyId) {
  headers['X-Switch-Pharmacy'] = switchPharmacyId;
}
```

**Important:** The existing `pharmacy_id` cookie/query parameter logic should still work. The `X-Switch-Pharmacy` header tells the backend middleware to override `req.pharmacyId` with the branch's ID. All existing pharmacy APIs will then automatically return the branch's data.

#### 8.4 Visual Indicator

When switched to a branch, show a prominent banner/badge:
- "Viewing as: XYZ Downtown Branch" with a "Switch Back" button
- Use a different accent color (e.g., amber/yellow) so it's obvious

---

## 9. Frontend Tasks — Permission-Based UI Gating (Branch Pharmacy)

When a branch pharmacy logs in, they should only see features they have permission for.

### 9.1 Sidebar Gating

**File:** `Frontend/components/layout/Sidebar.tsx`

Use the `usePharmacyPermissions` hook to conditionally render nav items:

```typescript
const { hasPermission, hasAnyPermission } = usePharmacyPermissions();

const navItems = [
  { title: 'Returns', href: '/returns', icon: ClipboardList,
    visible: hasAnyPermission(['returns:view', 'returns:create']) },
  { title: 'Create Return', href: '/returns/create', icon: Scan,
    visible: hasPermission('returns:create') },
  { title: 'TBD Items', href: '/returns/tbd-items', icon: AlertTriangle,
    visible: hasPermission('tbd_items:view') },
  { title: 'Destruction', href: '/returns/destruction', icon: Trash2,
    visible: hasPermission('destruction:view') },
  { title: 'Wine Cellar', href: '/wine-cellar', icon: Archive,
    visible: hasPermission('wine_cellar:view') },
  { title: 'My Products', href: '/products', icon: ScanLine,
    visible: hasPermission('products:view') },
  { title: 'Search', href: '/optimization', icon: Search,
    visible: hasPermission('optimization:view') },
  { title: 'Marketplace', href: '/marketplace', icon: ShoppingCart,
    visible: hasPermission('marketplace:view') },
  { title: 'Orders', href: '/orders', icon: ClipboardList,
    visible: hasPermission('orders:view') },
  { title: 'Inventory Analysis', href: '/inventory-analysis', icon: Warehouse,
    visible: hasPermission('inventory_analysis:view') },
  { title: 'Credits', href: '/credits', icon: CreditCard,
    visible: hasPermission('credits:view') },
  { title: 'Analytics & Reports', href: '/analytics', icon: BarChart3,
    visible: hasPermission('analytics:view') },
  { title: 'Upload Documents', href: '/upload', icon: Upload,
    visible: hasPermission('documents:upload') },
  // Branch management - only for parent pharmacies
  { title: 'Branches', href: '/branches', icon: Building2,
    visible: isParent },
  { title: 'Roles & Permissions', href: '/roles', icon: ShieldCheck,
    visible: isParent },
].filter(item => item.visible);
```

### 9.2 Page-Level Guards

For each dashboard page, add a permission check at the top:

```typescript
// Example: returns page
const { hasPermission } = usePharmacyPermissions();

if (!hasPermission('returns:view')) {
  return <AccessDeniedPage />;
}
```

### 9.3 Action-Level Guards

Within pages, hide action buttons based on permissions:

```typescript
// Hide "Create Return" button if no create permission
{hasPermission('returns:create') && (
  <Button onClick={...}>Create Return</Button>
)}

// Hide delete button
{hasPermission('returns:delete') && (
  <Button variant="destructive" onClick={...}>Delete</Button>
)}

// Hide checkout in marketplace
{hasPermission('marketplace:purchase') && (
  <Button onClick={goToCheckout}>Checkout</Button>
)}
```

### 9.4 Middleware Route Protection

**File:** `Frontend/middleware.ts`

No changes needed to the Next.js middleware — it only checks if the user has a valid `auth_token` cookie. Permission checking happens client-side after context is loaded.

---

## 10. Permission Keys Reference

| Permission Key | Module | Sidebar Item | Description |
|---------------|--------|--------------|-------------|
| `returns:view` | returns | Returns | View returns list and details |
| `returns:create` | returns | Create Return | Create new return transactions |
| `returns:edit` | returns | — | Edit/update return transactions |
| `returns:delete` | returns | — | Delete return transactions |
| `tbd_items:view` | tbd_items | TBD Items | View TBD items list |
| `tbd_items:manage` | tbd_items | — | Resolve/manage TBD items |
| `destruction:view` | destruction | Destruction | View destruction records |
| `destruction:manage` | destruction | — | Create/manage destruction records |
| `wine_cellar:view` | wine_cellar | Wine Cellar | View wine cellar items |
| `wine_cellar:manage` | wine_cellar | — | Manage wine cellar items |
| `products:view` | products | My Products | View products list |
| `products:manage` | products | — | Add/edit/delete products |
| `optimization:view` | optimization | Search | Use search/optimization tools |
| `marketplace:view` | marketplace | Marketplace | Browse marketplace |
| `marketplace:purchase` | marketplace | — | Purchase items (checkout) |
| `orders:view` | orders | Orders | View orders list |
| `inventory_analysis:view` | inventory_analysis | Inventory Analysis | View inventory analysis |
| `credits:view` | credits | Credits | View credits |
| `analytics:view` | analytics | Analytics & Reports | View analytics |
| `documents:view` | documents | — | View documents |
| `documents:upload` | documents | Upload Documents | Upload documents |
| `settings:view` | settings | Settings | View settings |
| `settings:manage` | settings | — | Manage settings |
| `subscription:view` | subscription | Subscription | View subscription |
| `subscription:manage` | subscription | — | Manage subscription |
| `payments:view` | payments | Payments | View payments |
| `notifications:view` | notifications | — | View notifications |

---

## 11. Edge Cases & Error Handling

### Login — Branch Pharmacy

- Branch pharmacy logs in with normal `/api/auth/signin` endpoint — **no change to login flow**
- After login, call `/api/pharmacy-branches/context` to detect if branch
- If `isBranch === true` and `permissions` array is empty, show message: "Your account has no permissions assigned yet. Please contact your pharmacy administrator."

### Branch Invite Expired

- The verify-branch-invite endpoint returns `410` status with message "This invite link has expired..."
- Show the message and suggest contacting the pharmacy admin (not system admin)

### Parent Switches to Suspended Branch

- The switch API returns `403` with "Branch pharmacy is not active"
- Show toast error and don't switch

### Deleting a Role That's Assigned

- The delete role API automatically removes all role assignments first
- After deleting, affected branches lose those permissions
- Frontend should show a confirmation dialog: "This role is assigned to X branches. Deleting it will remove those permissions."

### Branch Pharmacy Tries to Access Branch Management URLs

- If a branch pharmacy navigates to `/branches` or `/roles`, the page should show "Access Denied" or redirect to their first permitted page

### Permissions Not Yet Loaded

- While `GET /api/pharmacy-branches/context` is loading, show a loading skeleton for the sidebar
- Don't render any protected pages until permissions are available

---

## 12. Implementation Priority Order

### Phase 1 — Core (Do First)

1. **Pharmacy context store + hook** — `pharmacyContextStore.ts`, `usePharmacyPermissions.ts`
2. **Call context API after login** — in `DashboardLayout` or a wrapper provider
3. **Setup account page update** — handle `type=branch` query param
4. **Sidebar permission gating** — conditionally show/hide items

### Phase 2 — Branch Management

5. **Branches list page** — `/branches` with table, search, filters
6. **Create branch modal** — form with all fields
7. **Branch detail page** — `/branches/[id]`
8. **Pending invites section** — on branches page

### Phase 3 — Roles & Permissions

9. **Roles list page** — `/roles`
10. **Create/edit role modal** — with permission checkbox grid
11. **Role detail page** — `/roles/[id]`
12. **Assign/remove role from branch** — on branch detail page

### Phase 4 — Portal Switching

13. **Pharmacy switcher dropdown** — in TopBar
14. **API client X-Switch-Pharmacy header** — in apiClient
15. **Visual indicator banner** — when viewing as branch
16. **Switch back functionality**

### Phase 5 — Page-Level Permission Guards

17. **Add permission checks to all existing pages** — returns, marketplace, orders, etc.
18. **Action-level permission checks** — hide create/edit/delete buttons

---

## New Files to Create

| File Path | Purpose |
|-----------|---------|
| `Frontend/lib/store/pharmacyContextStore.ts` | Zustand store for pharmacy context |
| `Frontend/hooks/usePharmacyPermissions.ts` | Permission check hook |
| `Frontend/app/(dashboard)/branches/page.tsx` | Branch list page |
| `Frontend/app/(dashboard)/branches/[id]/page.tsx` | Branch detail page |
| `Frontend/app/(dashboard)/roles/page.tsx` | Roles list page |
| `Frontend/app/(dashboard)/roles/[id]/page.tsx` | Role detail page |
| `Frontend/lib/api/services/branchService.ts` | Branch management API service |
| `Frontend/lib/api/services/roleService.ts` | Role management API service |
| `Frontend/components/branches/CreateBranchModal.tsx` | Create branch form modal |
| `Frontend/components/roles/CreateRoleModal.tsx` | Create/edit role form modal |
| `Frontend/components/roles/PermissionGrid.tsx` | Permission checkbox grid grouped by module |
| `Frontend/components/layout/PharmacySwitcher.tsx` | Pharmacy switcher dropdown component |
| `Frontend/components/layout/BranchBanner.tsx` | "Viewing as branch" indicator |
| `Frontend/components/shared/AccessDenied.tsx` | Access denied placeholder component |

## Existing Files to Modify

| File Path | Change |
|-----------|--------|
| `Frontend/app/setup-account/page.tsx` | Handle `type=branch` for branch invites |
| `Frontend/components/layout/Sidebar.tsx` | Add conditional nav items + permission gating |
| `Frontend/components/layout/TopBar.tsx` | Add pharmacy switcher dropdown |
| `Frontend/components/layout/DashboardLayout.tsx` | Fetch pharmacy context on mount |
| `Frontend/lib/api/client.ts` | Add `X-Switch-Pharmacy` header when switched |
| `Frontend/middleware.ts` | Add `/branches`, `/roles` to protected routes |
| All existing dashboard pages | Add permission guard at top of each page |

---

## Edge Function Deployment

The backend includes a new Supabase Edge Function for branch invite emails. Deploy it with:

```bash
npx supabase functions deploy send-branch-invite --no-verify-jwt
```

This uses the same SMTP configuration as the existing `send-pharmacy-invite` function.

---

**Questions? Ask Saboor for backend clarification or check the API in Swagger at `/api-docs`.**
