# Wine Cellar System — Comprehensive Technical Findings

**Date:** March 12, 2026  
**Scope:** Complete integration of wine cellar storage and deferred return workflow

---

## 1. Return Transaction Item Table Structure

### Table: `return_transaction_items`
**File:** [scripts/fcr_07_create_return_transaction_items.sql](scripts/fcr_07_create_return_transaction_items.sql#L1)

#### Key Columns for Wine Cellar Routing

| Column | Type | Purpose |
|--------|------|---------|
| `return_status` | TEXT | Determines item disposition: `'returnable'`, `'non_returnable'`, `'tbd'` |
| `non_returnable_reason` | TEXT | Reason for non-returnability: `'date'` (wine cellar), `'policy'` (destroy), `'no_data'`, `'manual'` |
| `destination` | TEXT | Where returnable items go: `'inmar'`, `'qualanex'`, `'pharmalink'`, `'other'` |
| `wine_cellar_id` | UUID | **Link to `wine_cellar` table** — populated when item routed to wine cellar |

**Decision Logic:**
- If `return_status = 'non_returnable'` AND `non_returnable_reason = 'date'` → Item goes to **Wine Cellar**
- If `return_status = 'non_returnable'` AND `non_returnable_reason IN ('policy', 'no_partials', 'dosage_form_not_accepted')` → Item goes to **Destruction**
- If `return_status = 'returnable'` → Item stays in current return, uses `destination` field

**Indexes:**
```sql
CREATE INDEX idx_rti_status ON return_transaction_items(return_status);
CREATE INDEX idx_rti_expiration ON return_transaction_items(expiration_date);
```

---

## 2. Wine Cellar Table Structure

### Table: `wine_cellar`
**File:** [scripts/fcr_11_create_wine_cellar.sql](scripts/fcr_11_create_wine_cellar.sql#L1-L60)

#### Column Definitions (23 columns)

```sql
CREATE TABLE wine_cellar (
  id UUID PRIMARY KEY,
  
  -- Link back to transaction item that triggered wine cellar entry
  transaction_item_id UUID REFERENCES return_transaction_items(id),
  
  -- Product identification
  ndc VARCHAR(13),
  ndc_10 VARCHAR(12),
  product_name TEXT,
  manufacturer TEXT,
  lot_number TEXT,
  serialNumber TEXT,
  expiration_date DATE,
  
  -- Quantity & value
  quantity INTEGER,
  standard_price DECIMAL(12,2),
  estimated_value DECIMAL(12,2),
  is_partial BOOLEAN,
  partial_percentage DECIMAL(5,2),
  
  -- Shelving details
  date_shelved TIMESTAMPTZ (DEFAULT NOW()),
  expected_returnable_date DATE  -- ★ KEY FIELD: When product becomes returnable
  physical_location TEXT,        -- Box label, shelf location
  baggie_barcode TEXT,           -- Barcode on the physical baggie
  
  -- Status tracking
  status TEXT CHECK (status IN ('shelved', 'ready_to_return', 'returned', 'destroyed'))
  
  -- When item was marked as returned
  returned_in_transaction_id UUID,
  returned_at TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### Status Values

| Status | Meaning | Transition |
|--------|---------|-----------|
| `shelved` | Item stored, waiting for eligibility | Initial state |
| `ready_to_return` | Expected date reached, surfaced by cron | Manually or auto-surfaced |
| `returned` | Added back to a return transaction | After processor selects item |
| `destroyed` | Marked as destroyed instead of returned | Manual destruction decision |

#### Key Indexes
```sql
idx_wc_pharmacy         -- Query items by pharmacy
idx_wc_status           -- Filter by status
idx_wc_expected_date    -- Find items due for return
idx_wc_transaction_item -- Link back to return item
```

---

## 3. Policy Engine Decision Logic

### Service: Policy Engine
**File:** [src/services/policyEngineService.ts](src/services/policyEngineService.ts#L1-L300)

### Function: `checkReturnability()`
**Signature:**
```typescript
export async function checkReturnability(
  input: CheckReturnabilityInput
): Promise<ReturnabilityResult>
```

### Decision Algorithm (8 Steps)

#### Step 1: Lookup Manufacturer Policy
```
Extract labeler_id (first 5 digits of NDC)
  → Query manufacturer_policies table
  → Get return_window (months_before_expiration, months_after_expiration)
```

#### Step 2-3: Check Policy Exceptions
```
Query non_returnable_products for exact NDC match
  → If found AND matches expiration date → status='non_returnable', reason='policy_exception'
  → Destruction workflow
```

#### Step 4: Calculate Return Window
```typescript
windowStart = expiration_date - months_before_expiration
windowEnd   = expiration_date + months_after_expiration

// Example: 6 months before to 6 months after
// If product expires 2026-06-15:
//   - Can return from 2025-12-15 to 2026-12-15
```

#### Step 5-6: Check Timing
```
IF today < windowStart:
  → status='non_returnable'
  → reason='too_early'
  → expectedReturnableDate = windowStart  ★ Wine Cellar trigger
  
IF today > windowEnd:
  → status='non_returnable'
  → reason='too_late'
  → Destruction workflow
```

#### Step 7: Check Partial Acceptance
```
IF isPartial AND !rp.partials_accepted:
  → status='non_returnable'
  → reason='no_partials'
  → Destruction workflow
```

#### Step 8: Return Result
```typescript
// ★ WINE CELLAR CASE: too_early
{
  status: 'non_returnable',
  reason: 'too_early',
  destination: 'inmar', // (from policy)
  expectedReturnableDate: '2026-12-15',  // Populates wine_cellar.expected_returnable_date
  windowStart: '2025-12-15',
  windowEnd: '2026-12-15'
}

// ★ RETURNABLE CASE
{
  status: 'returnable',
  reason: null,
  destination: 'inmar',
  expectedReturnableDate: null
}
```

### ReturnabilityResult Interface
**File:** [src/services/policyEngineService.ts](src/services/policyEngineService.ts#L34-L48)

```typescript
export interface ReturnabilityResult {
  status: 'returnable' | 'non_returnable' | 'tbd';
  reason: string | null;  // 'too_early' → wine cellar
  destination: string | null;
  expectedReturnableDate: string | null;  // ★ Wine cellar date
  windowStart: string | null;
  windowEnd: string | null;
  policyDescription: string | null;
  manufacturerName: string | null;
  discountRate: number | null;
  // ... 5 more fields
}
```

---

## 4. Item Routing in Add Item Controller

### Controller: `returnTransactionItemsController`
**File:** [src/controllers/returnTransactionItemsController.ts](src/controllers/returnTransactionItemsController.ts#L1-L120)

### Auto-Classification Point
**Lines 44-67:** When item is added to return transaction:

```typescript
// Only auto-classify if processor didn't explicitly choose
const shouldAutoClassify = 
  (!returnStatus || returnStatus === 'tbd') && body.ndc && body.expirationDate;

if (shouldAutoClassify) {
  policyResult = await checkReturnability({
    ndc: body.ndc,
    expirationDate: body.expirationDate,
    isPartial,
    dosageForm: body.dosageForm,
  });

  returnStatus = policyResult.status;  // 'returnable' | 'non_returnable' | 'tbd'
  
  // Map reason to returnable-specific reason
  if (policyResult.status === 'non_returnable' && policyResult.reason === 'too_early') {
    nonReturnableReason = 'date';  // ★ This triggers wine cellar routing
  }
}
```

### Return Item Service
**File:** [src/services/returnTransactionItemsService.ts](src/services/returnTransactionItemsService.ts#L131-L140)

```typescript
export const addItem = async (
  itemData: AddItemData
): Promise<{ item, duplicate, duplicateItemId }> => {
  const { data, error } = await sb.rpc('add_return_transaction_item', {
    p_transaction_id: itemData.transactionId,
    p_data: itemData,  // Contains returnStatus, nonReturnableReason
  });
  
  return {
    item: data.data as ReturnTransactionItem,
    // ... response fields
  };
};
```

---

## 5. Wine Cellar Addition — Processor's UI Decision Point

### Container: Return Detail Page
**File:** [admin/app/warehouse/returns/[id]/page.tsx](admin/app/warehouse/returns/[id]/page.tsx#L1-L100)

### 5.1 Wine Cellar Items Modal Button
**Lines 551-554:**
```tsx
<Button variant="outline" size="sm" onClick={openWcModal}>
  <Archive className="w-4 h-4 mr-1" /> Wine Cellar Items
</Button>
```
- **Trigger:** Click on "Wine Cellar Items" button in return detail header
- **Icon:** Archive icon with purple color
- **Visibility:** Only shown when `canDoAction(tx, 'edit')` is true (in_progress status)

### 5.2 Modal Handler: Opens Wine Cellar Item Selection
**Lines 223-236:**
```typescript
const openWcModal = async () => {
  setWcModal(true);
  setWcLoading(true);
  
  // Fetch wine cellar items with status='ready_to_return' for this pharmacy
  const res = await apiClient.get('/admin/wine-cellar', true, {
    pharmacy_id: tx.pharmacyId,
    status: 'ready_to_return',  // ★ Query filter
    limit: '100'
  });
  
  setWcItems(res.data.items || []);
  setWcLoading(false);
};
```

### 5.3 Wine Cellar Items Modal UI
**Lines 835-950:**

**Structure:**
1. **Header:** "Add Wine Cellar Items" with Archive icon
2. **Loading State:** Spinner if fetching items
3. **Empty State:** "No wine cellar items ready to return"
4. **Table Display (if items exist):**
   - Columns: Checkbox, NDC, Product, QTY, Price, Shelved Date, Location
   - Rows: Each row shows one `wine_cellar` item with `status='ready_to_return'`
   - Select/Deselect: Toggle individual items or select all
   - Highlight: Selected rows show `bg-purple-50`

**Add Button:**
```typescript
<Button 
  variant="primary" 
  onClick={handleAddWcItems} 
  disabled={wcAdding || wcSelected.size === 0}
>
  {wcAdding ? 'Adding...' : `Add ${wcSelected.size} Item${wcSelected.size !== 1 ? 's' : ''}`}
</Button>
```

### 5.4 Add Wine Cellar Items Handler
**Lines 238-259:**

```typescript
const handleAddWcItems = async () => {
  if (wcSelected.size === 0 || !tx) return;
  
  for (const wcId of wcSelected) {
    // Call API to mark wine cellar item as returned
    await apiClient.post(
      `/admin/wine-cellar/${wcId}/return`,
      { transactionId: tx.id },
      true
    );
  }
  
  // Success: refresh items and close modal
  showToast(`${successCount} wine cellar item(s) marked as returned!`);
  refreshItems();
  setWcModal(false);
};
```

---

## 6. Wine Cellar API Endpoints & Integration

### Routes
**File:** [src/routes/wineCellarRoutes.ts](src/routes/wineCellarRoutes.ts)

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| **GET** | `/api/admin/wine-cellar` | List items (filter by pharmacy_id, status, expected_month) |
| **POST** | `/api/admin/wine-cellar` | Add item to wine cellar |
| **GET** | `/api/admin/wine-cellar/stats` | Get stats (count by status, total value) |
| **GET** | `/api/admin/wine-cellar/:id` | Get single item details |
| **PATCH** | `/api/admin/wine-cellar/:id` | Update item (location, barcode, notes, price) |
| **POST** | `/api/admin/wine-cellar/:id/return` | Mark item as returned (link to transaction) |
| **POST** | `/api/admin/wine-cellar/check-ready` | Surface items past expected date (cron job) |

### Controller
**File:** [src/controllers/wineCellarController.ts](src/controllers/wineCellarController.ts#L7-L129)

#### POST `/api/admin/wine-cellar` — Add Item
**Purpose:** Route item to wine cellar when classified as `non_returnable` with `reason='too_early'`

**Request Payload:**
```json
{
  "pharmacy_id": "uuid",
  "transaction_item_id": "uuid",  // Link to return_transaction_items
  "ndc": "50090-0847-1",
  "product_name": "AMOXICILLIN",
  "manufacturer": "Abbott",
  "lot_number": "ABC123",
  "expiration_date": "2026-08-15",
  "quantity": 100,
  "standard_price": 12.50,
  "is_partial": false,
  "expected_returnable_date": "2026-02-15",  // ★ From policy engine
  "physical_location": null,
  "baggie_barcode": null,
  "notes": null,
  "created_by": "processor-uuid"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "wine-cellar-uuid",
    "pharmacyId": "uuid",
    "transactionItemId": "uuid",
    "ndc": "50090-0847-1",
    "productName": "AMOXICILLIN",
    "quantity": 100,
    "standardPrice": 12.50,
    "estimatedValue": 1250.00,
    "status": "shelved",
    "expectedReturnableDate": "2026-02-15",
    "dateShelved": "2026-03-12T10:30:00Z",
    "createdAt": "2026-03-12T10:30:00Z"
  }
}
```

#### POST `/api/admin/wine-cellar/:id/return` — Mark as Returned
**Purpose:** When processor selects item from "Wine Cellar Items" modal

**Request Payload:**
```json
{
  "transactionId": "return-transaction-uuid"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "wine-cellar-uuid",
    "status": "returned",  // ★ Status changed from 'shelved' or 'ready_to_return'
    "returnedInTransactionId": "return-transaction-uuid",
    "returnedAt": "2026-03-12T14:45:00Z"
  }
}
```

#### POST `/api/admin/wine-cellar/check-ready` — Surface Ready Items
**Purpose:** Monthly cron job to surface items that became eligible

**Logic (RPC Function):**
```sql
-- Find all items where expected_returnable_date <= TODAY
UPDATE wine_cellar
SET status = 'ready_to_return'
WHERE status = 'shelved'
  AND expected_returnable_date <= CURRENT_DATE;
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "surfacedCount": 15,
    "items": [
      {
        "id": "uuid",
        "ndc": "50090-0847-1",
        "productName": "AMOXICILLIN",
        "expectedReturnableDate": "2026-02-15",
        "quantity": 100
      }
    ]
  }
}
```

---

## 7. Database Integration Flow

### RPC Functions
**File:** [scripts/fcr_11_create_wine_cellar.sql](scripts/fcr_11_create_wine_cellar.sql#L137-L450)

#### Function: `add_to_wine_cellar()`
**Lines 137-230:**

**Validations:**
1. Pharmacy exists
2. If `transaction_item_id` provided → item exists
3. No duplicate item in wine cellar (not destroyed)

**Operations:**
```sql
-- Calculate estimated_value
IF v_is_partial THEN
  v_estimated_value := v_standard_price * v_quantity * (v_partial_percentage / 100);
ELSE
  v_estimated_value := v_standard_price * v_quantity;
END IF;

-- Insert into wine_cellar
INSERT INTO wine_cellar (
  pharmacy_id, transaction_item_id, ndc, ndc_10, product_name,
  manufacturer, lot_number, expiration_date, quantity, standard_price,
  estimated_value, is_partial, partial_percentage,
  expected_returnable_date, physical_location, baggie_barcode,
  status, notes, created_by, created_at, updated_at
) VALUES (...)
RETURNING _wc_to_json(v_new);
```

#### Function: `mark_wine_cellar_returned()`
**Lines 448-490:**

**Validations:**
1. Wine cellar item exists
2. Check transaction exists

**Operations:**
```sql
UPDATE wine_cellar
SET 
  status = 'returned',
  returned_in_transaction_id = v_transaction_id,
  returned_at = NOW()
WHERE id = v_wine_cellar_id;
```

#### Function: `check_and_surface_ready_items()`
**Lines 492-540:**

**Operations:**
```sql
-- Bulk update items that became eligible
UPDATE wine_cellar
SET status = 'ready_to_return'
WHERE 
  status = 'shelved'
  AND expected_returnable_date <= CURRENT_DATE;

RETURN jsonb_build_object(
  'surfaced_count', v_count,
  'items', (SELECT jsonb_agg(_wc_to_json(r)) FROM ...)
);
```

---

## 8. Frontend Redux Integration

### Redux Slice
**File:** [admin/lib/store/wineCellarSlice.ts](admin/lib/store/wineCellarSlice.ts)

### Async Thunks (5 thunks)

```typescript
// 1. Fetch wine cellar items (with filters)
export const fetchWineCellarItems = createAsyncThunk(
  'wineCellar/fetchItems',
  async (params: FetchWineCellarParams) => {
    // GET /admin/wine-cellar?pharmacy_id=...&status=ready_to_return&expected_month=...
  }
);

// 2. Fetch statistics
export const fetchWineCellarStats = createAsyncThunk(
  'wineCellar/fetchStats',
  async (pharmacyId) => {
    // GET /admin/wine-cellar/stats?pharmacy_id=...
  }
);

// 3. Update item (location, barcode, notes, price)
export const updateWineCellarItem = createAsyncThunk(
  'wineCellar/updateItem',
  async ({ id, payload }) => {
    // PATCH /admin/wine-cellar/:id
  }
);

// 4. Mark as returned (when processor adds to return)
export const markWineCellarReturned = createAsyncThunk(
  'wineCellar/markReturned',
  async ({ id, transactionId }) => {
    // POST /admin/wine-cellar/:id/return
  }
);

// 5. Surface ready items (cron trigger)
export const checkAndSurfaceReady = createAsyncThunk(
  'wineCellar/checkReady',
  async () => {
    // POST /admin/wine-cellar/check-ready
  }
);
```

---

## 9. Complete End-to-End Flow

### Scenario: Non-Returnable by Date → Wine Cellar

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. ITEM ENTRY                                                   │
│ Processor scans: NDC=50090-0847-1, Expires=2026-08-15          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. POLICY ENGINE (checkReturnability)                          │
│ - Extract labeler_id: 50090                                    │
│ - Lookup policy: return_window = 6 months before/after         │
│ - Calculate window: 2026-02-15 to 2026-12-15                 │
│ - Today is 2026-03-12 < 2026-02-15? NO (within window? NO)    │
│ - Wait, let me recalculate...                                 │
│   Actually: TODAY (2026-03-12) > WINDOW_START (2026-02-15)    │
│   So: TODAY (2026-03-12) < WINDOW_END (2026-12-15)            │
│   Result: RETURNABLE                                          │
│                                                                 │
│ But if TODAY < WINDOW_START (too early):                      │
│   reason='too_early'                                          │
│   expectedReturnableDate=WINDOW_START                         │
│   status='non_returnable'                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. STORE IN RETURN_TRANSACTION_ITEMS                           │
│ ✓ return_status = 'non_returnable'                            │
│ ✓ non_returnable_reason = 'date'  ← Wine cellar marker        │
│ ✓ destination = 'inmar' (from policy)                         │
│ ✓ Created at: 2026-03-12T10:30:00Z                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. ADD TO WINE CELLAR TABLE                                    │
│ POST /api/admin/wine-cellar                                   │
│ Payload includes:                                              │
│ ✓ transaction_item_id = UUID (link to return_transaction_items)
│ ✓ expected_returnable_date = WINDOW_START (2026-02-15)        │
│ ✓ pharmacy_id = UUID                                          │
│ ✓ status = 'shelved'                                          │
│ ✓ date_shelved = NOW()                                        │
│ ✓ estimated_value = calculated from quantity × price         │
│                                                                 │
│ Response: wine_cellar record created                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
         ┌─────────────────────────────────────┐
         │ MONTHLY CRON: check-ready          │
         └─────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. SURFACE READY ITEMS (Monthly Check)                         │
│ POST /api/admin/wine-cellar/check-ready                       │
│ Updates all items where:                                       │
│   status = 'shelved'                                          │
│   expected_returnable_date <= TODAY                           │
│                                                                 │
│ Sets: status = 'ready_to_return'  ← Now queryable           │
│ (Monthly or manually triggered)                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. NEXT RETURN TRANSACTION                                    │
│ Processor opens return for same pharmacy                       │
│ Clicks: "Wine Cellar Items" button                            │
│                                                                 │
│ Modal fetches:                                                 │
│ GET /admin/wine-cellar?pharmacy_id=X&status=ready_to_return   │
│                                                                 │
│ Shows table with items now ready to return                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. PROCESSOR SELECTS ITEMS + ADDS TO RETURN                    │
│ Checkbox selected → status = 'returned'                        │
│ Click "Add Items"                                              │
│                                                                 │
│ For each selected wine_cellar item:                           │
│ POST /admin/wine-cellar/:id/return                            │
│   { transactionId: current_return_uuid }                      │
│                                                                 │
│ Updates wine_cellar:                                          │
│   status = 'returned'                                         │
│   returned_in_transaction_id = current_return_uuid           │
│   returned_at = NOW()                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. RETURN INCLUDES WINE CELLAR ITEM                            │
│ Item now appears in return manifest                           │
│ Processor continues with return finalization                  │
│ Item will be returned to manufacturer (in window now)         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Key Integration Points Summary

### 1. **Classification Entry Point**
- **When:** Item added to return transaction
- **Where:** [src/controllers/returnTransactionItemsController.ts](src/controllers/returnTransactionItemsController.ts#L44-L67)
- **Logic:** Policy engine auto-classifies if `returnStatus` not explicitly set
- **Result:** `non_returnable_reason = 'date'` triggers wine cellar addition

### 2. **Wine Cellar Addition**
- **When:** Item classified as `non_returnable` with `reason='too_early'`
- **API:** `POST /api/admin/wine-cellar`
- **Service:** [src/services/wineCellarService.ts](src/services/wineCellarService.ts#L167-L175)
- **Database:** RPC `add_to_wine_cellar()` in [scripts/fcr_11_create_wine_cellar.sql](scripts/fcr_11_create_wine_cellar.sql#L137-L230)

### 3. **Processor UI Selection**
- **Button:** "Wine Cellar Items" in return detail page
- **File:** [admin/app/warehouse/returns/[id]/page.tsx](admin/app/warehouse/returns/[id]/page.tsx#L551-L554)
- **Modal:** Lines 835-950 (toggle select, add button)
- **Handler:** `openWcModal()` at lines 223-236, `handleAddWcItems()` at lines 238-259

### 4. **Monthly Surfacing (Cron Job)**
- **API:** `POST /api/admin/wine-cellar/check-ready`
- **RPC:** `check_and_surface_ready_items()` in SQL
- **Effect:** Updates status from 'shelved' → 'ready_to_return' for eligible items
- **Can be:** Manual button click or external cron scheduler

### 5. **Return Transaction Item Linking**
- **Column:** `wine_cellar.transaction_item_id` links back to `return_transaction_items`
- **Purpose:** Bidirectional tracking of where item originated
- **Query:** Get original scanned data if needed for manifest

### 6. **Return Linking**
- **Column:** `wine_cellar.returned_in_transaction_id` links to return it's added to
- **Updated:** When processor calls `POST /api/admin/wine-cellar/:id/return`
- **Use Case:** Track which return the aged item finally went to

---

## 11. Database Queries for Debugging

### Find items awaiting wine cellar return
```sql
SELECT COUNT(*) 
FROM wine_cellar 
WHERE status = 'ready_to_return' 
  AND pharmacy_id = '{{pharmacy_uuid}}';
```

### Find items shelved but not yet ready
```sql
SELECT ndc, product_name, expected_returnable_date, CURRENT_DATE as today
FROM wine_cellar 
WHERE status = 'shelved' 
  AND expected_returnable_date > CURRENT_DATE
ORDER BY expected_returnable_date ASC;
```

### Find items where return_transaction_item points to wine_cellar
```sql
SELECT rti.id, rti.ndc, rti.return_status, rti.non_returnable_reason, wc.id as wine_cellar_id
FROM return_transaction_items rti
LEFT JOIN wine_cellar wc ON rti.id = wc.transaction_item_id
WHERE rti.non_returnable_reason = 'date'
ORDER BY rti.created_at DESC;
```

---

## Key Files Reference

| Layer | File | Purpose |
|-------|------|---------|
| **Database** | [scripts/fcr_11_create_wine_cellar.sql](scripts/fcr_11_create_wine_cellar.sql) | Wine cellar table + RPC functions |
| **Database** | [scripts/fcr_07_create_return_transaction_items.sql](scripts/fcr_07_create_return_transaction_items.sql) | Return item table with destination columns |
| **Backend Service** | [src/services/policyEngineService.ts](src/services/policyEngineService.ts) | Policy decision logic (determines wine cellar) |
| **Backend Service** | [src/services/wineCellarService.ts](src/services/wineCellarService.ts) | Wine cellar RPC wrappers |
| **Backend Controller** | [src/controllers/returnTransactionItemsController.ts](src/controllers/returnTransactionItemsController.ts) | Add item entry point (auto-classify) |
| **Backend Controller** | [src/controllers/wineCellarController.ts](src/controllers/wineCellarController.ts) | Wine cellar API handlers |
| **Backend Routes** | [src/routes/wineCellarRoutes.ts](src/routes/wineCellarRoutes.ts) | Wine cellar API endpoints |
| **Frontend UI** | [admin/app/warehouse/returns/[id]/page.tsx](admin/app/warehouse/returns/[id]/page.tsx) | Processor return detail page (wine cellar modal) |
| **Frontend UI** | [admin/app/warehouse/wine-cellar/page.tsx](admin/app/warehouse/wine-cellar/page.tsx) | Wine cellar management page |
| **Frontend Redux** | [admin/lib/store/wineCellarSlice.ts](admin/lib/store/wineCellarSlice.ts) | State management for wine cellar items |

---

## Summary

**The wine cellar system is a sophisticated deferred return workflow where:**

1. **Classification** happens automatically when items are scanned (policy engine)
2. **Non-returnable by date** items are marked with reason='date' and routed to wine_cellar table
3. **Expected return date** is calculated from manufacturer policy window
4. **Monthly surfacing** updates items to 'ready_to_return' status when they become eligible
5. **Processor UI** (modal in return detail page) allows selecting ready items to add back to returns
6. **Bidirectional linking** via transaction_item_id and returned_in_transaction_id maintains audit trail
