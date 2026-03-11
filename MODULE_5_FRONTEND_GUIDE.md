# Module 5: Policy Engine — Frontend Developer Guide

**For:** Younas (Admin Frontend)
**Backend status:** All APIs implemented and ready to use
**Date:** March 11, 2026

---

## Overview

Module 5 adds manufacturer return policy management and a policy check engine. The backend provides:

1. **Admin Policies CRUD** — Full management of manufacturer policies, return rules, exceptions, and notes
2. **Policy Check API** — Called during product scanning (Module 4) to auto-classify items

---

## API Base URLs

| Group | Base Path | Auth |
|-------|-----------|------|
| Admin Policies CRUD | `/api/admin/policies` | Admin JWT |
| Policy Check | `/api/policies/check` | Admin or Processor JWT |

All requests require `Authorization: Bearer <token>` header.

---

## 1. API Endpoints Reference

### 1.1 List Policies (paginated, searchable)

```
GET /api/admin/policies?page=1&limit=20&search=solco&labelerType=generic&destination=inmar&sortBy=manufacturer_name&sortOrder=asc
```

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `limit` | int | 20 | Items per page |
| `search` | string | — | Search by manufacturer name, labeler ID, or email |
| `labelerType` | string | all | Filter: `all`, `generic`, `brand` |
| `destination` | string | all | Filter: `all`, `inmar`, `qualanex`, `pharmalink`, `other` |
| `sortBy` | string | manufacturer_name | Sort column |
| `sortOrder` | string | asc | `asc` or `desc` |

**Response:**

```json
{
  "status": "success",
  "data": {
    "policies": [
      {
        "id": "uuid",
        "labelerId": "43547",
        "labelerType": "generic",
        "manufacturerName": "Solco Healthcare US LLC",
        "address1": "328 Wall St",
        "city": "Princeton",
        "state": "NJ",
        "zip": "08540",
        "mainContact": "Returns Dept",
        "mainPhone": "(609) 555-1001",
        "creditRequestEmail": "returns@solcohealthcare.com",
        "averagePayPercent": 68.5,
        "averageDaysToPay": 210,
        "verifiedDate": "2025-12-01",
        "returnPolicies": [
          {
            "id": "uuid",
            "destination": "inmar",
            "policyDescription": "6 Months Prior to 12 Months Post Drug Expiration",
            "monthsBeforeExpiration": 6,
            "monthsAfterExpiration": 12,
            "discountRate": 0.5,
            "partialsAccepted": true,
            "partialDosageForms": ["TABLET", "TABLET, DELAYED RELEASE", "CAPSULE"],
            "reimbursementType": "batch"
          }
        ],
        "destinations": ["inmar"],
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 10,
      "totalPages": 1
    }
  }
}
```

### 1.2 Get Policy by ID (full detail)

```
GET /api/admin/policies/:id
```

**Response includes:** `returnPolicies[]`, `exceptions[]`, `notes[]`

```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "labelerId": "43547",
    "manufacturerName": "Solco Healthcare US LLC",
    "returnPolicies": [ ... ],
    "exceptions": [
      {
        "id": "uuid",
        "ndc": "43547-0281-11",
        "productName": "Valsartan 320mg Tablets",
        "reason": "Recalled product"
      }
    ],
    "notes": [
      {
        "id": "uuid",
        "noteDate": "2025-12-01",
        "authorInitials": "JV",
        "noteText": "Verified return policy with Solco rep..."
      }
    ]
  }
}
```

### 1.3 Create Policy

```
POST /api/admin/policies
Content-Type: application/json

{
  "labelerId": "12345",
  "labelerType": "generic",
  "manufacturerName": "Test Manufacturer Inc",
  "mainPhone": "(555) 123-4567",
  "creditRequestEmail": "returns@test.com",
  "averagePayPercent": 70.0,
  "averageDaysToPay": 180
}
```

### 1.4 Update Policy

```
PATCH /api/admin/policies/:id
Content-Type: application/json

{
  "averagePayPercent": 72.5,
  "verifiedDate": "2026-03-11"
}
```

### 1.5 Delete Policy

```
DELETE /api/admin/policies/:id
```

Cascades: deletes all associated return policies, exceptions, and notes.

### 1.6 Add Return Policy (sub-record)

```
POST /api/admin/policies/:id/return-policies
Content-Type: application/json

{
  "destination": "inmar",
  "autoRaEmail": "ra-request@inmar.com",
  "policyNumber": 101,
  "policyDescription": "6 Months Prior to 12 Months Post Drug Expiration",
  "monthsBeforeExpiration": 6,
  "monthsAfterExpiration": 12,
  "discountRate": 0.5,
  "partialsAccepted": true,
  "partialDosageForms": ["TABLET", "CAPSULE"],
  "reimbursementType": "batch"
}
```

### 1.7 Update / Delete Return Policy

```
PATCH /api/admin/policies/:id/return-policies/:returnPolicyId
DELETE /api/admin/policies/:id/return-policies/:returnPolicyId
```

### 1.8 Exceptions (Non-Returnable Products)

```
GET  /api/admin/policies/:id/exceptions
POST /api/admin/policies/:id/exceptions  →  { "ndc": "00093-0150-01", "productName": "...", "reason": "..." }
DELETE /api/admin/policies/:id/exceptions/:exceptionId
```

### 1.9 Notes

```
GET  /api/admin/policies/:id/notes
POST /api/admin/policies/:id/notes  →  { "noteText": "...", "authorInitials": "JV", "noteDate": "2026-03-11" }
DELETE /api/admin/policies/:id/notes/:noteId
```

### 1.10 Bulk Import

```
POST /api/admin/policies/bulk-import
Content-Type: application/json

{
  "rows": [
    {
      "labelerId": "99999",
      "manufacturerName": "New Pharma Inc",
      "destination": "inmar",
      "policyDescription": "6-6 window",
      "monthsBeforeExpiration": 6,
      "monthsAfterExpiration": 6,
      "partialsAccepted": false,
      "reimbursementType": "batch"
    }
  ]
}
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "created": 1,
    "updated": 0,
    "skipped": 0,
    "errors": [],
    "total": 1
  }
}
```

### 1.11 Policy Check (for product scanning)

```
POST /api/policies/check
Content-Type: application/json

{
  "ndc": "43547-325-06",
  "expirationDate": "2026-06-15",
  "isPartial": false,
  "dosageForm": "TABLET, DELAYED RELEASE"
}
```

**Response (returnable):**

```json
{
  "status": "success",
  "data": {
    "status": "returnable",
    "reason": null,
    "destination": "inmar",
    "discountRate": 0.5,
    "reimbursementType": "batch",
    "policyNumber": 101,
    "policyDescription": "6 Months Prior to 12 Months Post Drug Expiration",
    "windowStart": "2025-12-15",
    "windowEnd": "2027-06-15",
    "partialsAccepted": true,
    "manufacturerName": "Solco Healthcare US LLC",
    "manufacturerPolicyId": "uuid",
    "autoRaEmail": "ra-request@inmar.com",
    "expectedReturnableDate": null
  }
}
```

**Response (too early):**

```json
{
  "data": {
    "status": "non_returnable",
    "reason": "too_early",
    "expectedReturnableDate": "2027-01-15",
    "windowStart": "2027-01-15",
    "windowEnd": "2028-07-15",
    ...
  }
}
```

**Response (TBD / no policy):**

```json
{
  "data": {
    "status": "tbd",
    "reason": "no_policy",
    "destination": null,
    ...
  }
}
```

---

## 2. Frontend Tasks (Tasks 5.7, 5.8, 5.9)

### Task 5.7: Policies List Page

**Location:** `admin/app/policies/page.tsx`

**UI Requirements:**

- **Table columns:** Labeler ID, Manufacturer Name, Type (generic/brand), Destination(s), Partials (Yes/No), Avg Pay %, Avg Days to Pay, Verified Date
- **Search bar:** Searches by manufacturer name or labeler ID
- **Filters:** Labeler Type dropdown (`All`, `Generic`, `Brand`), Destination dropdown (`All`, `Inmar`, `Qualanex`, `PharmaLink`)
- **Sort:** Click column headers to sort
- **Pagination:** Page controls at bottom
- **Row click:** Navigate to `/policies/:id` detail page
- **"Add Policy" button:** Opens modal or navigates to create form
- **Destinations column:** Show badges/pills for each destination (may be multiple)

### Task 5.8: Policy Detail Page

**Location:** `admin/app/policies/[id]/page.tsx`

**UI Sections:**

1. **Basic Info Card**
   - Labeler ID, Manufacturer Name, Type (generic/brand badge)
   - Contact info: main contact, phone, fax, email
   - Secondary contact: name, phone, email
   - Address: address_1, address_2, city, state, zip
   - "Edit" button → inline editing or modal

2. **Metrics Card**
   - Average Pay Percent (e.g., "68.5%")
   - Average Days to Pay (e.g., "210 days")
   - Verified Date (e.g., "Dec 1, 2025")

3. **Return Policies Table**
   - Columns: Destination, Policy #, Description, Window (e.g., "6 before / 12 after"), Discount Rate, Partials, Dosage Forms, Reimbursement Type
   - "Add Return Policy" button → modal form
   - Edit / Delete buttons per row

4. **Exceptions Table (Non-Returnable Products)**
   - Columns: NDC, Product Name, Reason
   - "Add Exception" button → modal form (NDC input, product name, reason)
   - Delete button per row

5. **Notes Section**
   - Chronological list (newest first)
   - Each note shows: date, author initials, text
   - "Add Note" form at top: date picker, initials input, text area
   - Delete button per note

### Task 5.9: Redux Slice

**Location:** `admin/lib/store/policiesSlice.ts`

**State:**

```typescript
interface PoliciesState {
  policies: ManufacturerPolicy[];
  currentPolicy: ManufacturerPolicyDetail | null;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  filters: { search: string; labelerType: string; destination: string };
  isLoading: boolean;
  isDetailLoading: boolean;
  isActionLoading: boolean;
  error: string | null;
}
```

**Thunks:**

| Thunk | Method | Endpoint |
|-------|--------|----------|
| `fetchPolicies` | GET | `/api/admin/policies?...` |
| `fetchPolicyById` | GET | `/api/admin/policies/:id` |
| `createPolicy` | POST | `/api/admin/policies` |
| `updatePolicy` | PATCH | `/api/admin/policies/:id` |
| `deletePolicy` | DELETE | `/api/admin/policies/:id` |
| `addReturnPolicy` | POST | `/api/admin/policies/:id/return-policies` |
| `updateReturnPolicy` | PATCH | `/api/admin/policies/:id/return-policies/:rpId` |
| `deleteReturnPolicy` | DELETE | `/api/admin/policies/:id/return-policies/:rpId` |
| `fetchExceptions` | GET | `/api/admin/policies/:id/exceptions` |
| `addException` | POST | `/api/admin/policies/:id/exceptions` |
| `deleteException` | DELETE | `/api/admin/policies/:id/exceptions/:exId` |
| `fetchNotes` | GET | `/api/admin/policies/:id/notes` |
| `addNote` | POST | `/api/admin/policies/:id/notes` |
| `deleteNote` | DELETE | `/api/admin/policies/:id/notes/:noteId` |
| `bulkImport` | POST | `/api/admin/policies/bulk-import` |
| `checkReturnability` | POST | `/api/policies/check` |

**Reducers:**

- `clearCurrentPolicy` — reset detail view
- `setFilters` — update search/filter state
- `clearError`

### Sidebar Update

Add "Policies" to the admin sidebar navigation (e.g., after "Processors" or "Warehouse"):

```tsx
{ name: 'Policies', href: '/policies', icon: ShieldCheckIcon }
```

---

## 3. Types (add to `admin/lib/types/index.ts`)

```typescript
// Module 5 — Policy Engine Types

export interface ManufacturerPolicy {
  id: string;
  labelerId: string;
  labelerType: 'generic' | 'brand';
  manufacturerName: string;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  mainContact: string | null;
  mainPhone: string | null;
  fax: string | null;
  creditRequestEmail: string | null;
  contact2Name: string | null;
  contact2Phone: string | null;
  contact2Email: string | null;
  averagePayPercent: number | null;
  averageDaysToPay: number | null;
  verifiedDate: string | null;
  returnPolicies: ReturnPolicy[];
  destinations: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ManufacturerPolicyDetail extends ManufacturerPolicy {
  exceptions: NonReturnableProduct[];
  notes: PolicyNote[];
}

export interface ReturnPolicy {
  id: string;
  manufacturerPolicyId: string;
  destination: string;
  autoRaEmail: string | null;
  policyNumber: number | null;
  policyDescription: string | null;
  monthsBeforeExpiration: number;
  monthsAfterExpiration: number;
  discountRate: number | null;
  partialsAccepted: boolean;
  partialDosageForms: string[] | null;
  reimbursementType: 'batch' | 'per_item';
  createdAt: string;
  updatedAt: string;
}

export interface NonReturnableProduct {
  id: string;
  manufacturerPolicyId: string;
  ndc: string;
  productName: string | null;
  reason: string | null;
  createdAt: string;
}

export interface PolicyNote {
  id: string;
  manufacturerPolicyId: string;
  noteDate: string;
  authorInitials: string | null;
  noteText: string;
  createdAt: string;
}

export interface ReturnabilityCheckResult {
  status: 'returnable' | 'non_returnable' | 'tbd';
  reason: string | null;
  destination: string | null;
  discountRate: number | null;
  reimbursementType: string | null;
  policyNumber: number | null;
  policyDescription: string | null;
  expectedReturnableDate: string | null;
  windowStart: string | null;
  windowEnd: string | null;
  partialsAccepted: boolean | null;
  manufacturerName: string | null;
  manufacturerPolicyId: string | null;
  autoRaEmail: string | null;
}
```

---

## 4. Seed Data Available for Testing

After running the SQL scripts (`fcr_08_create_policy_engine_tables.sql` then `fcr_09_seed_policy_engine_data.sql`), you'll have **10 manufacturers** with various configurations:

| Labeler | Manufacturer | Destination | Window | Partials | Notes |
|---------|-------------|-------------|--------|----------|-------|
| 43547 | Solco Healthcare | Inmar | 6-12 | Yes | Your test NDC 43547-325-06 |
| 00093 | Teva Pharmaceuticals | Qualanex | 6-6 | Yes | Has NDC exception |
| 16729 | Accord Healthcare | Inmar | 6-6 | No | — |
| 00069 | Pfizer | PharmaLink | 6-12 | Yes | Brand, has NDC exception |
| 00074 | Eli Lilly | Inmar | 6-6 | No | Brand |
| 59762 | Aurobindo Pharma | Qualanex | 6-12 | Yes | — |
| 68462 | Glenmark | Inmar | 3-6 | No | Short window |
| 50228 | Endo Pharmaceuticals | PharmaLink | 6-12 | Yes | Brand |
| 00378 | Mylan (Viatris) | Qualanex | 6-6 | Yes | Tablets only |
| 64980 | Rising Pharmaceuticals | — | — | — | **No return policy (TBD)** |

**Test scenarios for `POST /api/policies/check`:**

```bash
# Returnable (Solco, exp in ~3 months)
curl -X POST http://localhost:3000/api/policies/check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"ndc":"43547-325-06","expirationDate":"2026-06-15"}'

# Too early (exp far in future)
curl -X POST http://localhost:3000/api/policies/check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"ndc":"43547-325-06","expirationDate":"2028-06-15"}'

# Too late (expired > 12 months ago)
curl -X POST http://localhost:3000/api/policies/check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"ndc":"43547-325-06","expirationDate":"2024-01-01"}'

# TBD — no policy (Rising labeler 64980)
curl -X POST http://localhost:3000/api/policies/check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"ndc":"64980-0100-01","expirationDate":"2026-06-15"}'

# NDC exception (Teva controlled substance)
curl -X POST http://localhost:3000/api/policies/check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"ndc":"00093-0150-01","expirationDate":"2026-06-15"}'

# Partial rejected (Accord — no partials)
curl -X POST http://localhost:3000/api/policies/check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"ndc":"16729-0100-01","expirationDate":"2026-06-15","isPartial":true,"dosageForm":"TABLET"}'

# Partial accepted (Solco)
curl -X POST http://localhost:3000/api/policies/check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"ndc":"43547-325-06","expirationDate":"2026-06-15","isPartial":true,"dosageForm":"TABLET, DELAYED RELEASE"}'

# Unknown manufacturer (TBD)
curl -X POST http://localhost:3000/api/policies/check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"ndc":"99999-0001-01","expirationDate":"2026-06-15"}'
```

---

## 5. Integration with Module 4 (Add Item Flow)

When a product is scanned and added to a return transaction, the frontend should:

1. After barcode scan → get NDC, expiration date, dosage form from scan response
2. Call `POST /api/policies/check` with those values
3. Display the result: status badge (Returnable / Non-Returnable / TBD), destination, reason
4. Auto-populate the item form fields: `returnStatus`, `destination`, `nonReturnableReason`
5. If `too_early` → show `expectedReturnableDate` (future Wine Cellar routing)

This can be done either:
- **Option A:** Frontend calls `/api/policies/check` separately and shows result before saving
- **Option B:** Backend calls the policy engine inside the add-item flow (requires backend change in Module 6)

For now, **Option A** is recommended so the user sees the policy result before confirming.
