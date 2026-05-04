# Plan Document — Move Policy Check / Wine Cellar / Destruction Logic to Warehouse Verification

> **Owner:** Saboor
> **Goal:** Strip the policy-check, wine-cellar, and destruction routing out of the **Pharmacy** (`Frontend/`) and **Processor** (`admin/`) item-add flows, and re-implement that exact same logic on the **Warehouse** (`MainAdmin/`) item-by-item verification flow. Reuse the existing backend APIs — only the role/auth that hits them changes.
> **Scope rule:** Touch only what is described below. Do **not** change RPC functions, DB schema, business rules, or unrelated controllers/UI.

---

## 0. Folder ↔ Role Map (confirmed)

| User in your message | Code folder        | Role / token type        | What they will do after this change                      |
| -------------------- | ------------------ | ------------------------ | -------------------------------------------------------- |
| Pharmacy             | `Frontend/`        | `pharmacy` JWT           | Create return + add items (NO policy / WC / destruction) |
| Processor            | `admin/`           | `admin` (sub-admin) JWT  | Create return + add items (NO policy / WC / destruction) |
| Warehouse            | `MainAdmin/`       | `admin` (warehouse perm) | Receive → **verify each scanned item** → run policy → route to returnable / wine cellar / destruction |

> Note: both `admin/` and `MainAdmin/` portals authenticate against the same `authenticateAdmin` middleware. They are differentiated by the `requirePermission('warehouse')` permission already present on `src/routes/warehouseRoutes.ts`. No new auth middleware is required.

---

## 1. Current State (what exists today)

### 1.1 Backend (single source of truth — stays mostly as-is)

| Concern             | Endpoint                                                                  | Auth (current)                              | Notes                                                                                             |
| ------------------- | ------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Policy check        | `POST /api/policies/check`                                                | `authenticateAny` (proc → pharm → admin)    | Already returns `{ status, reason, destination, expectedReturnableDate, … }`                      |
| Add item to return  | `POST /api/return-transactions/:id/items`                                 | `authenticateAny`                           | **`addItemHandler` currently auto-classifies, auto-shelves Wine Cellar, auto-creates Destruction**|
| List items          | `GET  /api/return-transactions/:id/items`                                 | `authenticateAny`                           |                                                                                                   |
| Update item         | `PATCH /api/return-transactions/:id/items/:itemId`                        | `authenticateAny`                           | Used to change `returnStatus`, `destination`, `nonReturnableReason`, `memo`, `wineCellarId`       |
| Resolve TBD item    | `PATCH /api/return-transactions/:id/items/:itemId/resolve`                | `authenticateAny`                           | Auto creates **destruction record** when `non_returnable_route = destruction`                     |
| Move item to WC     | `POST  /api/return-transactions/:id/items/:itemId/wine-cellar`            | `authenticateAny`                           | Adds wine_cellar row + sets `wineCellarId` + `returnStatus=non_returnable, reason=date`           |
| Add to WC directly  | `POST  /api/admin/wine-cellar`                                            | `authenticateAdmin` + `requirePermission('warehouse')` | Used today by the processor portal via `addToWineCellarDirect`                                    |
| Destruction stats   | `GET  /api/admin/destruction*`                                            | `authenticateAny` (admin or pharmacy)       |                                                                                                   |
| Warehouse verify v2 | `PATCH /api/admin/warehouse/:id/items/:itemId/verify-v2`                  | `authenticateAdmin` + `warehouse` perm      | Currently sets `verificationStatus ∈ {correct, damaged, missing, wrong_item}` only                |
| Verification summary| `GET   /api/admin/warehouse/:id/verification-summary`                     | same                                        | Returns items, counts, surplus, discrepancies                                                     |
| Barcode scan        | `POST  /api/barcode/scan`                                                 | `authenticateAny`                           | Returns parsed GS1 + product info + pricing                                                       |

**Auto-classification block in `src/controllers/returnTransactionItemsController.ts → addItemHandler`** (lines ~68–222) does THREE things today:
1. Calls `checkReturnability(...)` and overrides `returnStatus` / `destination` / `nonReturnableReason`.
2. If policy says **too_early** / **deferred_inside_policy_period** → shelves item directly into `wine_cellar` table (no row in `return_transaction_items`).
3. If item is `non_returnable + destruction` → calls `destructionService.createDestructionRecordForTransactionItem(...)`.

This is the block that must move out of the pharmacy/processor flow and into the warehouse verification flow.

### 1.2 Frontend Pharmacy — `Frontend/app/(dashboard)/returns/[id]/add-items/page.tsx` (1580 lines)

| Concern                         | Lines (approximate)                                              |
| ------------------------------- | ---------------------------------------------------------------- |
| `PolicyCheckResult` type        | 51–66                                                            |
| Policy state vars               | 113–114, 128, 130–135 (`policyAutoCheck`, `isPolicyChecking`, `policyModalOpen`, `preCheckResult`, `wineCellarDate`, `nonReturnableRoute`, `manualDestination`) |
| `performPolicyCheck` callback   | 238–278                                                          |
| `runPolicyCheck` helper         | 280–299                                                          |
| Auto policy `useEffect`         | 301–337                                                          |
| Policy-related save logic       | 496–511, 573–579, 625–628                                        |
| `handleMoveToWineCellarManual`  | 642–714                                                          |
| `handleClearForm` policy resets | 716–732                                                          |
| Policy banner / WC date input / "Save to Destruction" / "Move to Wine Cellar" UI | scattered through the JSX (search for `policyAutoCheck`, `wineCellarDate`, `nonReturnableRoute`, `policyModalOpen`) |

### 1.3 Frontend Processor — `admin/app/warehouse/returns/[id]/add-items/page.tsx` (1559 lines)

Mirrors the pharmacy file but uses Redux thunks:
- imports `addToWineCellarDirect` (line 19) and `checkReturnability` (line 23)
- `performPolicyCheck` (line 199), `runPolicyCheck` (line 235), policy `useEffect` (line 269)
- Pre-save policy check (line 473)
- `addToWineCellarDirect` dispatch (line 644)
- Policy modal trigger (line 1165), WC inline button (line 1432)

### 1.4 Frontend Warehouse — `MainAdmin/app/warehouse/verification/[id]/page.tsx` (1272 lines)

Already exists and supports:
- `startVerification` / `verifyItemV2` / `addSurplus` / `completeVerification` / `resolveDiscrepancy`
- Item table with "Verify" button → modal with 4 statuses: **correct / damaged / missing / wrong_item**
- Progress bar `verified / totalItems` and the per-status totals row.

**It does NOT currently:**
- run policy check on items
- have a barcode-scan input for matching items inside the return
- call wine-cellar or destruction endpoints
- show returnable / non-returnable counts based on policy

### 1.5 MainAdmin Redux store

| Slice                                | What's there today                                                            | What's missing for this work                                  |
| ------------------------------------ | ------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| `MainAdmin/lib/store/policiesSlice.ts`        | ✅ `checkReturnability` thunk (line 238) — already hits `/policies/check` | nothing                                                        |
| `MainAdmin/lib/store/wineCellarSlice.ts`      | fetch / stats / update / return only                                           | **add** `addToWineCellarDirect` (POST `/admin/wine-cellar`)    |
| `MainAdmin/lib/store/returnTransactionsSlice.ts` (does not exist in MainAdmin yet — must check) | — | **add** `moveItemToWineCellar`, `resolveTransactionItem`, `updateTransactionItem`, `addTransactionItem` (mirror of admin slice but only the parts the warehouse needs) |
| `MainAdmin/lib/store/destructionSlice.ts`     | fetch / stats / update only                                                    | nothing — destruction record is auto-created server-side via `resolve` endpoint |
| `MainAdmin/lib/store/warehouseSlice.ts`       | full v2 verify flow                                                            | nothing                                                        |

> ⚠️ Confirm: `MainAdmin/lib/store/` does **not** have a `returnTransactionsSlice.ts` (only the `admin/` portal does). The new file to be added in step 4.2 is small — just the four thunks the warehouse will dispatch.

---

## 2. Target State (what the system should look like after the change)

### 2.1 Pharmacy & Processor add-items pages

- A single linear flow: scan → fields auto-fill → save → next scan.
- **No** policy banner. **No** auto-set of `returnStatus` from policy. **No** Wine Cellar date input. **No** "Save to Destruction" or "Move to Wine Cellar" buttons. **No** `manualDestination` or `nonReturnableRoute` selectors.
- Every newly added item is sent with `returnStatus: 'tbd'` (default) and **no** `destination`. The warehouse will assign these later.

### 2.2 Backend `addItemHandler`

- Skip the auto-policy / auto-WC / auto-destruction block.
- Honor whatever the caller sends. If the warehouse later (during verification) calls `PATCH .../items/:itemId` with `returnStatus`/`destination`, it works the same as today.

### 2.3 Warehouse Verification page

The verification screen becomes the single classification surface:

```
┌──────────────────────────────────────────────────────────────────┐
│ Verification — License #ABC123 (Pharmacy XYZ)                    │
│ ─────────────────────────────────────────────────────────────── │
│ Scanned 4 / 12   ████░░░░░░░░░░ 33%                              │
│ ✓ Returnable: 2     ✗ Non-Returnable: 1     🍷 Wine Cellar: 1   │
│ 💥 Destruction: 0    ⚠ Pending policy: 8                         │
├──────────────────────────────────────────────────────────────────┤
│ [📷 Scan Item]   [⌨️ Manual Search]                              │
├──────────────────────────────────────────────────────────────────┤
│ Items in this return                                             │
│  · Drug A — NDC 12345-6789-01 — Lot L1 — Exp 2026-06     [Verify]│
│  · Drug B — NDC 23456-7890-12 — Lot L2 — Exp 2025-12     [Verify]│
│  · …                                                             │
└──────────────────────────────────────────────────────────────────┘
```

When the warehouse clicks **Verify** (or scans a barcode that matches an item):
1. Open the verify modal.
2. Step 1 — **Physical condition** (existing): correct / damaged / missing / wrong_item.
3. Step 2 — **Policy** (NEW, only when condition = `correct` and item has NDC + expirationDate):
   - Frontend calls `dispatch(checkReturnability({ ndc, expirationDate, isPartial, dosageForm }))`.
   - Show banner with policy result (returnable / non_returnable + reason + expectedReturnableDate + destination).
4. Step 3 — **Disposition** (NEW): radio + conditional inputs:
   - **Returnable** → `PATCH /return-transactions/:id/items/:itemId` with `{ returnStatus: 'returnable', destination: <policy.destination | manual> }`, then `PATCH .../verify-v2` with `verificationStatus: 'correct'`.
   - **Wine Cellar** (when policy says too_early / deferred / processor manually chooses) → `POST /return-transactions/:id/items/:itemId/wine-cellar` with `{ expectedReturnableDate }` then `PATCH .../verify-v2` with `verificationStatus: 'correct'`.
   - **Destruction** → `PATCH /return-transactions/:id/items/:itemId/resolve` with `{ new_status: 'non_returnable', non_returnable_route: 'destruction' }` (this auto-creates the destruction record), then `PATCH .../verify-v2` with `verificationStatus: 'correct'`.
   - **Damaged / Missing / Wrong** (Step 1 != correct) → no policy check, just `verifyItemV2` like today.

Counts on the progress bar are derived from the existing `verification-summary` response by joining `verificationStatus` + `returnStatus` + `wineCellarId` + `destination` already present on each item.

---

## 3. Backend Changes

> Files: `src/controllers/returnTransactionItemsController.ts` (only file changing).

### 3.1 `addItemHandler` — strip auto-classification

Comment out (do **not** delete — keep for easy rollback) the following ranges in `src/controllers/returnTransactionItemsController.ts`:

| Range (approx.) | What it does today                                                                       | Action |
| --------------- | ----------------------------------------------------------------------------------------- | ------ |
| 71–113          | `policyResult = await checkReturnability(...)` and overriding `returnStatus`/`destination`| Comment out; replace with a single `let policyResult = null;` so the rest of the code that references it stays valid. |
| 115–160         | Wine Cellar shelve-only short-circuit (`shouldShelveWineCellarOnly`)                      | Comment out the entire `if (shouldShelveWineCellarOnly && policyResult) { … return … }` block. |
| 206–222         | Auto-create destruction record after `addItem`                                            | Comment out. |
| 229–231         | `response.policyCheck = policyResult;`                                                    | Leave (will simply be `null` and absent from response). |

Result: `addItemHandler` becomes a pure CRUD endpoint that just persists whatever the caller sends (with the existing duplicate check + `extractPackageSizeFromDescription` enrichment intact).

> Leave `moveToWineCellarHandler` and `resolveItemHandler` **unchanged** — the warehouse will call them.

### 3.2 No other backend changes

- Routes: untouched.
- `verifyItemV2Handler`: untouched.
- Services / RPCs: untouched.
- Auth: untouched. `authenticateAdmin` already lets the warehouse hit `/policies/check` (which falls through to admin auth) and the wine-cellar / destruction routes.

---

## 4. MainAdmin (Warehouse) Frontend Changes

### 4.1 New Redux thunks

Create `MainAdmin/lib/store/returnTransactionsSlice.ts` (new file). Only include thunks the verification page needs:

```ts
// scanBarcode → POST /barcode/scan
// updateTransactionItem → PATCH /return-transactions/:id/items/:itemId
// moveItemToWineCellar → POST /return-transactions/:id/items/:itemId/wine-cellar
// resolveTransactionItem → PATCH /return-transactions/:id/items/:itemId/resolve
```

Pattern: copy the four thunks from `admin/lib/store/returnTransactionsSlice.ts` (lines 405–576) verbatim, drop the rest. Register the reducer in `MainAdmin/lib/store/store.ts` under key `returnTransactions`.

Add **one** thunk to `MainAdmin/lib/store/wineCellarSlice.ts`:

```ts
// addToWineCellarDirect → POST /admin/wine-cellar
```

### 4.2 Verification page UI changes

File: `MainAdmin/app/warehouse/verification/[id]/page.tsx`

#### 4.2.1 New state

```ts
const [policyResult, setPolicyResult] = useState<ReturnabilityCheckResult | null>(null);
const [isPolicyChecking, setIsPolicyChecking] = useState(false);
const [disposition, setDisposition] = useState<'returnable' | 'wine_cellar' | 'destruction'>('returnable');
const [wineCellarDate, setWineCellarDate] = useState('');
const [manualDestination, setManualDestination] = useState('');
const [scanInput, setScanInput] = useState('');
const [scanError, setScanError] = useState('');
const [isItemScanning, setIsItemScanning] = useState(false);
```

#### 4.2.2 Item-scan handler (new)

A scan input + camera button at the top of the Items tab. On scan:
1. `dispatch(scanBarcode({ scanData }))` → get `{ ndc, lotNumber, serialNumber, expirationDate, ... }`.
2. Match against `v2Summary.items` by `ndc + serialNumber` (preferred) or `ndc + lotNumber + expirationDate` (fallback).
3. If match → call `openVerifyItem(matchedItem)` and pre-set `verifyStatus = 'correct'` to skip ahead to policy.
4. If no match → toast `"Scanned product not found in this return"`.

#### 4.2.3 Verify modal — extend the existing `verifyingItem && (…)` block

After the four condition buttons (correct/damaged/missing/wrong_item) and ONLY when `verifyStatus === 'correct'` and `verifyingItem.ndc && verifyingItem.expirationDate`:

```tsx
{verifyStatus === 'correct' && (
  <PolicyCheckSection
    item={verifyingItem}
    policyResult={policyResult}
    isChecking={isPolicyChecking}
    onResult={setPolicyResult}
    disposition={disposition}
    onDispositionChange={setDisposition}
    wineCellarDate={wineCellarDate}
    onWineCellarDateChange={setWineCellarDate}
    manualDestination={manualDestination}
    onManualDestinationChange={setManualDestination}
  />
)}
```

`PolicyCheckSection` (define inline in the page or as a new component in `MainAdmin/components/warehouse/PolicyCheckSection.tsx`) does:
1. `useEffect` on `[item.ndc, item.expirationDate, item.isPartial, item.dosageForm]` → dispatches `checkReturnability`, stores into `onResult`.
2. Renders the policy banner (status + reason + expectedReturnableDate) — copy the visual pattern from `admin/app/warehouse/returns/[id]/add-items/page.tsx` lines ~1395–1480 verbatim, only swap the dispatch action names.
3. Renders three radio buttons: Returnable / Wine Cellar / Destruction.
4. When `disposition === 'wine_cellar'` → show date input (default `policyResult.expectedReturnableDate`).
5. When `disposition === 'returnable'` → show optional manual destination dropdown (default `policyResult.destination`).

#### 4.2.4 Refactor `handleVerifyItem` (existing function around line 165)

Replace the body so the flow is:

```ts
const handleVerifyItem = async () => {
  if (!verifyStatus || !verifyingItem) return;

  // Path A: not "correct" → behave exactly like today (no policy).
  if (verifyStatus !== 'correct') {
    return doVerifyV2();  // unchanged from current implementation
  }

  // Path B: "correct" + chosen disposition.
  switch (disposition) {
    case 'returnable':
      await dispatch(updateTransactionItem({
        transactionId: returnId,
        itemId: verifyingItem.id,
        payload: {
          returnStatus: 'returnable',
          destination: policyResult?.destination || manualDestination || undefined,
        },
      }));
      break;

    case 'wine_cellar':
      if (!wineCellarDate) { showToast('Wine Cellar date is required', 'error'); return; }
      await dispatch(moveItemToWineCellar({
        transactionId: returnId,
        itemId: verifyingItem.id,
        payload: { expectedReturnableDate: wineCellarDate, notes: verifyNotes || undefined },
      }));
      break;

    case 'destruction':
      await dispatch(resolveTransactionItem({
        transactionId: returnId,
        itemId: verifyingItem.id,
        payload: {
          new_status: 'non_returnable',
          non_returnable_route: 'destruction',
          memo: verifyNotes || undefined,
        },
      }));
      break;
  }

  await doVerifyV2();   // mark physical verification = 'correct'
  resetVerifyModal();
  await loadSummary();
};
```

Where `doVerifyV2()` is the existing `dispatch(verifyItemV2(...))` call.

#### 4.2.5 Progress bar — add returnable / non-returnable / WC / destruction counts

The existing `v2Summary.items` already carries `returnStatus`, `wineCellarId`, `destination`. Compute below the existing `counts` block:

```ts
const policyCounts = useMemo(() => {
  const items = v2Summary?.items || [];
  let returnable = 0, nonReturnable = 0, wineCellar = 0, destruction = 0, pending = 0;
  for (const it of items) {
    if (it.wineCellarId) wineCellar++;
    else if (it.destination === 'destruction') destruction++;
    else if (it.returnStatus === 'returnable') returnable++;
    else if (it.returnStatus === 'non_returnable') nonReturnable++;
    else pending++;
  }
  return { returnable, nonReturnable, wineCellar, destruction, pending };
}, [v2Summary]);
```

Render below the existing condition stat row (line ~673):

```tsx
<div className="flex gap-3 mt-2 text-[10px] font-medium">
  <span className="text-green-700">{policyCounts.returnable} returnable</span>
  <span className="text-red-700">{policyCounts.nonReturnable} non-returnable</span>
  <span className="text-amber-700">{policyCounts.wineCellar} wine cellar</span>
  <span className="text-orange-700">{policyCounts.destruction} destruction</span>
  <span className="text-gray-400">{policyCounts.pending} pending</span>
</div>
```

#### 4.2.6 No changes to `completeVerificationHandler` flow

The complete-verification button still works because the underlying RPC reads each item's `returnStatus` / `destination` / `wineCellarId` to decide what to include in the batch — which is exactly what the new flow writes.

---

## 5. Pharmacy Frontend Changes (`Frontend/`)

> File: `Frontend/app/(dashboard)/returns/[id]/add-items/page.tsx`
> **Strategy:** comment-out (`/* … */`) so we can revert quickly. **Do not delete.**

### 5.1 Comment-out blocks

| # | Lines (approx.)        | What                                                                                                          |
| - | ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1 | 51–66                  | `interface PolicyCheckResult { … }`                                                                           |
| 2 | 113–114                | `policySyncKeyRef`, `policyCheckRequestIdRef`                                                                 |
| 3 | 128, 130–135           | `preCheckResult`, `isPreChecking`, `policyAutoCheck`, `isPolicyChecking`, `policyModalOpen`, `wineCellarDate`, `nonReturnableRoute`, `manualDestination` |
| 4 | 228–337                | Whole "Policy check" section: `deriveIsPartial`, `performPolicyCheck`, `runPolicyCheck`, the auto `useEffect` |
| 5 | 499–511                | The pre-save policy guard inside `handleSave`                                                                  |
| 6 | 573–579                | The destination / `nonReturnableRoute` payload writes inside `handleSave`                                      |
| 7 | 625–628                | `setPolicyAutoCheck(null); setIsPolicyChecking(false); setPolicyModalOpen(false);`                             |
| 8 | 642–714                | Whole `handleMoveToWineCellarManual` function                                                                  |
| 9 | 716–732                | Policy resets inside `handleClearForm` (only the lines referencing the commented state)                        |

### 5.2 UI sections to comment-out

Search the JSX for these markers and wrap each in `{/* … */}`:
- The "Policy Check" banner (uses `policyAutoCheck`)
- The "Pre-Check Result" / Wine Cellar date prompt (uses `preCheckResult`, `wineCellarDate`)
- The `<select>` for `manualDestination`
- The radio group for `nonReturnableRoute` (wine_cellar / destruction)
- The "Move to Wine Cellar" button → `handleMoveToWineCellarManual`
- The "Save to Destruction" button (if present)
- The policy modal (`policyModalOpen`)
- Any `lastClassification` UI that depends on `policyCheck` or `wineCellarItem` (just keep showing the basic `item + status`)

### 5.3 Save flow stays

`handleSave(true)` (skip pre-check) is now the only path. Default `form.returnStatus = 'tbd'` already gives the right payload. The function should keep working unchanged once the policy guard at lines 499–511 is gone.

> Imports: `Archive, Ban` (and `Trash2`?) icons used by the WC/destruction sections can be removed from the `lucide-react` import once the JSX is gone, but commenting them out is fine for the first pass.

---

## 6. Processor Frontend Changes (`admin/`)

> File: `admin/app/warehouse/returns/[id]/add-items/page.tsx`
> Same comment-out approach as pharmacy.

### 6.1 Comment-out blocks

| # | Lines (approx.) | What                                                                                                |
| - | --------------- | --------------------------------------------------------------------------------------------------- |
| 1 | 19              | `addToWineCellarDirect` import                                                                      |
| 2 | 23              | `import { checkReturnability } from '@/lib/store/policiesSlice';`                                   |
| 3 | 199–293         | `performPolicyCheck`, `runPolicyCheck`, the auto `useEffect`                                        |
| 4 | 471–479         | The pre-save policy guard inside `handleSave`                                                       |
| 5 | 622–680         | `handleMoveToWineCellarManual` (uses `addToWineCellarDirect`)                                       |
| 6 | 1163–1175       | Policy modal trigger                                                                                |
| 7 | 1395–1480       | Policy banner / WC / destruction UI (the same visual block we're cloning into MainAdmin verify modal) |

### 6.2 Same UI sections to comment-out as section 5.2 above

### 6.3 Verify imports

After commenting, run `tsc --noEmit` (or just hover in the editor) — remove unused imports from `@/lib/store/policiesSlice`, `@/lib/store/wineCellarSlice` (only the `addToWineCellarDirect` one), and the unused lucide icons.

---

## 7. End-to-End Flow After Changes

1. **Pharmacy** logs in → creates a return → scans items → fields auto-fill → click **Save**.
   POST body: `{ ndc, … , returnStatus: 'tbd' }`. Backend just persists. **No policy/WC/destruction.**

2. **Pharmacy** finalizes, ships boxes.

3. **Warehouse** opens `MainAdmin → Warehouse → Receiving → Scan Box` → marks return received.

4. **Warehouse** opens `MainAdmin → Warehouse → Verification → [the return]`.
   - Enters box count → starts verification.
   - Sees item list with progress + (NEW) returnable/non-returnable counters.
   - Clicks **Verify** on a row (or scans the row's barcode):
     - Sets condition = `correct` → policy section auto-runs `/policies/check`.
     - Banner shows result.
     - Selects disposition → Save:
       - Returnable → `PATCH …/items/:itemId` (returnStatus + destination), then `PATCH …/verify-v2`.
       - Wine Cellar → `POST …/items/:itemId/wine-cellar` then `PATCH …/verify-v2`.
       - Destruction → `PATCH …/items/:itemId/resolve` (auto-creates destruction record) then `PATCH …/verify-v2`.
     - Sets condition ≠ `correct` → just `PATCH …/verify-v2` (today's behaviour).
   - Repeats until all items verified.
   - Clicks **Complete Verification** → existing flow → batch assignment as today.

5. **Processor** can view returns, run analytics — same as today, no add-items policy logic.

---

## 8. Acceptance Criteria

- [ ] Pharmacy add-items page renders; scanning + saving works; no `/policies/check` call is made; saved item has `returnStatus = 'tbd'` and `wine_cellar_id = null`.
- [ ] Processor add-items page renders; same as pharmacy (no Redux call to `checkReturnability` or `addToWineCellarDirect`).
- [ ] `addItemHandler` no longer calls `checkReturnability`, never inserts into `wine_cellar`, never creates a destruction record.
- [ ] Warehouse verification page lets the user scan a barcode and the matching row in the table is highlighted / verified.
- [ ] Warehouse verify modal shows the policy banner only when condition = `correct` and item has NDC + expiration date.
- [ ] Choosing "Wine Cellar" → row in `wine_cellar` table created, `return_transaction_items.wine_cellar_id` populated, `return_status='non_returnable'`, `non_returnable_reason='date'`.
- [ ] Choosing "Destruction" → row in `destruction_records` created, item `destination='destruction'`, `return_status='non_returnable'`.
- [ ] Choosing "Returnable" → item `return_status='returnable'`, `destination` set per policy/manual.
- [ ] All three paths above also mark `verificationStatus='correct'` (single Save click).
- [ ] Progress bar shows correct counts (returnable / non-returnable / wine cellar / destruction / pending).
- [ ] Complete-verification still works and batches only the items that satisfy the existing RPC criteria.
- [ ] No regressions in: barcode scan (other portals), discrepancy reporting, surplus, batch assignment.

---

## 9. Implementation Order (so nothing breaks mid-way)

1. **Backend:** comment out the auto-classification block in `addItemHandler`. Run the server, ensure tests / lint pass, smoke-test "create return + add item" via the Pharmacy UI — item should save as TBD with no WC/destruction side-effects. ✔
2. **MainAdmin Redux:** add `returnTransactionsSlice` (4 thunks) + `addToWineCellarDirect` thunk in wineCellarSlice. Register in `store.ts`. ✔
3. **MainAdmin Verification page:** add policy section + new disposition flow + scan-to-match input + extra count tiles. Smoke-test all three disposition paths against a seeded return. ✔
4. **Pharmacy UI:** comment-out blocks listed in §5. Smoke-test scan + save. ✔
5. **Processor UI:** comment-out blocks listed in §6. Smoke-test scan + save. ✔
6. Run the full happy-path: pharmacy creates → ships → warehouse receives → verifies (one returnable / one wine cellar / one destruction) → completes. Confirm DB rows match §8.

---

## 10. Files Touched (final list)

**Backend (1 file):**
- `src/controllers/returnTransactionItemsController.ts` (comment ranges in §3.1)

**MainAdmin / warehouse (3–4 files):**
- `MainAdmin/lib/store/returnTransactionsSlice.ts` (NEW)
- `MainAdmin/lib/store/wineCellarSlice.ts` (add `addToWineCellarDirect`)
- `MainAdmin/lib/store/store.ts` (register new reducer)
- `MainAdmin/app/warehouse/verification/[id]/page.tsx` (UI/handler edits in §4.2)

**Pharmacy (1 file):**
- `Frontend/app/(dashboard)/returns/[id]/add-items/page.tsx` (§5)

**Processor (1 file):**
- `admin/app/warehouse/returns/[id]/add-items/page.tsx` (§6)

**No changes to:** routes, services, RPC scripts, DB schema, other portals' pages, auth middleware, the existing `MainAdmin/app/warehouse/returns/[id]/add-items/page.tsx` (warehouse can still create a return if needed — same as today, behind the same now-stripped backend).

---

## 11. Risk & Rollback

- All edits are additive (MainAdmin) or commented-out (Pharmacy / Processor / backend block).
- Rollback = un-comment + revert the new MainAdmin slice file. No DB migrations.
- Feature-flag option: gate the new disposition section behind `process.env.NEXT_PUBLIC_WAREHOUSE_POLICY_FLOW === 'true'` if you want a soft launch.
