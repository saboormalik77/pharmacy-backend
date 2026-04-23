# Feature Spec: Reports & Documents Hub (RefNum-scoped PDF Access)

> **Status:** 🟡 Not implemented as a unified hub — underlying PDFs partially exist
> **Priority:** High — compliance-critical (DEA, destruction proof)
> **Reference UX:** `new portal/reports.html`
> **Owner:** Pharmacy Portal team

---

## 1. What this feature is

A **single page** where a pharmacy:

1. Picks a specific return (by **License Plate** + date + estimated credit) from a searchable dropdown.
2. Gets **four download/view buttons**, each opening a scoped PDF:
   - **Return Report** (full return packet with all line items and credits)
   - **Controlled Substance Report** (for the selected return, if applicable)
   - **Proof of Destruction — Controls**
   - **Proof of Destruction — Non-Controls**

This is a **read-only, compliance-oriented** view. It does **not** create data — it packages existing return data into audit-ready PDFs that pharmacies can hand to DEA, state boards, or their own accounting.

---

## 2. Why we need it (UX gap)

From the reference portal (`reports.html`):

- **Primary reference selector** at the top — "date | license plate | amount" in a **searchable** dropdown (Select2).
- After selecting, **action buttons** are visually grouped under two sub-headings:
  - *(no subhead)* → `Return Reports`, `Controlled Substance Report`
  - **Proof Of Destruction** → `Controls`, `Non Controls`
- Each button does one thing: opens the correct PDF in a new tab (with a preflight check for destruction status).
- Simple, calm, compliance-focused layout.

Our current portal scatters these artifacts:
- **`/analytics`** has aggregate metrics (not per-return PDFs).
- **`/documents`** hosts uploaded credit memos, not reports.
- **`/returns/[id]/finalize`** can download manifest/DEA, but only during the finalize flow.
- **No** centralized "pick a return → see all its PDFs" experience.

A compliance auditor or the pharmacist preparing a DEA inspection cannot easily find "everything about return XYZ" in one place.

> **Our identifier is "License Plate"**, not "RefNum". The backend column is `license_plate` (confirmed in `src/services/manifestService.ts` and `returnTransactionController.ts`). We mirror the reference UX but label consistently as **"License Plate"** everywhere.

---

## 3. Required UX (adapted from `reports.html`)

### 3.1 Page anatomy

```
┌─ DashboardLayout
│
├─ Page header
│     ▸ H1: "Reports & Documents"
│     ▸ Subtitle: "Download compliance-ready PDFs for any completed return"
│
├─ Card (primary, shadow-sm, p-4)
│     ▸ Label: "Select a Return"
│     ▸ Searchable combobox:
│           "Mar 24, 2026 | 3S38J | $590.28"
│           "Jan 23, 2026 | 3S15L | $3,937.73"
│           …
│     ▸ Hint text: "Search by license plate, date, or amount"
│
│     ▸ [empty state if none selected]
│        ⟶ "Select a return above to view its reports."
│
│     ▸ [once selected]
│        ┌─────────────── Return summary strip ──────────────┐
│        │ License Plate  Date        Status     Total Credit │
│        │ 3S38J          Mar 24 2026 Completed  $590.28      │
│        └─────────────────────────────────────────────────────┘
│
│        ┌─ Reports (section header) ─────────────────────────┐
│        │ [ 📄 Return Report ] [ 💊 Controlled Substance ]    │
│        └─────────────────────────────────────────────────────┘
│
│        ┌─ Proof of Destruction ─────────────────────────────┐
│        │ [ 🔒 Controls ] [ 📦 Non-Controls ]                 │
│        └─────────────────────────────────────────────────────┘
│
│        ← each button: icon + label + small subcaption ("opens PDF in new tab")
│
└─ Informational footer
      ▸ "These reports reflect the return as finalized. For corrections, contact support."
```

### 3.2 The picker (combobox)

- **Only completed returns** are listed by default (toggleable: "Show in-progress").
- Each option shows: `{date, licensePlate, totalEstimatedCredit}` formatted as the reference portal.
- **Searchable** client-side on all three fields (date string, license plate, amount).
- Limit to most recent 50; include a "Load older returns" link that fetches the next page.
- Persist selection in URL: `/reports-hub?license_plate=3S38J` so users can bookmark.

### 3.3 Button behaviour

| Button | Behaviour |
|--------|-----------|
| **Return Report** | Calls `GET /api/return-transactions/:id/return-packet` (new endpoint — see §5). Streams PDF in new tab. |
| **Controlled Substance Report** | Calls `GET /api/return-transactions/:id/controlled-substance-report` (new). If the return has no controls, button is **disabled with tooltip** "No controlled substances on this return". |
| **Proof of Destruction — Controls** | Calls `GET /api/return-transactions/:id/destruction-certificate?scope=controls` (new). Disabled with tooltip if destruction is not yet confirmed. |
| **Proof of Destruction — Non-Controls** | Same endpoint, `scope=non_controls`. Same disabled rule. |

Each button's disabled state is data-driven from the `/api/return-transactions/:id` summary fetched on selection.

### 3.4 Loading & error handling

- Combobox loading: skeleton pulse for 8 rows.
- Return summary loading: spinner inside summary strip.
- PDF generation loading: button shows `Loader2` + "Generating…" (disable while in flight).
- Error: red inline banner above buttons + toast.
- On success: new tab opens with the PDF (pattern matches `returns/[id]/finalize/page.tsx` `downloadPdf` helper).

### 3.5 Access rules

- Page visible only if user has `reports_hub:view`.
- PDF buttons disabled (not hidden) so the user understands *why*.
- If the return belongs to a sibling branch the user can't access, the backend returns 403 → toast "You don't have access to this return".

---

## 4. Frontend implementation

### 4.1 Files to create

```
Frontend/app/(dashboard)/reports-hub/page.tsx                        ← main page
Frontend/lib/api/services/reportsHubService.ts                       ← API wrapper
Frontend/components/reports/ReturnPicker.tsx                         ← searchable combobox
Frontend/components/reports/ReturnSummaryStrip.tsx                   ← selected return summary
Frontend/components/reports/ReportButtonGroup.tsx                    ← 4 buttons + disabled states
```

**URL:** `/reports-hub` — chosen to avoid collision with existing `/reports` (optimization UI) and `/analytics` (Analytics & Reports label).

### 4.2 Files to modify (surgical, no breakage)

**`Frontend/components/layout/Sidebar.tsx`**

Add to `navItems` after `Analytics & Reports`:

```tsx
{
  title: 'Reports Hub',
  href: '/reports-hub',
  icon: FileText,                  // from lucide-react
  visible: hasPermission('reports_hub:view'),
},
```

**`Frontend/lib/utils/pharmacyPortalRoutes.ts`** — add route + permission in matching order.

**`Frontend/middleware.ts`** — add `/reports-hub` to `protectedRoutes`.

### 4.3 API service module

`Frontend/lib/api/services/reportsHubService.ts`:

```ts
import { apiClient } from '../client'

export interface ReturnPickerOption {
  id: string
  license_plate: string
  created_at: string           // ISO
  total_estimated_credit: number
  status: string
  has_controls: boolean
  destruction_confirmed: boolean
}

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://pharmacy-backend-dusky.vercel.app/api'

async function openPdf(path: string) {
  const token = /* reuse same getToken() pattern as documentsService.viewDocument */
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(await res.text())
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  // revoke after short delay
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export const reportsHubService = {
  listCompletedReturns: (params?: { page?: number; limit?: number; search?: string }) =>
    apiClient.get<{ data: ReturnPickerOption[]; total: number }>(
      '/return-transactions',
      { status: 'completed', ...params }
    ),

  openReturnReport:            (id: string) => openPdf(`/return-transactions/${id}/return-packet`),
  openControlledSubstance:     (id: string) => openPdf(`/return-transactions/${id}/controlled-substance-report`),
  openDestructionControls:     (id: string) => openPdf(`/return-transactions/${id}/destruction-certificate?scope=controls`),
  openDestructionNonControls:  (id: string) => openPdf(`/return-transactions/${id}/destruction-certificate?scope=non_controls`),
}
```

**Why raw `fetch` for PDFs?** `apiClient` parses as JSON; it cannot stream binary PDFs. This mirrors the existing pattern in `lib/api/services/documentsService.ts` (`viewDocument` / `downloadDocument`) and `app/(dashboard)/returns/[id]/finalize/page.tsx` (`downloadPdf`).

### 4.4 Combobox implementation

The codebase has **no shared combobox** (no shadcn, no Select2). Build a small purpose-built one for this page:

- `<div>` wrapping `<input type="text">` for search + a floating list of options (absolute, `z-40`).
- State: `isOpen`, `filter`, `selectedId`.
- Click-outside closer via `useRef` + `useEffect` (pattern already used in `app/(dashboard)/reports/page.tsx` for the filter dropdown).
- Debounce (300ms) via existing `hooks/useDebounce.ts`.
- Keyboard: arrow up/down, Enter to select, Esc to close.

This becomes the **shared `ReturnPicker`** component and can be reused later (e.g. for a future "Checks by license plate" page).

### 4.5 Permission key

Add `reports_hub:view` to the permissions catalog. Grant to parent / full_access by default.

---

## 5. Backend implementation

### 5.1 What already exists (reuse, don't rebuild)

- `GET /api/return-transactions` → list w/ filter (works for picker).
- `GET /api/return-transactions/:id` → detail (works for summary strip).
- `GET /api/return-transactions/:id/manifest` → **manifest PDF** (exists, `pdfkit`, `generateManifestPdf`).
- `GET /api/return-transactions/:id/dea-form-222` → **DEA Form 222 PDF** (exists, `generateDeaForm222Pdf`).
- `GET /api/return-transactions/:id/job-sheet` → **job sheet** (internal, not shown to pharmacy).
- `generateManifestHtml` / job-sheet HTML in `jobSheetService.ts`.
- `manifestService.ts` has reusable PDF helpers and reads via RPCs `get_manifest_data`, `get_dea_form_222_data`.

### 5.2 What to add

Four new PDF endpoints on `return-transactions`:

| New endpoint | Purpose | Data source | Lib |
|--------------|---------|-------------|-----|
| `GET /:id/return-packet` | **Return Report** (all line items with credit totals, NDC, lot, expiration, classification) | New RPC `get_return_packet_data(transaction_id)` or extend existing `get_manifest_data` | `pdfkit` (existing) |
| `GET /:id/controlled-substance-report` | Controlled substances subset, with DEA schedule columns | Same RPC with filter `dea_schedule IS NOT NULL` | `pdfkit` |
| `GET /:id/destruction-certificate?scope=controls\|non_controls` | Proof of destruction certificate | New RPC `get_destruction_certificate_data(transaction_id, scope)` or reuse `destructions` data | `pdfkit` |

Each endpoint must:

1. `authenticateAny` (pattern already used on other return-transaction PDF endpoints).
2. Verify the transaction's `pharmacy_id` matches `req.pharmacyId` (or is within the pharmacy's branch tree). This guard is already in `manifestHandler` via `generateManifestData` — copy that check.
3. Return headers:
   ```
   Content-Type: application/pdf
   Content-Disposition: inline; filename="<type>_<licensePlate>.pdf"
   ```

### 5.3 New files

```
src/controllers/returnTransactionController.ts       ← ADD 3 new handlers
src/services/reportsPdfService.ts                    ← NEW: generateReturnPacketPdf, generateControlledSubstancePdf, generateDestructionCertificatePdf
src/services/reportsDataService.ts                   ← NEW: fetchReturnPacketData, fetchControlledSubstanceData, fetchDestructionCertificateData
```

Keep `manifestService.ts` untouched — these new files **parallel** it so the existing manifest pipeline is never modified.

### 5.4 Route additions

**Modify `src/routes/returnTransactionRoutes.ts`** — add 3 lines near the existing PDF handlers (~line 380-450):

```ts
router.get('/:id/return-packet',               authenticateAny, returnPacketHandler);
router.get('/:id/controlled-substance-report', authenticateAny, controlledSubstanceHandler);
router.get('/:id/destruction-certificate',     authenticateAny, destructionCertificateHandler);
```

No changes to `server.ts` (the route file is already mounted).

### 5.5 RPC / data access

Prefer **new Postgres RPCs** to match existing style (the codebase heavily uses RPCs for return-transaction PDFs):

```sql
-- sqlTable/rpc_get_return_packet_data.sql
CREATE OR REPLACE FUNCTION get_return_packet_data(p_transaction_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'transaction', to_jsonb(rt.*),
    'pharmacy',   to_jsonb(p.*),
    'items',      COALESCE(jsonb_agg(rti.* ORDER BY rti.created_at), '[]'::jsonb),
    'totals',     jsonb_build_object(
      'total_items',       COUNT(rti.*),
      'total_quantity',    COALESCE(SUM(rti.quantity), 0),
      'total_credit',      COALESCE(SUM(rti.estimated_credit), 0),
      'controls_count',    COUNT(rti.*) FILTER (WHERE rti.dea_schedule IS NOT NULL)
    )
  )
  INTO result
  FROM return_transactions rt
  LEFT JOIN pharmacies p              ON p.id = rt.pharmacy_id
  LEFT JOIN return_transaction_items rti ON rti.return_transaction_id = rt.id
  WHERE rt.id = p_transaction_id
  GROUP BY rt.id, p.id;

  RETURN result;
END;
$$;
```

Similar helpers for controlled-substance (filter `dea_schedule IS NOT NULL`) and destruction (joins `destructions` table — check schema in `sqlTable/destructions.sql` or Supabase; adjust RPC accordingly).

> **If the `destructions` table structure is unclear, first query Supabase directly** to confirm columns before writing the RPC. Don't assume.

### 5.6 PDF generation patterns

Reuse the `pdfkit` patterns from `src/services/manifestService.ts`:

- Landscape page for packing-list-style packets.
- Standard header with pharmacy name, address, DEA#, License Plate, date.
- Table with line items (NDC | Drug Name | Lot | Exp | Qty | Unit | Credit).
- Footer with totals, page numbers, signature line for Proof of Destruction.
- **Barcode of License Plate** at top-right via `jsbarcode` + `@napi-rs/canvas` (`src/services/barcodeService.ts`).

### 5.7 Picker response shape

Extend the existing `GET /api/return-transactions` response to include the three booleans the picker needs (`has_controls`, `destruction_confirmed`). Do this in the service that builds the list:

- `has_controls = EXISTS(return_transaction_items WHERE dea_schedule IS NOT NULL)`
- `destruction_confirmed = status IN ('completed','destroyed')` (adjust to actual schema)

Add these as computed fields in the returned JSON without modifying the DB columns. This keeps the picker responsive without N+1 calls.

### 5.8 Authorization (critical)

All new PDF endpoints must call the **same pharmacy-scoping guard** that exists in `manifestHandler`:

```ts
const data = await fetchReturnPacketData(id);
if (data.transaction.pharmacy_id !== req.pharmacyId /* && not in branch tree */) {
  throw new AppError('Return not accessible', 403);
}
```

Look at how `manifestService.generateManifestData` already does this check — copy it directly.

---

## 6. Data flow (end to end)

```
Pharmacy opens /reports-hub
      │
      ▼
GET /api/return-transactions?status=completed&limit=50
      │
      ▼
Picker renders list
      │
      ▼
User picks license plate 3S38J
      │
      ├─▶ URL updates to /reports-hub?license_plate=3S38J
      ├─▶ GET /api/return-transactions/:id  (summary strip)
      ├─▶ has_controls / destruction_confirmed flags drive which buttons enable
      │
      ▼
User clicks [Return Report]
      │
      ▼
GET /api/return-transactions/:id/return-packet   (Bearer token)
      │
      ▼
authenticateAny → controller → reportsDataService.fetchReturnPacketData (RPC)
      │
      ▼
reportsPdfService.generateReturnPacketPdf (pdfkit + barcode)
      │
      ▼
streamed back with Content-Type: application/pdf
      │
      ▼
FE: blob → URL.createObjectURL → window.open in new tab
```

---

## 7. What we **won't** touch (to keep things stable)

- `manifestService.ts` is **not modified** — new code lives in `reportsPdfService.ts`.
- `returnTransactionRoutes.ts` — only 3 additive lines.
- `returnTransactionController.ts` — only 3 new exported handlers at the bottom; existing handlers untouched.
- No schema changes to `return_transactions` or `return_transaction_items`.
- No changes to auth middleware.
- No changes to the existing `/reports` page (optimization) or `/analytics` page.
- No changes to `/documents` page (remains credit-memo focused).

New tables: **none**. New RPCs: **2-3 read-only functions** (safe, reversible).

---

## 8. Rollout / acceptance checklist

### Must-have (MVP)

- [ ] RPC `get_return_packet_data` deployed to Supabase.
- [ ] RPC `get_destruction_certificate_data` deployed.
- [ ] Backend: 3 new PDF endpoints return valid PDFs for a test return.
- [ ] Backend: 403 when license plate belongs to another pharmacy.
- [ ] Backend: `has_controls` and `destruction_confirmed` included in list response.
- [ ] Frontend: `/reports-hub` page with combobox + summary + 4 buttons.
- [ ] Frontend: Buttons correctly enable/disable from flags.
- [ ] Frontend: Deep-linking via `?license_plate=XXX` selects the right return on load.
- [ ] Sidebar shows "Reports Hub" when permission present.
- [ ] PDFs open in new tab with correct filename (`return-packet_3S38J.pdf`, etc.).

### Nice-to-have (phase 2)

- [ ] Signed Supabase Storage URLs with 5-min expiry (so PDFs can be emailed/shared).
- [ ] "Download All as ZIP" button per return.
- [ ] Audit log: every PDF view is logged to `document_access_log` (compliance).
- [ ] Admin tenant branding: pharmacy logo + letterhead on PDFs (reuse `pharmacyAdminBranding` settings).

### Env vars

None new required. Existing Supabase + JWT env vars are sufficient.

---

## 9. Risks & notes

- **Destruction data model unknown** — before writing `get_destruction_certificate_data` RPC, first inspect `destructions` (or equivalent) table in Supabase. Don't assume columns. Confirm via `sqlTable/destructions.sql` if it exists, otherwise via the Supabase dashboard.
- **Filename label:** stick with "License Plate" wording everywhere. Do **not** use "RefNum" — our schema doesn't have it.
- **PDF memory:** `pdfkit` is streaming; for large returns (500+ items), stream directly to `res` instead of buffering. `manifestService.generateManifestPdf` already does buffering — check its size behaviour before deploy.
- **Canvas dependency:** the switch to `@napi-rs/canvas` (previous deployment fix) is fine for barcode generation. Don't reintroduce `node-canvas`.
- **Combobox is purpose-built:** keep it inside `components/reports/` first. If a second page needs it later, promote to `components/ui/Combobox.tsx`.

---

## 10. TL;DR for implementation

1. Confirm the shape of the `destructions` table in Supabase before writing RPCs.
2. Deploy 2-3 new read-only RPCs.
3. Add 3 new handlers to `returnTransactionController.ts` + 3 routes.
4. Create `reportsPdfService.ts` + `reportsDataService.ts` (parallel to existing `manifestService.ts`).
5. Build `/reports-hub` page with combobox + summary + 4 buttons; open PDFs via `fetch + blob + window.open`.
6. Add sidebar entry + `pharmacyPortalRoutes.ts` entry + `middleware.ts` entry.
7. Add permission `reports_hub:view` to role seed.
8. QA: pick a completed return with and without controls; verify each button works or is correctly disabled.

**Estimated effort:** ~4-5 days for one full-stack dev (1 day RPCs + 2 days PDFs + 1 day page + 1 day QA/polish).

---

## 11. Relationship to On-Site Service feature

Both features ship together as **Phase 1 of the "Service & Transparency" push** identified in `PORTAL_UX_GAP_ANALYSIS.md`. They are independent (no shared code/tables) so they can ship in **either order** or in parallel. Recommended to ship **On-Site Service first** (simpler, self-contained) and **Reports Hub second** (needs RPC work + PDF design review).
