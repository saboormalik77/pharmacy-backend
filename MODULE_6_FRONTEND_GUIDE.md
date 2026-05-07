# Module 6: Item Routing & Disposition — Frontend Developer Guide

> **For:** Younas (Admin Frontend)
> **Backend status:** All APIs complete and ready for integration
> **Base URL:** `http://localhost:3000`

---

## Overview

Module 6 extends the item-adding flow (Module 4) with automatic classification from the Policy Engine (Module 5). When an item is scanned and saved, the backend auto-classifies it as **returnable**, **non-returnable**, or **TBD**. The frontend needs to:

1. **Show the classification result** visually after saving an item (Task 6.5)
2. **Provide a TBD items view** where staff can manually resolve unclassified items (Task 6.6)
3. **Integrate with the destruction API** for items routed to destruction

---

## Task 6.5: Show Routing Result in Adding Products Mode

### Location
`admin/app/warehouse/returns/[id]/add-items/page.tsx`

### What Changed in the API

The `POST /api/return-transactions/:transactionId/items` endpoint now returns an extra `policyCheck` object when auto-classification runs:

#### Request (same as before)
```bash
curl -X POST http://localhost:3000/api/return-transactions/{transactionId}/items \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "ndc": "43547-325-06",
    "expirationDate": "2025-11-10",
    "proprietaryName": "DOXYCYCLINE HYCLATE",
    "manufacturer": "Solco Healthcare US LLC",
    "quantity": 1,
    "fullPackageSize": 60,
    "isPartial": false,
    "scanSource": "gs1_qr"
  }'
```

#### New Response Shape
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "transactionId": "uuid",
    "ndc": "43547-325-06",
    "returnStatus": "returnable",
    "destination": "inmar",
    "nonReturnableReason": null,
    "...": "other item fields"
  },
  "policyCheck": {
    "status": "returnable",
    "reason": null,
    "destination": "inmar",
    "discountRate": 0.02,
    "reimbursementType": "credit",
    "policyNumber": 1,
    "policyDescription": "Standard return",
    "expectedReturnableDate": null,
    "windowStart": "2025-05-10",
    "windowEnd": "2026-11-10",
    "partialsAccepted": true,
    "manufacturerName": "Solco Healthcare US LLC",
    "manufacturerPolicyId": "uuid",
    "autoRaEmail": "returns@solco.com"
  },
  "warning": "Duplicate NDC + lot number detected in this transaction",
  "duplicateItemId": "uuid-if-duplicate"
}
```

> **Note:** `policyCheck` is ONLY present when auto-classification ran. If the client sends `returnStatus` explicitly, the policy engine is skipped.

### UI Requirements

After an item is saved, show a **classification banner** above or below the item row:

| Status | Color | Icon | Message |
|--------|-------|------|---------|
| `returnable` | Green (`#22c55e`) | ✅ | "Returnable — Destination: {destination}" |
| `non_returnable` (reason=`date`) | Orange (`#f59e0b`) | ⏰ | "Not returnable yet. Becomes eligible: {expectedReturnableDate}" |
| `non_returnable` (reason=`policy`) | Red (`#ef4444`) | ❌ | "Non-returnable — {policyDescription}" |
| `non_returnable` (reason=`too_late`) | Red (`#ef4444`) | ❌ | "Non-returnable — Past return window (expired {windowEnd})" |
| `tbd` | Yellow (`#eab308`) | ❓ | "Policy not found. Needs manual research." |

### Implementation Guidance

```typescript
// After saving item, check response for policyCheck
const response = await addItemToTransaction(transactionId, itemData);

if (response.policyCheck) {
  const { status, reason, destination, expectedReturnableDate, policyDescription } = response.policyCheck;
  
  if (status === 'returnable') {
    showBanner('success', `Returnable — Destination: ${destination}`);
  } else if (status === 'non_returnable') {
    if (reason === 'too_early') {
      showBanner('warning', `Not returnable yet. Becomes eligible: ${expectedReturnableDate}`);
    } else {
      showBanner('error', `Non-returnable — ${policyDescription || reason}`);
    }
  } else if (status === 'tbd') {
    showBanner('info', 'Policy not found. Needs manual research.');
  }
}
```

---

## Task 6.6: Create TBD Items View

### Location
`admin/app/warehouse/tbd-items/page.tsx`

### How to Fetch TBD Items

Use the existing items list endpoint with `returnStatus=tbd` filter:

```bash
# Get all TBD items across all transactions
# You may need to iterate over open transactions, or use the items endpoint:

curl -X GET "http://localhost:3000/api/return-transactions/{transactionId}/items?returnStatus=tbd" \
  -H "Authorization: Bearer <admin_token>"
```

#### Response
```json
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": "item-uuid-1",
        "transactionId": "tx-uuid",
        "ndc": "12345-678-90",
        "proprietaryName": "SOME DRUG",
        "manufacturer": "Unknown Mfg",
        "expirationDate": "2025-06-15",
        "returnStatus": "tbd",
        "quantity": 1,
        "createdAt": "2025-03-10T14:30:00Z"
      }
    ],
    "summary": {
      "totalItems": 1,
      "totalReturnableValue": 0,
      "totalNonReturnableValue": 0,
      "totalValue": 0
    }
  }
}
```

### Resolve TBD Endpoint

```bash
curl -X PATCH "http://localhost:3000/api/return-transactions/{transactionId}/items/{itemId}/resolve" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "new_status": "returnable",
    "destination": "inmar",
    "memo": "Verified with manufacturer - standard return applies"
  }'
```

#### Response
```json
{
  "status": "success",
  "data": {
    "id": "item-uuid-1",
    "returnStatus": "returnable",
    "destination": "inmar",
    "memo": "Verified with manufacturer - standard return applies",
    "...": "other fields"
  },
  "message": "Item resolved as returnable"
}
```

#### Error Cases
```json
// Item not TBD
{
  "status": "fail",
  "message": "Item is already classified as \"returnable\". Only TBD items can be resolved."
}

// Invalid status
{
  "status": "fail",
  "message": "new_status must be \"returnable\" or \"non_returnable\""
}
```

### UI Requirements

1. **Table Columns:** NDC, Product Name, Manufacturer, Pharmacy, Transaction ID, Expiration Date, Date Added, Actions
2. **Grouping:** Group by pharmacy name, then by transaction
3. **Filters:**
   - Date range (createdAt)
   - Pharmacy dropdown
   - Search (NDC, product name)
4. **"Resolve" Button** on each row → opens a modal:
   - Radio: Returnable / Non-Returnable
   - If Returnable: Destination dropdown (inmar, qualanex, pharmalink, other)
   - If Non-Returnable: Reason text input
   - Memo/notes text area
   - Submit → calls `PATCH .../resolve`
5. **Bulk Resolve:** Checkbox selection → resolve multiple items at once (loop the PATCH calls)

---

## Destruction Records UI (Bonus — for later or inline)

### Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/api/admin/destruction` | List records (paginated, filterable) |
| `GET` | `/api/admin/destruction/pending` | Pending + scheduled items |
| `GET` | `/api/admin/destruction/stats` | Counts by status |
| `GET` | `/api/admin/destruction/:id` | Single record |
| `POST` | `/api/admin/destruction` | Create record |
| `PATCH` | `/api/admin/destruction/:id` | Update record |

### Create Destruction Record

```bash
curl -X POST http://localhost:3000/api/admin/destruction \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "pharmacyId": "pharmacy-uuid",
    "transactionItemId": "item-uuid",
    "ndc": "43547-325-06",
    "productName": "DOXYCYCLINE HYCLATE",
    "manufacturer": "Solco Healthcare",
    "lotNumber": "LOT123",
    "quantity": 60,
    "destructionReason": "non_returnable",
    "notes": "Past return window, no wine cellar option"
  }'
```

#### Response
```json
{
  "status": "success",
  "data": {
    "id": "dest-uuid",
    "pharmacyId": "pharmacy-uuid",
    "transactionItemId": "item-uuid",
    "ndc": "43547-325-06",
    "productName": "DOXYCYCLINE HYCLATE",
    "manufacturer": "Solco Healthcare",
    "lotNumber": "LOT123",
    "quantity": 60,
    "weightLbs": null,
    "destructionReason": "non_returnable",
    "status": "pending",
    "federalFormNumber": null,
    "destructionCompany": null,
    "scheduledDate": null,
    "pickedUpAt": null,
    "destroyedAt": null,
    "formUrl": null,
    "notes": "Past return window, no wine cellar option",
    "createdBy": "admin-uuid",
    "createdAt": "2025-03-11T10:00:00Z",
    "updatedAt": "2025-03-11T10:00:00Z"
  }
}
```

### List with Filters

```bash
# All records
curl "http://localhost:3000/api/admin/destruction?page=1&limit=20" \
  -H "Authorization: Bearer <admin_token>"

# Filter by status
curl "http://localhost:3000/api/admin/destruction?status=pending" \
  -H "Authorization: Bearer <admin_token>"

# Filter by pharmacy
curl "http://localhost:3000/api/admin/destruction?pharmacy_id=uuid" \
  -H "Authorization: Bearer <admin_token>"

# Search
curl "http://localhost:3000/api/admin/destruction?search=doxycycline" \
  -H "Authorization: Bearer <admin_token>"
```

#### Response
```json
{
  "status": "success",
  "data": [ /* array of destruction records */ ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20
  }
}
```

### Update Destruction Record (pickup, form, status)

```bash
curl -X PATCH http://localhost:3000/api/admin/destruction/{id} \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "picked_up",
    "destructionCompany": "Stericycle",
    "federalFormNumber": "FED-2025-001234",
    "weightLbs": 12.5
  }'
```

### Get Statistics

```bash
curl "http://localhost:3000/api/admin/destruction/stats" \
  -H "Authorization: Bearer <admin_token>"
```

#### Response
```json
{
  "status": "success",
  "data": {
    "total": 42,
    "pending": 15,
    "scheduled": 8,
    "pickedUp": 10,
    "destroyed": 7,
    "cancelled": 2
  }
}
```

---

## TypeScript Types

```typescript
// Policy check result (returned in add-item response)
interface PolicyCheckResult {
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

// Add-item response (extended)
interface AddItemResponse {
  status: 'success';
  data: ReturnTransactionItem;
  policyCheck?: PolicyCheckResult;
  warning?: string;
  duplicateItemId?: string;
}

// Resolve TBD payload
interface ResolveTBDPayload {
  new_status: 'returnable' | 'non_returnable';
  reason?: string;
  destination?: 'inmar' | 'qualanex' | 'pharmalink' | 'other';
  memo?: string;
}

// Destruction record
interface DestructionRecord {
  id: string;
  pharmacyId: string;
  transactionItemId: string | null;
  ndc: string | null;
  productName: string | null;
  manufacturer: string | null;
  lotNumber: string | null;
  quantity: number;
  weightLbs: number | null;
  destructionReason: string;
  status: 'pending' | 'scheduled' | 'picked_up' | 'destroyed' | 'cancelled';
  federalFormNumber: string | null;
  destructionCompany: string | null;
  scheduledDate: string | null;
  pickedUpAt: string | null;
  destroyedAt: string | null;
  formUrl: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// Create destruction payload
interface CreateDestructionPayload {
  pharmacyId: string;
  transactionItemId?: string;
  ndc?: string;
  productName?: string;
  manufacturer?: string;
  lotNumber?: string;
  quantity?: number;
  weightLbs?: number;
  destructionReason?: string;
  destructionCompany?: string;
  scheduledDate?: string;
  notes?: string;
}

// Update destruction payload
interface UpdateDestructionPayload {
  status?: 'pending' | 'scheduled' | 'picked_up' | 'destroyed' | 'cancelled';
  federalFormNumber?: string;
  destructionCompany?: string;
  scheduledDate?: string;
  pickedUpAt?: string;
  destroyedAt?: string;
  formUrl?: string;
  weightLbs?: number;
  notes?: string;
}

// Destruction stats
interface DestructionStats {
  total: number;
  pending: number;
  scheduled: number;
  pickedUp: number;
  destroyed: number;
  cancelled: number;
}
```

---

## Redux Slice Recommendations

### `tdItemsSlice.ts`
```typescript
// State
interface TBDItemsState {
  items: ReturnTransactionItem[];
  loading: boolean;
  error: string | null;
  resolving: Record<string, boolean>; // itemId -> loading
}

// Thunks
// fetchTBDItems(transactionId) -> GET .../items?returnStatus=tbd
// resolveItem({ transactionId, itemId, payload }) -> PATCH .../resolve
```

### `destructionSlice.ts`
```typescript
// State
interface DestructionState {
  records: DestructionRecord[];
  pendingItems: DestructionRecord[];
  stats: DestructionStats | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
}

// Thunks
// fetchDestructionRecords(filters) -> GET /api/admin/destruction
// fetchPendingItems(pharmacyId?) -> GET /api/admin/destruction/pending
// fetchStats(pharmacyId?) -> GET /api/admin/destruction/stats
// createDestructionRecord(payload) -> POST /api/admin/destruction
// updateDestructionRecord({ id, payload }) -> PATCH /api/admin/destruction/:id
```

---

## Pages to Create

| Page | Route | Priority |
|------|-------|----------|
| TBD Items Queue | `/warehouse/tbd-items` | High |
| Destruction Records | `/warehouse/destruction` | Medium |

---

## Sidebar Navigation Updates

Add under the existing "Warehouse" section:
- **TBD Items** — `/warehouse/tbd-items` — Badge showing count of unresolved TBD items
- **Destruction** — `/warehouse/destruction` — Badge showing pending count

---

## Testing Commands

### Login first
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' | jq -r '.data.token')
```

### Add item (auto-classifies)
```bash
curl -X POST http://localhost:3000/api/return-transactions/{txId}/items \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ndc": "00002-4462-30",
    "expirationDate": "2026-01-15",
    "proprietaryName": "PROZAC",
    "manufacturer": "Eli Lilly",
    "quantity": 1,
    "scanSource": "manual"
  }'
```

### Resolve TBD item
```bash
curl -X PATCH http://localhost:3000/api/return-transactions/{txId}/items/{itemId}/resolve \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"new_status":"returnable","destination":"inmar","memo":"Verified with Eli Lilly"}'
```

### Create destruction record
```bash
curl -X POST http://localhost:3000/api/admin/destruction \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pharmacyId": "pharmacy-uuid",
    "ndc": "43547-325-06",
    "productName": "DOXYCYCLINE HYCLATE",
    "manufacturer": "Solco Healthcare",
    "quantity": 60,
    "destructionReason": "Past return window"
  }'
```

### Mark as picked up
```bash
curl -X PATCH http://localhost:3000/api/admin/destruction/{id} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"picked_up","destructionCompany":"Stericycle","federalFormNumber":"FED-2025-001234","weightLbs":12.5}'
```
