# Warehouse Verification Flow — Frontend Implementation Guide

All endpoints are under `POST/GET/PATCH /api/admin/warehouse/...` and require admin auth + `warehouse` permission.

---

## API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/received` | List returns ready for verification |
| POST | `/:id/start-verification` | Start verification, record box count |
| GET | `/:id/verification-summary` | Get full verification state |
| PATCH | `/:id/items/:itemId/verify-v2` | Verify a single item |
| POST | `/:id/surplus` | Add a surplus item |
| GET | `/:id/surplus` | List surplus for a return |
| POST | `/:id/complete-verification` | Complete verification |
| POST | `/:id/discrepancy` | Manually report a discrepancy |
| GET | `/:id/discrepancies` | List discrepancies for a return |
| PATCH | `/discrepancies/:discrepancyId/resolve` | Resolve/dismiss a discrepancy |
| GET | `/surplus` | List all surplus (across all returns) |

---

## Flow Step by Step

### Step 1: Pick a Return to Verify

**Page**: Warehouse Verification list (`/warehouse/verification`) or Receiving → Received tab (Verify should navigate to `/warehouse/verification/:id`).

**Note**: The **box-count step** lives only on the **session detail** route (`/warehouse/verification/:id`), not on the list page. After the summary loads, if v2 has not started (`verified_at` and `pieces_received` are still null on a `received` return), the UI shows “How many boxes did you physically receive?” first.

**API**: `GET /api/admin/warehouse/received`

**Query params**: `search`, `page`, `limit`, `verificationStatus`

**List row display**: Each return JSON from `_rt_to_json` should include `verificationStatus`, `verifiedAt`, and `verificationCompletedAt` for correct badges (otherwise the UI shows “Not Started” for completed rows). Run `scripts/fcr_49_rt_json_warehouse_verification_status.sql` after FCR-47 (and after your current `_rt_to_json` definition, e.g. `fix_totals_and_manifest.sql`).

**`verificationStatus` values** (applied by RPC `warehouse_list_received`; run `scripts/fcr_48_warehouse_list_received_v2_status_filters.sql` after FCR-47 so these work):

| Value | Meaning |
|--------|--------|
| *(omit or empty)* | All rows in the received/verified/closed queue |
| `not_started` | `received`, never started v2 (`verified_at` null, not completed) |
| `in_progress` | `received`, v2 started (`verified_at` set) but not completed and not legacy “integrity verified” |
| `completed` | V2 finished (`verification_completed_at` set), or status is `verified`/`closed`/`closed_out`, or legacy received row with `verified_integrity = true` |
| `verified` | Legacy filter: `verified_integrity = true` |
| `unverified` | Legacy filter: `verified_integrity = false` |

The user sees a list of returns with status `received`. They click one to start verification.

---

### Step 2: Start Verification (Box Count)

**Page**: Verification start modal/screen

**API**: `POST /api/admin/warehouse/:id/start-verification`

**Request body**:
```json
{
  "boxCount": 3
}
```

**Response**:
```json
{
  "status": "success",
  "data": {
    "transaction": { ... },
    "expectedBoxes": 3,
    "receivedBoxes": 3,
    "boxCountMatch": true,
    "totalItems": 15
  }
}
```

**Frontend behavior**:
- Show an input asking "How many boxes did you physically receive?"
- After submitting, check `boxCountMatch`
- If `false`, show a warning: "Expected X boxes, you received Y — a discrepancy has been automatically recorded"
- Then navigate to the item verification list

---

### Step 3: Verify Each Item

**Page**: Item verification list

**API (to load items)**: `GET /api/admin/warehouse/:id/verification-summary`

This returns all items with their current `verificationStatus` (null = unverified).

**Response shape**:
```json
{
  "data": {
    "transaction": { ... },
    "items": [
      {
        "id": "uuid",
        "ndc": "12345678901",
        "proprietaryName": "Drug Name",
        "genericName": "Generic Name",
        "manufacturer": "Manufacturer",
        "lotNumber": "LOT123",
        "expirationDate": "2025-06-30",
        "quantity": 10,
        "actualQuantity": null,
        "verified": false,
        "verificationStatus": null,
        "conditionNotes": null,
        "returnStatus": "returnable",
        "estimatedValue": 50.00
      }
    ],
    "counts": {
      "totalItems": 15,
      "correct": 5,
      "damaged": 1,
      "missing": 0,
      "wrongItem": 0,
      "unverified": 9,
      "surplus": 2
    },
    "surplus": [ ... ],
    "discrepancies": [ ... ],
    "discrepancyCounts": { "total": 3, "open": 2 }
  }
}
```

**For each item, user picks one**:
- **Correct** — item matches, good condition
- **Damaged** — item is present but damaged
- **Missing** — item is on the list but not in the box
- **Wrong Item** — a different product than expected

**API**: `PATCH /api/admin/warehouse/:id/items/:itemId/verify-v2`

**Request body**:
```json
{
  "verificationStatus": "correct",
  "actualQuantity": 10,
  "conditionNotes": "Package slightly dented but pills intact"
}
```

- `verificationStatus` is required: `correct`, `damaged`, `missing`, `wrong_item`
- `actualQuantity` is optional (if different from expected)
- `conditionNotes` is optional (free text, especially useful for damaged/wrong)

**Response** returns the updated item. If status is damaged/missing/wrong_item, a discrepancy is **automatically** created and the `discrepancyId` is returned in the response.

**Frontend behavior**:
- Show items in a list/table
- For each unverified item, show 4 buttons: Correct / Damaged / Missing / Wrong Item
- For Damaged/Wrong: show a text input for condition notes
- For Missing: auto-set actualQuantity to 0
- Show a progress bar: `counts.correct + counts.damaged + counts.missing + counts.wrongItem` / `counts.totalItems`
- Color-code verified items: green (correct), red (damaged), gray (missing), orange (wrong)

---

### Step 4: Report Surplus Items

**Page**: Same verification page, separate section or button "Add Surplus Item"

**API**: `POST /api/admin/warehouse/:id/surplus`

**Request body**:
```json
{
  "ndc": "98765432101",
  "productName": "Unexpected Drug Name",
  "manufacturer": "Pharma Co",
  "lotNumber": "LOT456",
  "expirationDate": "2026-01-15",
  "quantity": 5,
  "warehouseLocation": "Shelf B3, Row 2",
  "condition": "good",
  "notes": "Found in box 2, not on manifest. Likely from return RTN-2024-0045."
}
```

- `warehouseLocation` is **required** — where the surplus is physically stored
- `condition` options: `good`, `damaged`, `unknown`
- Other fields are optional but encouraged

**Response** returns the created surplus item with a `discrepancyId` (auto-created).

**Frontend behavior**:
- Show a form: NDC, Product Name, Manufacturer, Lot, Expiry, Quantity, Warehouse Location, Condition dropdown, Notes textarea
- After adding, show it in a "Surplus Items" list below the main item list
- Surplus items are **not** part of the return — they are stored separately

---

### Step 5: Complete Verification

**Page**: Bottom of verification page

**API**: `POST /api/admin/warehouse/:id/complete-verification`

**Request body** (optional):
```json
{
  "notes": "All items checked. 2 items damaged, stored surplus on Shelf B3."
}
```

**Response**:
```json
{
  "status": "success",
  "data": { ... },
  "summary": {
    "totalItems": 15,
    "correctItems": 12,
    "damagedItems": 2,
    "missingItems": 1,
    "wrongItems": 0,
    "surplusItems": 3,
    "openDiscrepancies": 5,
    "correctItemsValue": 450.00,
    "allItemsIntact": false,
    "excludedFromBatch": 3
  }
}
```

**Validation**: All items must be verified. If any are unverified, the API returns an error with the count.

**Side effects (FCR-50)**: When verification completes, items verified as **damaged**, **missing**, or **wrong_item** are automatically set to `return_status = 'non_returnable'`. This means:
- Only **correct** items proceed to batch assignment, debit memo generation, and all downstream steps
- The return's `totalReturnableValue` is recalculated to reflect only correct items
- The `excludedFromBatch` field in the summary shows how many items were excluded

**Frontend behavior**:
- Disable the "Complete Verification" button until all items are verified (check `counts.unverified === 0` from summary)
- Show a confirmation dialog with the summary before completing
- After completion, show the summary screen with the excluded items notice and navigate back to the received list
- If the return is already verified, hide the Complete Verification button entirely

---

### Step 6: View/Resolve Discrepancies

**Page**: Discrepancies tab/section within verification, or a separate discrepancy management page

**List discrepancies**: `GET /api/admin/warehouse/:id/discrepancies?status=open`

**Resolve**: `PATCH /api/admin/warehouse/discrepancies/:discrepancyId/resolve`

**Request body**:
```json
{
  "resolution": "resolved",
  "resolutionNotes": "Contacted pharmacy, confirmed item was included in error."
}
```

- `resolution` options: `resolved`, `dismissed`

**Frontend behavior**:
- Show discrepancies in a table: type, product, expected vs actual quantity, status
- For open ones, show "Resolve" and "Dismiss" buttons
- On click, show a modal asking for resolution notes
- Color-code by type: red (missing), yellow (damaged), blue (extra/surplus), gray (other)

---

### Step 7: Global Surplus Management

**Page**: Warehouse Surplus inventory page (separate from verification)

**API**: `GET /api/admin/warehouse/surplus?status=stored&search=drug&page=1&limit=20`

**Response** includes `licensePlate` and `pharmacyName` from the original return.

**Frontend behavior**:
- A table showing all surplus items across all returns
- Filter by status: stored, assigned_to_return, disposed
- Search by NDC, product name, or warehouse location
- Each row shows which return it came from (license plate + pharmacy name)

---

## Component Structure Suggestion

```
WarehouseVerification/
├── ReceivedList.tsx              — Step 1: list of received returns
├── StartVerification.tsx         — Step 2: box count input
├── VerificationSession.tsx       — Steps 3-5: main verification page
│   ├── ItemVerificationList.tsx  — item list with verify buttons
│   ├── ItemVerifyActions.tsx     — 4 status buttons per item
│   ├── SurplusForm.tsx           — add surplus form
│   ├── SurplusList.tsx           — list surplus for this return
│   ├── VerificationProgress.tsx  — progress bar + counts
│   └── CompleteSummary.tsx       — final summary before/after complete
├── DiscrepancyList.tsx           — discrepancy table with resolve
├── DiscrepancyResolve.tsx        — resolve modal
└── SurplusInventory.tsx          — global surplus management page
```

---

## Key Notes for Frontend

1. **Discrepancies are auto-created** when items are marked damaged/missing/wrong and when surplus is added. No need for the frontend to explicitly call `POST /:id/discrepancy` in the normal flow — it's only for manual one-off discrepancies.

2. **Surplus items are NOT part of the return**. They are stored in the warehouse for future returns. The return continues without them.

3. **Damaged/missing items are excluded from batches** (FCR-50). When verification completes, non-correct items have their `return_status` set to `non_returnable`. This means they are automatically excluded from batch close-out, debit memo generation, and all downstream steps. Only `correct` items count toward the return value and appear in debit memos.

4. **All items must be verified** before completing. The backend enforces this.

5. **Use `verification-summary` to reload state** at any point during the flow. It returns everything: items, surplus, discrepancies, and counts.

6. **The `verified` boolean field** (legacy) is still maintained for backward compatibility. It's `true` when `verificationStatus === 'correct'`, `false` otherwise.

7. **Verified returns can be assigned to batches** (FCR-50). `assign_returns_to_batch` accepts returns with status `received`, `verified`, or `closed_out`.
