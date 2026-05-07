# Feature Spec: On-Site Service Requests (Field Rep Visit Scheduling)

> **Status:** 🟡 Not implemented — greenfield feature
> **Priority:** High (identified gap in `PORTAL_UX_GAP_ANALYSIS.md`)
> **Reference UX:** `new portal/request_onsite_services.html`
> **Owner:** Pharmacy Portal team

---

## 1. What this feature is

A dedicated page where a pharmacy can **request a field rep visit** (on-site service) for the primary store or a specific branch. The pharmacy picks a **preferred date**, writes optional **special instructions**, and submits. An internal scheduler (admin) receives the request, confirms a real appointment date, and the pharmacy sees request status in their dashboard.

This is **NOT** a live-booking calendar. It is a **"request → scheduler confirms"** flow (same as the reference portal). The submitted date is a preference only.

---

## 2. Why we need it (UX gap)

From the reference portal (`request_onsite_services.html`):

- A clear **"Request On-Site Service"** page as a first-class sidebar item.
- A **single, low-friction form** (date picker + free-text instructions + Submit).
- A prominent **disclaimer**: *"Selecting a date does not guarantee that the Rep will be available on that particular date. Your scheduler will be in touch to confirm."*
- **Inline success/error alert** (auto-dismiss ~3s) after submit.
- Form **resets on success**.

Our current portal has no equivalent. Pharmacies today must use `/support` (a generic ticket form) which does not convey urgency, dates, or scheduling intent. The support page is also still UI-only (no backend).

---

## 3. Required UX (matches reference portal exactly)

### 3.1 Page anatomy

```
┌─ DashboardLayout (existing shell)
│
├─ Page header
│     ▸ H1 title: "Request On-Site Service"
│     ▸ Subtitle: "Schedule a field representative visit for pickups, training, or support"
│     ▸ (right side) Link to "My Requests" tab / history
│
├─ Tabs: [ New Request ]  [ My Requests ]         ← mirrors Support page tab pattern
│
└─ Card (primary white card, shadow-sm)
      ▸ Disclaimer banner (amber info box)
      ▸ Label: "Preferred Visit Date *"
      ▸ Date input (HTML5 <input type="date">, min=today)
      ▸ Label: "Branch / Store *"          ← extra field vs. reference (we are multi-branch)
      ▸ Branch select (only visible if user isParent with >1 branch)
      ▸ Label: "Visit Purpose *"            ← extra, constrains follow-up
      ▸ Select: "Return Pickup" | "Training" | "Inventory Review" | "Destruction Pickup" | "Other"
      ▸ Label: "Special Instructions"
      ▸ Textarea (rows=6, placeholder="Access notes, contact person, time preferences, etc.")
      ▸ Button [ Submit Request ] (primary, full width on mobile)
      ▸ Inline success/error alert area
```

### 3.2 My Requests tab

Table with columns:
| Requested Date | Branch | Purpose | Submitted | Status | Scheduled For | Actions |
|---|---|---|---|---|---|---|

- **Status** badge colours:
  - `Pending` → amber
  - `Scheduled` → blue
  - `Completed` → green
  - `Cancelled` → gray
- **Actions**: `View` (opens detail modal), `Cancel` (only if Pending).

### 3.3 Detail modal

Read-only view of one request: requested date, branch, purpose, instructions, scheduler's confirmed date, scheduler's note, activity timeline.

### 3.4 Interaction rules

1. Submit button is **disabled** until date + branch + purpose chosen.
2. On submit, button shows spinner (`Loader2` + text "Submitting…").
3. On 200: `react-toastify` success toast + form reset + auto-switch to "My Requests" tab.
4. On 4xx/5xx: red inline alert with message (auto-dismiss ~5s) + toast.
5. No page reload anywhere.

### 3.5 Mobile UX

- Card full-width with `p-4`.
- Date picker is native (matches existing returns filters).
- Tabs stack vertically if screen < 640px (reuse Support page pattern).

---

## 4. Frontend implementation

### 4.1 Files to create

```
Frontend/app/(dashboard)/on-site-service/page.tsx              ← main page
Frontend/lib/api/services/onSiteServiceService.ts              ← API wrapper
Frontend/components/onsite/OnSiteRequestForm.tsx               ← form component
Frontend/components/onsite/OnSiteRequestsTable.tsx             ← history table
Frontend/components/onsite/OnSiteRequestDetailModal.tsx        ← detail modal
```

**URL:** `/on-site-service` (kebab-case to match `inventory-analysis`, `wine-cellar`, etc.)

### 4.2 Files to modify (surgical, no breakage)

**`Frontend/components/layout/Sidebar.tsx`**

Add to `navItems` (place between `Credits` and `Analytics & Reports`):

```tsx
{
  title: 'On-Site Service',
  href: '/on-site-service',
  icon: Calendar,                  // from lucide-react (already imported elsewhere)
  visible: hasPermission('on_site_service:view'),
},
```

**`Frontend/lib/utils/pharmacyPortalRoutes.ts`**

Add the same route + permission to `getFirstAllowedDashboardPath` **in the same relative position** as Sidebar (comment at top of file requires this).

**`Frontend/middleware.ts`**

Add `/on-site-service` to `protectedRoutes`.

### 4.3 Page skeleton

Mirrors `app/(dashboard)/support/page.tsx` (tab pattern) + `app/(dashboard)/returns/create/page.tsx` (real API submit with toast).

Key patterns:
- Wrap content in `<DashboardLayout>`.
- Wrap the body in `<PermissionGuard permission="on_site_service:view">`.
- Use `apiClient` (NOT raw fetch) so `pharmacy_id`, JWT, and `X-Tenant-Domain` are handled.
- Use **react-toastify** for toasts (global `ToastContainer` already in `app/layout.tsx`).
- Use `<input type="date">` with `min={new Date().toISOString().split('T')[0]}` — matches existing returns filter style.
- Use the **custom fixed-overlay modal** pattern (same as `returns/page.tsx` view modal) for the detail popup.

### 4.4 API service module

`Frontend/lib/api/services/onSiteServiceService.ts`:

```ts
import { apiClient } from '../client'

export interface OnSiteServiceRequest {
  id: string
  pharmacy_id: string
  branch_id: string | null
  requested_date: string        // ISO date
  purpose: 'return_pickup' | 'training' | 'inventory_review' | 'destruction_pickup' | 'other'
  special_instructions: string | null
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled'
  scheduled_date: string | null
  scheduler_notes: string | null
  created_at: string
  updated_at: string
}

export const onSiteServiceService = {
  list: (params?: { status?: string; limit?: number; page?: number }) =>
    apiClient.get<{ data: OnSiteServiceRequest[]; total: number }>('/on-site-service', params),

  getById: (id: string) =>
    apiClient.get<{ data: OnSiteServiceRequest }>(`/on-site-service/${id}`),

  create: (payload: {
    requested_date: string
    branch_id?: string
    purpose: OnSiteServiceRequest['purpose']
    special_instructions?: string
  }) => apiClient.post<{ data: OnSiteServiceRequest }>('/on-site-service', payload),

  cancel: (id: string) =>
    apiClient.post<{ data: OnSiteServiceRequest }>(`/on-site-service/${id}/cancel`, {}),
}
```

`apiClient` auto-attaches `pharmacy_id` (from the active branch context) to both GET query and POST body — do **not** send it manually.

### 4.5 Permission key

Add `on_site_service:view` and `on_site_service:create` to the backend permissions list (see §5.4). The Sidebar entry uses `view`; the form submit button is disabled if user lacks `create`.

---

## 5. Backend implementation

### 5.1 New files

```
src/routes/onSiteServiceRoutes.ts
src/controllers/onSiteServiceController.ts
src/services/onSiteServiceService.ts
sqlTable/service_requests.sql                  ← new migration
```

### 5.2 Database schema (new table)

**File:** `sqlTable/service_requests.sql`

```sql
CREATE TABLE IF NOT EXISTS service_requests (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id           UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    branch_id             UUID REFERENCES pharmacies(id) ON DELETE SET NULL,
    requested_by_user_id  UUID REFERENCES pharmacies(id),
    requested_date        DATE NOT NULL,
    purpose               TEXT NOT NULL
                          CHECK (purpose IN ('return_pickup','training','inventory_review','destruction_pickup','other')),
    special_instructions  TEXT,
    status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','scheduled','completed','cancelled')),
    scheduled_date        DATE,
    scheduler_notes       TEXT,
    assigned_admin_id     UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    cancelled_at          TIMESTAMPTZ,
    cancelled_reason      TEXT,
    completed_at          TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_requests_pharmacy_id ON service_requests(pharmacy_id);
CREATE INDEX idx_service_requests_status      ON service_requests(status);
CREATE INDEX idx_service_requests_created_at  ON service_requests(created_at DESC);

-- updated_at trigger (reuse existing pattern if present, else create)
CREATE TRIGGER trg_service_requests_updated_at
BEFORE UPDATE ON service_requests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

> **Note:** Backend uses `supabaseAdmin` which bypasses RLS, so RLS policies are optional. If you want defense in depth, add a policy `pharmacy_id = auth.uid()`.

### 5.3 Route registration

**Modify `src/server.ts`** — add one line in the pharmacy routes block (near line 147, before `notificationRoutes`):

```ts
import onSiteServiceRoutes from './routes/onSiteServiceRoutes';
// ...
app.use('/api/on-site-service', onSiteServiceRoutes);
```

### 5.4 API endpoints

All endpoints use `authenticate` middleware → `req.pharmacyId`.

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/api/on-site-service` | List pharmacy's own requests (paginated, filterable by status) |
| `GET`  | `/api/on-site-service/:id` | Get one (must belong to `req.pharmacyId` or a descendant branch) |
| `POST` | `/api/on-site-service` | Create new request |
| `POST` | `/api/on-site-service/:id/cancel` | Cancel (only if status=`pending`) |

**Admin endpoints (separate file, `authenticateAdmin`):**

```
src/routes/adminOnSiteServiceRoutes.ts
```

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/api/admin/on-site-service` | List all requests across pharmacies (filter by status, date, buying_group) |
| `PATCH`| `/api/admin/on-site-service/:id/schedule` | Confirm: sets `status='scheduled'`, `scheduled_date`, `scheduler_notes`, `assigned_admin_id` |
| `PATCH`| `/api/admin/on-site-service/:id/complete` | Mark completed + optional notes |

### 5.5 Controller pattern (follow existing conventions)

- Use `catchAsync` wrapper (`src/utils/catchAsync.ts`).
- Throw `new AppError(msg, 400)` on validation errors.
- Read pharmacy from **`req.pharmacyId`** — never trust `pharmacy_id` from body for ownership.
- Response envelope: `{ status: 'success', data }` or `{ status: 'success', data, total }`.
- Manual validation (no Zod — the project does not use it).

**Validation rules in controller:**
- `requested_date` must parse as ISO date AND be `>= today`.
- `purpose` must be one of the 5 enum values.
- `special_instructions` max length 2000.
- `branch_id` if provided must belong to the same parent pharmacy tree as `req.pharmacyId`.

### 5.6 Service layer (`src/services/onSiteServiceService.ts`)

Thin wrapper around `supabaseAdmin.from('service_requests')`:

```ts
export async function createServiceRequest(payload: CreatePayload) {
  const { data, error } = await supabaseAdmin
    .from('service_requests')
    .insert({ ...payload, status: 'pending' })
    .select('*')
    .single();
  if (error) throw new AppError(error.message, 500);
  return data;
}

export async function listForPharmacy(pharmacyId: string, filters) { … }
export async function getByIdScoped(id: string, pharmacyId: string) { … }
export async function cancelRequest(id: string, pharmacyId: string) { … }
```

For the pharmacy list/get, scope the query with `.or()` so both parent pharmacy and its branches can see requests they own:

```ts
.or(`pharmacy_id.eq.${pharmacyId},branch_id.eq.${pharmacyId}`)
```

### 5.7 Notifications (email the scheduler + in-app)

**On CREATE:**

1. Call `notificationService.createPharmacyNotification` with type `service_request_created` so pharmacy sees it in the bell dropdown.
2. Call `emailService.sendEmail` (already wired — `src/services/emailService.ts`) to the scheduler inbox.
   - Admin recipient(s): new env var `ONSITE_SCHEDULER_EMAIL` (comma-separated). Fallback: `process.env.ADMIN_NOTIFICATIONS_EMAIL`.
   - Subject: `New On-Site Service Request — {pharmacyName} — {requestedDate}`
   - Body: simple HTML table with all fields + deep link to `/admin/on-site-service/:id`.

**On SCHEDULE (admin confirms):**

1. Email pharmacy primary contact:
   - Subject: `Your on-site service is scheduled for {scheduledDate}`
   - Body: pharmacy greeting, scheduled date, scheduler's notes, contact info.
2. Create a `pharmacy_notification` row (type `service_request_scheduled`) so bell shows it.

**On CANCEL (pharmacy cancels):**

1. Email scheduler (simple notice, no customer action needed).

> **Pattern reuse:** `src/services/notificationCronService.ts` already shows how to send email + create `pharmacy_notifications` together. Import and reuse `sendEmail` and the Supabase insert pattern.

### 5.8 Permission system

Add two new keys to the pharmacy permissions catalog (source of truth is in backend — pharmacy roles RPCs):

- `on_site_service:view`
- `on_site_service:create`

These need to be registered in the role-permission seeding (`src/services/pharmacyRoleService.ts` or the corresponding `create_pharmacy_role` RPC seed list). Grant both to `parent`/`full_access` roles by default.

### 5.9 Cron (optional, phase 2)

Add a daily job in `notificationCronService.ts` that emails pharmacies 24h before a `scheduled_date` as a reminder. Not required for MVP.

---

## 6. Data flow (end to end)

```
Pharmacy fills form (FE)
      │
      ▼
POST /api/on-site-service  { requested_date, branch_id, purpose, special_instructions }
      │
      ▼
authenticate → req.pharmacyId
      │
      ▼
onSiteServiceController.create
      │  - validate inputs
      │  - insert row (status=pending)
      │  - email ONSITE_SCHEDULER_EMAIL
      │  - create pharmacy_notifications row
      ▼
respond { status:'success', data: request }
      │
      ▼
Frontend: toast + reset + switch to "My Requests" tab
```

```
Admin opens /api/admin/on-site-service → assigns scheduled_date, scheduler_notes → PATCH /:id/schedule
      │
      ▼
status = 'scheduled', assigned_admin_id set
      │
      ▼
email pharmacy + create pharmacy_notifications (bell dot on portal)
      │
      ▼
Pharmacy sees new status in "My Requests"
```

---

## 7. What we **won't** touch (to keep things stable)

- No changes to `returns`, `return_transactions`, or `pharmacies` tables.
- No changes to existing auth middleware.
- No changes to existing routes or `server.ts` beyond the two new `app.use` lines.
- Sidebar change is **additive only** (one new nav item).
- `pharmacyPortalRoutes.ts` and `middleware.ts` changes are **additive only**.
- No migration runs on existing rows.

---

## 8. Rollout / acceptance checklist

### Must-have (MVP)

- [ ] `service_requests` table created in Supabase (run `sqlTable/service_requests.sql`).
- [ ] Backend endpoints `/api/on-site-service` (pharmacy CRUD) return `{status:'success', data}`.
- [ ] Backend endpoints `/api/admin/on-site-service` for scheduler workflow.
- [ ] Email to `ONSITE_SCHEDULER_EMAIL` on create.
- [ ] Email to pharmacy on schedule.
- [ ] `pharmacy_notifications` rows created at both events (bell icon lights up).
- [ ] Frontend page `/on-site-service` renders with tabs, form, table.
- [ ] Sidebar item visible when permission granted.
- [ ] Form validation matches §5.5 rules.
- [ ] Cancel flow works only for `pending`.
- [ ] Disclaimer text present and visible (§3.1 banner).

### Nice-to-have (phase 2)

- [ ] 24-hour reminder cron.
- [ ] Admin calendar view (grouped by scheduled_date).
- [ ] Attach photos to request (reuse `multer` + Supabase Storage `documents` bucket).
- [ ] iCal/Google Calendar invite link from confirmation email.

### Env vars to add (Railway + `.env.example`)

- `ONSITE_SCHEDULER_EMAIL=scheduler@yourcompany.com`
- (optional) `ONSITE_SCHEDULER_EMAIL_CC=ops@yourcompany.com`

---

## 9. Risks & notes

- **No Zod in the backend** — keep validation centralized in the controller. Do not add Zod just for this feature (inconsistent with the rest of the codebase).
- **Branch context:** `req.pharmacyId` under `authenticate` reflects the **effective branch** (via `loginAsBranch`), so scoping by `pharmacyId` already works correctly for branch users.
- **Mirror exact reference UX** for the disclaimer copy — pharmacies are used to that wording and it sets correct expectations.
- **`/support` page stays** (separate generic help channel). Don't merge the two.

---

## 10. TL;DR for implementation

1. Copy the SQL → run in Supabase.
2. Create `onSiteServiceRoutes` + controller + service (mirror `documentsRoutes` structure).
3. Register routes in `server.ts` (2 new lines).
4. Add sidebar entry + `pharmacyPortalRoutes.ts` entry + `middleware.ts` entry.
5. Build the page with Support's tab pattern + Create Return's API/toast pattern.
6. Wire emails through existing `emailService.sendEmail`.
7. Test: create → admin schedules → pharmacy sees status change + email + bell notification.

**Estimated effort:** ~3-4 days for one full-stack dev (FE page + BE table/routes + 2 email templates + QA).
