# FCR (First Class Returns) — Development Guide

**Document Version:** 1.0  
**Created:** March 9, 2026  
**Based on:** Client's FCR Workflow document + SYSTEM_ARCHITECTURE_DIAGRAMS.md  
**Developers:** Saboor (Backend + Admin) | Younas (Frontend + Integration)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Where This Fits — System Decision](#2-where-this-fits--system-decision)
3. [Developer Assignments](#3-developer-assignments)
4. [Module 1: Store Setup & Master Data](#module-1-store-setup--master-data)
5. [Module 2: User Access & Role-Based Entry](#module-2-user-access--role-based-entry)
6. [Module 3: Return Transaction Creation](#module-3-return-transaction-creation)
7. [Module 4: Product Scanning & Entry](#module-4-product-scanning--entry)
8. [Module 5: Policy Engine](#module-5-policy-engine)
9. [Module 6: Item Routing & Disposition](#module-6-item-routing--disposition)
10. [Module 7: Wine Cellar System](#module-7-wine-cellar-system)
11. [Module 8: Return Finalization & Shipping](#module-8-return-finalization--shipping)
12. [Module 9: Warehouse Receiving](#module-9-warehouse-receiving)
13. [Module 10: Monthly Batch & Close-Out](#module-10-monthly-batch--close-out)
14. [Module 11: RA Request & Tracking](#module-11-ra-request--tracking)
15. [Module 12: Manufacturer Payment Tracking](#module-12-manufacturer-payment-tracking)
16. [Module 13: Pharmacy & GPO Payout](#module-13-pharmacy--gpo-payout)
17. [Module 14: Reporting & Analytics](#module-14-reporting--analytics)
18. [Edge Cases Reference](#edge-cases-reference)
19. [Database Tables Summary](#database-tables-summary)
20. [API Endpoints Summary](#api-endpoints-summary)
21. [AI Prompt Guidelines for Cursor](#ai-prompt-guidelines-for-cursor)

---

## 1. Project Overview

### What We're Building

A **pharmaceutical returns processing system** that digitizes the client's legacy desktop application ("First Class Returns Processor 2019"). This system handles the complete return lifecycle:

1. **Field Processing** — Processor visits pharmacy, scans products, classifies them
2. **Warehouse Receiving** — HQ receives boxes, verifies items, assigns to batches
3. **Close-Out & RA** — Generate debit memos, request return authorizations
4. **Credit Collection** — Track manufacturer payments, pay pharmacies

### Client Document Reference

The client provided `FCR Workflow.docx` which describes 21 workflow steps with edge cases. **Every feature we build must handle the edge cases listed in that document.**

### Key Business Rules (from client document)

- License plate format: `MMDDYY-23HA-XXXX` (date + internal code + store suffix)
- 90%+ of bottles have QR codes now
- Return window: typically 6 months prior to 6 months post expiration
- Partial bottles CANNOT be combined (tamper/seal concerns)
- Destinations: Inmar (~90%), PharmaLink, Qualanex/Colonex
- Ask price = full WAC; actual received = lower (avg ~73%)
- Avg payment time: ~297 days

---

## 2. Where This Fits — System Decision

### Decision: Extend Existing Apps (NOT separate system)

| Component | Where to Build | Reason |
|-----------|----------------|--------|
| **Processor workflow** | Admin app (`/admin`) | Processors are internal staff, use admin-style auth |
| **Warehouse workflow** | Admin app (`/admin`) | Warehouse staff are internal, same auth system |
| **Self-service returns** | Pharmacy Frontend (`/Frontend`) | Pharmacies creating their own returns |
| **Backend APIs** | Existing backend (`/src`) | Shared database, shared auth |

### App Responsibilities

```
ADMIN APP (admin/)
├── Existing: Dashboard, Pharmacies, Distributors, Marketplace, Documents, Payments, Analytics, Admins, Settings
└── NEW: 
    ├── /processors — Processor management
    ├── /warehouse — Warehouse dashboard
    ├── /warehouse/returns — Return transactions list
    ├── /warehouse/returns/create — Create return (processor workflow)
    ├── /warehouse/receiving — FedEx receiving
    ├── /warehouse/wine-cellar — Wine cellar items
    ├── /warehouse/batches — Monthly batches
    ├── /warehouse/debit-memos — Debit memo list
    ├── /warehouse/ra-tracking — RA request tracking
    ├── /warehouse/unpaid — Unpaid debit memos
    ├── /warehouse/destruction — Destruction records
    ├── /policies — Manufacturer policies CRUD
    └── /ndc-pricing — NDC pricing management

PHARMACY FRONTEND (Frontend/)
├── Existing: Dashboard, Products, Inventory, Returns, Documents, Marketplace, etc.
└── NEW/EXTEND:
    ├── /returns/start — Self-service return creation (extend existing)
    ├── /returns/status — Return lifecycle tracking
    └── /credits/statement — Credit statement view
```

---

## 3. Developer Assignments

### Saboor — Backend + Admin Panel

**Focus:** Database, API endpoints, Admin UI for warehouse/processor workflows

| Phase | Modules | Priority |
|-------|---------|----------|
| Phase 1 | Database tables, Auth middleware, Policies API | Week 1-2 |
| Phase 2 | Return transactions API, Policy engine, Admin UI for processors | Week 2-4 |
| Phase 3 | Warehouse receiving API, Batch/close-out API, Admin warehouse UI | Week 4-6 |
| Phase 4 | RA tracking API, Debit memo API, Payment tracking | Week 6-8 |

### Younas — Pharmacy Frontend + Integration

**Focus:** Self-service pharmacy workflow, barcode scanning, UI integration

| Phase | Modules | Priority |
|-------|---------|----------|
| Phase 1 | Extend pharmacy schema UI, Self-service return start page | Week 1-2 |
| Phase 2 | Product scanning integration, Policy display, Return status page | Week 2-4 |
| Phase 3 | Credit statement page, Wire up existing mock pages | Week 4-6 |
| Phase 4 | Reporting UI, Analytics integration | Week 6-8 |

---

## Module 1: Store Setup & Master Data

### ✅ **STATUS: Fully Complete — Backend + Frontend + Admin + Processor UI**

| Component | Status | Files |
|-----------|--------|-------|
| **Database Schema** | ✅ Complete | `scripts/fcr_01_*.sql` (3 files) + `fcr_05_add_admin_user_id_to_processors.sql` |
| **Pharmacy Store Settings API** | ✅ Complete | GET/PATCH `/api/admin/pharmacies/:id/store-settings` |
| **Pharmacy Settings (self-service)** | ✅ Complete | GET/PATCH `/api/settings/store-settings` |
| **Processors Management API** | ✅ Complete | Full CRUD at `/api/admin/processors/*` + login creation |
| **Processor My-Stores API** | ✅ Complete | GET `/api/processors/my-stores` |
| **Pharmacy Frontend** | ✅ Complete | Store Settings tab + DEA warning in `Frontend/` |
| **Admin Processors UI** | ✅ Complete | Admin can create/manage processors in `admin/` |
| **Processor Role-Based UI** | ✅ Complete | Processor dashboard + store selection in `admin/` |
| **Admin Processors Page** | ✅ Complete | Full CRUD UI at `admin/app/processors/page.tsx` |

### What Client Document Says (Section 1)

> "Before any return can happen, the store has to exist in the system."

Required fields:
- Store number/identifier
- Pharmacy demographics and address
- Primary wholesaler + wholesaler account number
- Secondary wholesaler (if applicable)
- Sales rep / processor assignment
- Service type: rep processes onsite | self-service web | store box-and-ship/express
- Last visit date
- DEA number + DEA expiration
- GPO / white-label grouping
- Payment settings

### Edge Cases to Handle

- Store has multiple wholesalers and wrong one selected
- Missing wholesaler account number (blocks downstream)
- DEA info expired or missing
- Store belongs to GPO but not linked correctly
- Processor can see wrong stores
- Self-service account sees more than its own store

### Developer Tasks

#### Saboor (Backend) ✅ **COMPLETED**

**Task 1.1: Extend pharmacy table schema** ✅ **DONE**

- ✅ **File created:** `scripts/fcr_01_extend_pharmacy_table.sql`
- ✅ **Added 12 new columns** to existing `pharmacy` table:
  - `store_number` (VARCHAR 10, unique identifier like "5544")
  - `primary_wholesaler` (TEXT)
  - `wholesaler_account_number` (TEXT)
  - `secondary_wholesaler` (TEXT)
  - `gpo_affiliation` (TEXT)
  - `service_type` (ENUM: 'full_service', 'self_service', 'express')
  - `assigned_processor_id` (UUID, FK to processors)
  - `assigned_sales_person_id` (UUID)
  - `last_visit_date` (DATE)
  - `next_visit_date` (DATE)
  - `days_between_visits` (INTEGER, default 120)
  - `dea_expiration_date` (DATE)
  - `fax_number` (TEXT)
- ✅ **Indexes created** on `store_number` and `assigned_processor_id`

**Task 1.2: Create processors table** ✅ **DONE**

- ✅ **File created:** `scripts/fcr_02_create_processors_table.sql`
- ✅ **Table created:** `processors` with auto-update trigger
- ✅ **Foreign key added:** `pharmacy.assigned_processor_id → processors.id`

**Task 1.3: Create processor_store_assignments table** ✅ **DONE**

- ✅ **File created:** `scripts/fcr_03_create_processor_store_assignments.sql`
- ✅ **Junction table created** with unique constraint and indexes

**Task 1.4: Extend pharmacies API** ✅ **DONE**

- ✅ **Extended:** `src/services/adminPharmaciesService.ts`
- ✅ **Extended:** `src/controllers/adminPharmaciesController.ts`  
- ✅ **Extended:** `src/routes/adminPharmaciesRoutes.ts`
- ✅ **New endpoints:**
  - `GET /api/admin/pharmacies/:id/store-settings` — Get FCR store settings
  - `PATCH /api/admin/pharmacies/:id/store-settings` — Update FCR store settings
- ✅ **Features:** DEA expiration warnings, store number uniqueness validation

**Task 1.5: Create processors API** ✅ **DONE**

- ✅ **Files created:**
  - `src/services/processorsService.ts`
  - `src/controllers/processorsController.ts`
  - `src/routes/processorsRoutes.ts`
- ✅ **Mounted in:** `src/server.ts` at `/api/admin/processors`
- ✅ **Endpoints created:**
  - `GET /api/admin/processors` — List all processors
  - `POST /api/admin/processors` — Create processor
  - `GET /api/admin/processors/:id` — Get processor details
  - `PATCH /api/admin/processors/:id` — Update processor
  - `DELETE /api/admin/processors/:id` — Deactivate processor
  - `GET /api/admin/processors/:id/stores` — Get assigned stores
  - `POST /api/admin/processors/:id/assign-stores` — Assign stores to processor
  - `DELETE /api/admin/processors/:id/stores/:pharmacyId` — Unassign store

#### Younas (Frontend)

**Task 1.6: Create Admin Processors Management Page** ✅ **DONE**

- ✅ **Page created:** `admin/app/processors/page.tsx`
- ✅ **Redux slice created:** `admin/lib/store/processorsSlice.ts`
- ✅ **Types added:** `Processor`, `AssignedStore`, `ProcessorCreatePayload`, `ProcessorUpdatePayload`, `ProcessorsResponse` in `admin/lib/types/index.ts`
- ✅ **Store registered:** `processors` reducer added to `admin/lib/store/store.ts`
- ✅ **Sidebar updated:** "Processors" link (UserCog icon) added to `admin/components/layout/Sidebar.tsx`
- ✅ **Thunks implemented:**
  - `fetchProcessors` — List with pagination, search, status filter
  - `createProcessor` — Add new processor (sends name, email, password, phone, notes)
  - `updateProcessor` — Edit name, email, phone, status, notes
  - `deactivateProcessor` — Soft-deactivate via DELETE endpoint
  - `fetchProcessorStores` — Load a processor's assigned stores
  - `assignStoresToProcessor` — Multi-select pharmacy assignment
  - `unassignStoreFromProcessor` — Remove a store from processor
- ✅ **UI Features:**
  - Stats cards: Total, Active, Inactive, Total Stores Assigned
  - Table: Name, Email, Phone, Status, Stores count (clickable), Created date, Actions
  - Search by name/email, filter by status (all/active/inactive)
  - Pagination (15 per page)
  - **View modal:** Full processor detail card
  - **Add modal:** Name (required), Email (required), Password (required, min 8 chars, show/hide toggle), Phone, Notes — processor can log into admin panel with these credentials
  - **Edit modal:** All fields + status toggle
  - **Assigned Stores modal:** List all stores with unassign button + "Assign More" shortcut
  - **Assign Stores modal:** Searchable pharmacy list with multi-select checkboxes
  - **Deactivate confirmation modal:** Safety prompt before deactivating
  - Toast notifications for all actions

**Task 1.7: Extend pharmacy settings page** ✅ **DONE**

- ✅ **Location:** `Frontend/app/(dashboard)/settings/page.tsx`
- ✅ **API service created:** `Frontend/lib/api/services/fcrStoreSettingsService.ts`
- ✅ **Exported in:** `Frontend/lib/api/services/index.ts`
- ✅ **New "Store Settings" tab** added to the settings page tabs
- ✅ **Form fields implemented:**
  - Store number (text input, max 10 chars, with helper text)
  - Service type selector (dropdown: `full_service` / `self_service` / `express`)
  - Primary wholesaler (text input)
  - Wholesaler account number (text input, marked as required)
  - Secondary wholesaler (text input, optional)
  - GPO affiliation (text input)
  - DEA expiration date (date picker)
  - Days between visits (number input, 1–365, default 120)
  - Fax number (text input, optional)
  - Last visit date (read-only, set by processor)
  - Next visit date (read-only, auto-calculated)
  - Assigned processor name (read-only)
- ✅ **Features:**
  - Lazy-loads store settings only when tab is clicked
  - Edit/Save/Cancel pattern matching existing Profile tab
  - Only sends changed fields to API (diff-based updates)
  - Loading states, error handling, success notifications
  - Proper validation (daysBetweenVisits 1–365)

**Task 1.8: Add DEA expiration warning** ✅ **DONE**

- ✅ **Location:** `Frontend/app/(dashboard)/settings/page.tsx` — Store Settings tab
- ✅ **Implementation:** Warning banner at top of Store Settings tab
- ✅ **Styling based on `deaExpirationWarning` value:**
  - Red banner with AlertTriangle icon for `"DEA is expired"`
  - Yellow banner for `"DEA expires in X days"`
  - Gray banner for `"DEA expiration date is missing"`
  - No banner when `null` (DEA is valid and not expiring soon)

### How to Implement (Guidance for Cursor AI)

**Backend Status:** ✅ **ALL BACKEND TASKS COMPLETED**
- Database migrations ready in `scripts/fcr_01_*.sql` files
- APIs ready at `/api/admin/pharmacies/:id/store-settings` and `/api/admin/processors/*`

**Frontend Status:** ✅ **ALL TASKS COMPLETED**
- Task 1.6 **COMPLETED**: Admin Processors Management Page (`admin/app/processors/page.tsx`)
- Task 1.7 **COMPLETED**: Pharmacy Store Settings tab (`Frontend/app/(dashboard)/settings/page.tsx`)
- Task 1.8 **COMPLETED**: DEA expiration warning banner
- API service created: `Frontend/lib/api/services/fcrStoreSettingsService.ts`

**API Endpoints Used by Frontend:**
- `GET /api/admin/pharmacies/:id/store-settings` — Returns all FCR fields + DEA warning
- `PATCH /api/admin/pharmacies/:id/store-settings` — Updates FCR fields with validation
- `GET /api/admin/processors` — List processors (for admin page)
- `POST /api/admin/processors` — Create processor
- `PATCH /api/admin/processors/:id` — Update processor
- `GET /api/admin/processors/:id/stores` — Get assigned stores
- `POST /api/admin/processors/:id/assign-stores` — Assign stores

**Cursor AI Prompts for Remaining Tasks:**

Task 1.6 (Admin Processors page):
```
Create a new admin page at admin/app/processors/page.tsx for managing processors. Follow the pattern from admin/app/admins/page.tsx. Create a table showing processor name, email, phone, status, and assigned stores count. Add search/filter functionality. Include 'Add Processor' button with modal form. Add row actions for Edit, View Stores, and Deactivate. Use the processors API endpoints: GET /api/admin/processors for listing, POST for creating, PATCH for updating. Create a store assignment modal that shows available pharmacies and allows assigning/unassigning stores using the store assignment endpoints.
```

---

## Module 2: User Access & Role-Based Entry

### ✅ **STATUS: Backend Complete**

| Component | Status | Files |
|-----------|--------|-------|
| **Admin Roles Extension** | ✅ Complete | `scripts/fcr_04_extend_admin_roles.sql` |
| **Processor ↔ Admin Link** | ✅ Complete | `scripts/fcr_05_add_admin_user_id_to_processors.sql` |
| **Processor Auth Middleware** | ✅ Complete | `src/middleware/processorAuth.ts` |
| **My-Stores Endpoint** | ✅ Complete | `GET /api/processors/my-stores` |
| **Processor Login** | ✅ Complete | Processors auto-get admin account (role=processor) on creation |

### What Client Document Says (Section 2)

> "There are different entry paths depending on who is doing the work."

Paths:
- Internal processor logs in → sees only stores assigned to them
- Self-service pharmacy logs in → sees only its own store
- Box-and-ship/express may bypass store-side scanning

### Edge Cases to Handle

- Rep/processor has access to too many stores
- Self-service pharmacy sees another store's data
- Store starts wrong service type flow
- Permissions don't match commercial relationship (GPO white-label)

### Developer Tasks

#### Saboor (Backend) ✅ **COMPLETED**

**Task 2.1: Add processor role to admin auth** ✅ **DONE**

- ✅ **File created:** `src/middleware/processorAuth.ts`
- ✅ **Middleware:** `authenticateProcessor`
  - Verifies admin JWT (same login system as other admins)
  - Checks `role === 'processor'`
  - Resolves processor record (by `admin_user_id` or email fallback)
  - Sets `req.processorId` and `req.assignedStoreIds` on the request
- ✅ Rejects non-processor roles with 403
- ✅ Rejects inactive processor accounts

**Task 2.2: Create store access middleware** ✅ **DONE**

- ✅ **File:** `src/middleware/processorAuth.ts` (same file as 2.1)
- ✅ **Middleware:** `checkProcessorStoreAccess`
  - Reads `pharmacy_id` from params, query, or body
  - Checks if the pharmacy is in `req.assignedStoreIds`
  - Returns 403 if not assigned
  - Passes through for non-processor roles (so admins can still access)

**Task 2.3: Extend admin roles enum** ✅ **DONE**

- ✅ **File created:** `scripts/fcr_04_extend_admin_roles.sql`
- ✅ **Roles added:** `processor`, `warehouse_staff`, `sales_rep`
- ✅ **File created:** `scripts/fcr_05_add_admin_user_id_to_processors.sql`
- ✅ **Column added:** `processors.admin_user_id` (FK to `admin.id`)

**Module 1 Fix: Processor creation now auto-creates admin login** ✅ **DONE**

- ✅ **Updated:** `src/services/processorsService.ts` — `createProcessor()`
  - Now requires `email` and `password`
  - Creates an `admin` row with role `processor` + hashed password
  - Links it to the processor via `admin_user_id`
  - Rollback: if processor insert fails, the admin row is deleted
- ✅ **Updated:** `src/controllers/processorsController.ts` — validates email + password
- ✅ **Updated:** `deactivateProcessor()` — also deactivates the linked admin account
- ✅ **Flow:** Admin creates processor → processor gets email + password → processor logs in to admin panel → sees only their stores

**Task 2.4: Create endpoint for processor's assigned stores** ✅ **DONE**

- ✅ **File created:** `src/routes/processorMyRoutes.ts`
- ✅ **Mounted in:** `src/server.ts` at `/api/processors`
- ✅ **Endpoint:** `GET /api/processors/my-stores`
  - Protected by `authenticateProcessor` middleware
  - Returns: businessName, storeNumber, city, state, address, serviceType, lastVisitDate, nextVisitDate
- ✅ **Service function:** `getMyStores()` in `processorsService.ts`

#### Younas (Frontend)

**Task 2.5: No changes needed for pharmacy frontend** ✅ **N/A**

- Pharmacy users already see only their own store (existing `pharmacy_id` from token)
- Self-service flow will use existing auth
- ✅ **Admin side aligned:** Add Processor form in `admin/app/processors/page.tsx` now requires `email` + `password` fields (matching backend's auto-create admin login flow from Module 1 Fix / Task 2.3)

### How to Implement (Guidance for Cursor AI)

**Backend Status:** ✅ **ALL MODULE 2 BACKEND TASKS COMPLETED**

**What was built and how processors use the system now:**
1. Admin creates a processor via `POST /api/admin/processors` (with name, email, password)
2. System automatically creates an admin login (role = `processor`) + processor record
3. Processor logs in to the admin panel with that email + password (same login endpoint as admins)
4. After login, processor calls `GET /api/processors/my-stores` to see their assigned stores
5. All future processor-facing endpoints use `authenticateProcessor` + `checkProcessorStoreAccess` middleware

**API Endpoints Available:**
- `GET /api/processors/my-stores` — Processor's own assigned stores (uses processor token)
- `POST /api/admin/processors` — Now requires `email` + `password` (creates login automatically)

**Middleware Available for Future Modules:**
- `authenticateProcessor` — Verify processor JWT + load processorId + assignedStoreIds
- `checkProcessorStoreAccess` — Verify processor has access to the requested pharmacy_id

---

## 🧪 Testing Modules 1 & 2

### Prerequisites
1. **Database Setup**: Run all SQL migration files in `scripts/` folder:
   ```bash
   # Run these in order on your Supabase database
   psql -f scripts/fcr_01_extend_pharmacy_table.sql
   psql -f scripts/fcr_02_create_processors_table.sql
   psql -f scripts/fcr_03_create_processor_store_assignments.sql
   psql -f scripts/fcr_04_extend_admin_roles.sql
   psql -f scripts/fcr_05_add_admin_user_id_to_processors.sql
   ```

2. **Backend Running**: Ensure `src/server.ts` is running on port 3000
3. **Admin Panel Running**: Ensure `admin/` Next.js app is running

### Test Case 1: Admin Creates Processor (Module 1)

**Step 1:** Login to Admin Panel as super_admin
- URL: `http://localhost:3001/login`
- Use your existing admin credentials

**Step 2:** Create a Processor
- Navigate to: **Processors** (in sidebar)
- Click: **Add Processor**
- Fill form:
  - Name: `Test Processor`
  - Email: `younas@gmail.com`
  - Password: `password`
  - Phone: `555-0123`
- Submit form
- ✅ **Expected**: Processor created successfully

**Step 3:** Assign Processor to Store
- In processor details, click **Assign Stores**
- Select one or more pharmacies
- ✅ **Expected**: Store assignments saved

### Test Case 2: Processor Login & Role-Based UI (Module 2)

**Step 1:** Logout from Admin Panel
- Click logout in top-right corner

**Step 2:** Login as Processor
- URL: `http://localhost:3001/login`
- Email: `younas@gmail.com`
- Password: `password`
- ✅ **Expected**: Login successful

**Step 3:** Verify Processor Dashboard
- ✅ **Expected**: See "Processor Dashboard" (not admin dashboard)
- ✅ **Expected**: Sidebar shows: Dashboard, Returns, Create Return, Wine Cellar, Settings
- ✅ **Expected**: No access to admin features (Pharmacies, Distributors, etc.)

**Step 4:** Test Store Access
- Click: **Create Return** (in sidebar)
- ✅ **Expected**: See list of assigned stores only
- ✅ **Expected**: Can select a store
- ✅ **Expected**: "Create Return Transaction" button appears

### Test Case 3: Backend API Verification

**Test Processor My-Stores API:**
```bash
# 1. Login as processor to get token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"younas@gmail.com","password":"password"}'

# 2. Use the returned token to call my-stores
curl -X GET http://localhost:3000/api/processors/my-stores \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

✅ **Expected Response:**
```json
{
  "success": true,
  "data": {
    "stores": [
      {
        "assignmentId": "uuid",
        "pharmacyId": "uuid", 
        "businessName": "Store Name",
        "storeNumber": "1234",
        "city": "City",
        "state": "State"
      }
    ]
  }
}
```

### Test Case 4: Access Control Verification

**Test 1:** Non-processor admin tries to access my-stores
```bash
# Login as super_admin, then call processor endpoint
curl -X GET http://localhost:3000/api/processors/my-stores \
  -H "Authorization: Bearer ADMIN_TOKEN"
```
✅ **Expected**: `403 Forbidden` (Only processors can access this endpoint)

**Test 2:** Processor tries to access admin endpoints
- Login as processor in admin panel
- Try to navigate to `/pharmacies` or `/processors`
- ✅ **Expected**: Should not see these menu items in sidebar

### Troubleshooting

**Issue**: Processor login fails
- **Check**: Processor was created with email/password (not just name/phone)
- **Check**: `admin` table has user with `role='processor'` and matching email

**Issue**: Processor sees admin UI instead of processor UI
- **Check**: User object in Redux store has `role: 'processor'`
- **Check**: `authSlice.ts` is properly setting user.role from login response

**Issue**: My-stores API returns empty array
- **Check**: Processor is assigned to stores in `processor_store_assignments` table
- **Check**: Processor's `admin_user_id` links correctly to `admin` table

---

## Module 3: Return Transaction Creation

### ✅ **STATUS: Fully Complete — Backend + Admin Frontend**

| Component | Status | Files |
|-----------|--------|-------|
| **Database Schema + RPC Functions** | ✅ Complete | `scripts/fcr_06_create_return_transactions.sql` (table + 6 RPC functions) |
| **License Plate Generator** | ✅ Complete | `create_return_transaction()` RPC — generates inside PostgreSQL |
| **Return Transaction CRUD** | ✅ Complete | Full REST API at `/api/return-transactions/*` — all powered by Supabase RPC |
| **Duplicate Prevention** | ✅ Complete | 409 if pharmacy has active return; `forceCreate` override — handled in RPC |
| **Lifecycle Endpoints** | ✅ Complete | pause / resume / complete / finalize — `change_return_transaction_status()` RPC |
| **Auth** | ✅ Complete | Works with both processor and admin tokens |
| **Swagger Docs** | ✅ Complete | Available at `/api-docs` under "Return Transactions" tag |
| **Redux Slice** | ✅ Complete | `admin/lib/store/returnTransactionsSlice.ts` + registered in store |
| **Create Return Page** | ✅ Complete | `admin/app/warehouse/returns/create/page.tsx` |
| **Returns List Page** | ✅ Complete | `admin/app/warehouse/returns/page.tsx` |
| **Return Detail Page** | ✅ Complete | `admin/app/warehouse/returns/[id]/page.tsx` |

> **⚠️ Architecture Note**: All business logic for Module 3 lives in PostgreSQL RPC functions.
> The TypeScript service layer (`src/services/returnTransactionService.ts`) contains **zero SQL queries** —
> it only calls `supabaseAdmin.rpc('function_name', { params })` and handles errors.
> This is the same pattern used in `adminPharmaciesService.ts`.

### What Client Document Says (Section 3)

> "A return is created for a selected store. System generates a unique return 'license plate' at the moment the return starts."

License plate format: `MMDDYY-23HA-XXXX`
- MMDDYY = date
- 23HA = internal code (house account identifier)
- XXXX = store number (last 4 digits)

### Edge Cases to Handle

- Same store wants two returns on same day
- Duplicate return created accidentally
- Need to merge second return into first
- Store starts return but never completes
- Return created under wrong store

### Developer Tasks

#### Saboor (Backend) ✅ **COMPLETED**

**Task 3.1: Create return_transactions table + RPC functions** ✅ DONE
- ✅ File: `scripts/fcr_06_create_return_transactions.sql`
- ✅ Table with all columns from spec (license_plate, pharmacy_id, processor_id, service_type, status, fedex tracking, totals, batch_id, timestamps, notes)
- ✅ Indexes on pharmacy_id, processor_id, status, license_plate, created_at, batch_id
- ✅ Auto-update trigger on updated_at
- ✅ RLS enabled with service role policy
- ✅ **6 PostgreSQL RPC functions created** (ALL business logic in SQL, zero in JS):
  1. `_rt_to_json(r)` — helper: builds camelCase JSON from a row, joins pharmacy_name + processor name
  2. `create_return_transaction(p_pharmacy_id, p_processor_id, p_service_type, p_notes, p_force_create)` — generates license plate, checks duplicates, inserts
  3. `list_return_transactions(p_pharmacy_id, p_processor_id, p_status, p_date_from, p_date_to, p_search, p_page, p_limit)` — paginated listing with filters
  4. `get_return_transaction_by_id(p_id)` — single row lookup
  5. `update_return_transaction(p_id, p_fedex_tracking, p_fedex_pickup_confirmation, p_notes, p_service_type)` — field updates (blocks finalized)
  6. `change_return_transaction_status(p_id, p_new_status)` — enforces valid transitions: pause/resume/complete/finalize
  7. `delete_return_transaction(p_id)` — blocks deletion of finalized/received/closed returns

**Task 3.2: License plate generation** ✅ DONE (inside `create_return_transaction` RPC)
- ✅ Reads store_number from pharmacy table inside PostgreSQL
- ✅ Falls back to first 4 chars of pharmacy_id if no store_number
- ✅ Format: `MMDDYY-23HA-XXXX`
- ✅ Collision handling: appends `-A`, `-B`, etc.

**Task 3.3: Create return transaction API** ✅ DONE
- ✅ Files:
  - `src/services/returnTransactionService.ts` — **thin RPC callers only** (no `.from()`, no `.select()`, no JS queries)
  - `src/controllers/returnTransactionController.ts` — request parsing + auth checks
  - `src/routes/returnTransactionRoutes.ts` — routes + Swagger docs
- ✅ Route registered in `src/server.ts` at `/api/return-transactions`
- ✅ All 9 endpoints implemented (see API reference below)
- ✅ Auth: Shared `authenticateAny` middleware accepts both processor and admin JWT tokens
- ✅ Processor-scoped: processors see only their own returns; store access enforced in controller

**Task 3.4: Duplicate prevention** ✅ DONE (inside `create_return_transaction` RPC)
- ✅ RPC checks for existing `in_progress` or `paused` return for same pharmacy
- ✅ If found → returns `{ error: true, code: 409, message: "...", existingId, existingLicensePlate }`
- ✅ Override: pass `p_force_create = true` to bypass

---

#### Younas (Admin Frontend) ✅ **COMPLETED**

> **All Module 3 frontend tasks are done.**

##### 📌 Database Migration to Run First

Run this script in Supabase SQL Editor before testing. It creates both the table AND the RPC functions:
```
scripts/fcr_06_create_return_transactions.sql
```
This single file includes: table creation, indexes, trigger, RLS policy, and **6 RPC functions**
(`create_return_transaction`, `list_return_transactions`, `get_return_transaction_by_id`,
`update_return_transaction`, `change_return_transaction_status`, `delete_return_transaction`).

##### 📌 API Endpoints Available

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/return-transactions` | Create new return | Processor or Admin |
| `GET` | `/api/return-transactions` | List returns (paginated, filterable) | Processor or Admin |
| `GET` | `/api/return-transactions/:id` | Get single return | Processor or Admin |
| `PATCH` | `/api/return-transactions/:id` | Update tracking/notes/serviceType | Processor or Admin |
| `POST` | `/api/return-transactions/:id/pause` | Pause an in-progress return | Processor or Admin |
| `POST` | `/api/return-transactions/:id/resume` | Resume a paused return | Processor or Admin |
| `POST` | `/api/return-transactions/:id/complete` | Mark return as completed | Processor or Admin |
| `POST` | `/api/return-transactions/:id/finalize` | Lock return permanently | Processor or Admin |
| `DELETE` | `/api/return-transactions/:id` | Delete (only non-finalized) | Processor or Admin |

##### 📌 Create Return — Request & Response

**Request:**
```json
POST /api/return-transactions
Authorization: Bearer <token>

{
  "pharmacyId": "uuid-of-pharmacy",
  "serviceType": "in_store",         // optional, default "in_store"
  "notes": "First visit notes",      // optional
  "forceCreate": false                // optional, set true to bypass duplicate check
}
```

**Success Response (201):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "licensePlate": "031026-23HA-5544",
    "pharmacyId": "uuid",
    "pharmacyName": "CVS Pharmacy",
    "processorId": "uuid",
    "processorName": "younas",
    "serviceType": "in_store",
    "status": "in_progress",
    "fedexTracking": null,
    "totalItems": 0,
    "totalReturnableValue": 0,
    "totalNonReturnableValue": 0,
    "timeIn": "2026-03-10T...",
    "timeOut": null,
    "notes": null,
    "finalizedAt": null,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Duplicate Error (409):**
```json
{
  "status": "fail",
  "message": "This pharmacy already has an active return (031026-23HA-5544, status: in_progress). Use forceCreate=true to create an additional return, or resume the existing one."
}
```

##### 📌 List Returns — Query Parameters

```
GET /api/return-transactions?pharmacyId=uuid&status=in_progress&search=031026&dateFrom=2026-03-01&dateTo=2026-03-31&page=1&limit=20
```

All query params are optional. Processors automatically see only their own returns.

**Response:**
```json
{
  "status": "success",
  "data": {
    "transactions": [ ...array of return objects... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

##### 📌 Return Lifecycle Status Flow

```
in_progress → paused → in_progress    (pause / resume)
in_progress → completed               (complete)
paused      → completed               (complete)
completed   → finalized               (finalize — permanent lock)
```

##### 📌 Frontend Tasks for Younas

**Task 3.5: Update processor store selection + create return page** ✅ **DONE**

- ✅ **Location:** `admin/app/warehouse/returns/create/page.tsx`
- ✅ **Uses Redux:** `fetchMyStores` thunk from `returnTransactionsSlice` (via `/api/processors/my-stores`)
- ✅ **Store selection:** Cards showing store name, store number, city/state, last visit, service type
- ✅ **Selected store highlight:** Primary border + ring + CheckCircle icon
- ✅ **Options after selection:** Service type dropdown (In-Store / Self-Service / Express), optional notes
- ✅ **Confirmation modal:** Shows store details + service type + notes before creating
- ✅ **API call:** `POST /api/return-transactions` with `{ pharmacyId, serviceType, notes }`
- ✅ **On success:** Toast with license plate, redirects to returns list
- ✅ **On 409 error:** Shows error toast with duplicate message
- ✅ **Access control:** Only visible to `role === 'processor'`

**Task 3.6: Create return transactions list page** ✅ **DONE**

- ✅ **Location:** `admin/app/warehouse/returns/page.tsx`
- ✅ **Table columns:** License Plate (mono font), Store Name, Status (color badge), Items, Value (currency), Date, Actions
- ✅ **Filters:** Search by license plate/store name (debounced), Status dropdown, Date From/To pickers
- ✅ **Pagination:** Page navigation with count display
- ✅ **Row click:** Navigates to `/warehouse/returns/[id]` detail page
- ✅ **Stats cards:** Total Returns, In Progress, Completed, Total Value
- ✅ **Action buttons per row:** View, Edit, Pause/Resume, Complete, Finalize, Delete (conditional on status)
- ✅ **View modal:** Full detail display (license plate, store, processor, values, shipping, notes, timestamps)
- ✅ **Edit modal:** FedEx tracking, pickup confirmation, notes
- ✅ **Status action modals:** Confirmation dialogs for Pause/Resume/Complete/Finalize (finalize shows permanent warning)
- ✅ **Delete modal:** Confirmation with warning
- ✅ **Empty state:** Different messages for no data vs no filter results
- ✅ **Status badge colors:** in_progress (blue), paused (yellow), completed (green), finalized (gray)

**Task 3.7: Create return transaction detail page** ✅ **DONE**

- ✅ **Location:** `admin/app/warehouse/returns/[id]/page.tsx`
- ✅ **Layout:** Back button + license plate header with status badge
- ✅ **4 detail cards:**
  - General Information (license plate, service type, created/updated/finalized dates, notes)
  - Store & Processor (pharmacy name, processor name)
  - Items & Values (total items, returnable/non-returnable/total values)
  - Shipping & Processing (FedEx tracking, pickup confirmation, time in/out, warehouse date, integrity)
- ✅ **Action buttons in header:** Edit, Pause, Resume, Complete, Finalize, Delete (conditional on status)
- ✅ **Edit modal:** FedEx tracking, pickup confirmation, notes
- ✅ **Status action modals:** Confirmation dialogs with finalize warning
- ✅ **Delete modal:** Confirmation then redirect to list
- ✅ **Redux:** Uses `fetchReturnTransactionById`, clears on unmount

**Task 3.8: Add Redux slice for return transactions** ✅ **DONE**

- ✅ **Location:** `admin/lib/store/returnTransactionsSlice.ts`
- ✅ **Registered in:** `admin/lib/store/store.ts` under `returnTransactions` key
- ✅ **Types added:** `ReturnTransaction`, `ReturnTransactionsPagination`, `ReturnTransactionsListResponse`, `ReturnTransactionCreatePayload`, `ReturnTransactionUpdatePayload`, `ProcessorMyStore` in `admin/lib/types/index.ts`
- ✅ **State:** `transactions`, `currentTransaction`, `myStores`, `pagination`, `filters`, `isLoading`, `isStoresLoading`, `isActionLoading`, `error`
- ✅ **Thunks:**
  - `fetchMyStores` — Load processor's assigned stores (`GET /api/processors/my-stores`)
  - `fetchReturnTransactions` — Paginated list with filters (`GET /api/return-transactions`)
  - `fetchReturnTransactionById` — Single detail (`GET /api/return-transactions/:id`)
  - `createReturnTransaction` — Create new return (`POST /api/return-transactions`)
  - `updateReturnTransaction` — Update tracking/notes (`PATCH /api/return-transactions/:id`)
  - `pauseReturnTransaction` — Pause (`POST /api/return-transactions/:id/pause`)
  - `resumeReturnTransaction` — Resume (`POST /api/return-transactions/:id/resume`)
  - `completeReturnTransaction` — Complete (`POST /api/return-transactions/:id/complete`)
  - `finalizeReturnTransaction` — Finalize (`POST /api/return-transactions/:id/finalize`)
  - `deleteReturnTransaction` — Delete (`DELETE /api/return-transactions/:id`)
- ✅ **Reducers:** `setFilters`, `clearError`, `clearCurrentTransaction`

### How to Implement (Guidance for Cursor AI)

**Frontend Status:** ✅ **ALL MODULE 3 FRONTEND TASKS COMPLETED**
- Task 3.5 **COMPLETED**: Create Return page with store selection + confirmation modal
- Task 3.6 **COMPLETED**: Return Transactions list with table, filters, pagination, action modals
- Task 3.7 **COMPLETED**: Return Transaction detail page with 4 info cards + all lifecycle actions
- Task 3.8 **COMPLETED**: Redux slice with all thunks + types + registered in store

**Files Created/Modified:**
- `admin/lib/types/index.ts` — Added `ReturnTransaction`, `ProcessorMyStore`, payload/response types
- `admin/lib/store/returnTransactionsSlice.ts` — Created with 10 thunks + 3 reducers
- `admin/lib/store/store.ts` — Registered `returnTransactions` reducer
- `admin/app/warehouse/returns/create/page.tsx` — Full create flow with Redux
- `admin/app/warehouse/returns/page.tsx` — Full list with table, filters, modals
- `admin/app/warehouse/returns/[id]/page.tsx` — Full detail page with lifecycle actions

---

## Module 4: Product Scanning & Entry

### ✅ **STATUS: Fully Complete — Backend + Admin Frontend**

| Component | Status | Files |
|-----------|--------|-------|
| **Database Schema + RPC Functions** | ✅ Complete | `scripts/fcr_07_create_return_transaction_items.sql` (table + 5 RPC functions) |
| **GS1 Barcode Parser** | ✅ Complete | `src/services/gs1ParserService.ts` |
| **NDC Lookup Pipeline** | ✅ Complete | `src/services/ndcLookupService.ts` — openFDA → RxNav → Azure OpenAI |
| **Items CRUD API** | ✅ Complete | 5 endpoints at `/api/return-transactions/:id/items/*` — all RPC-based |
| **Barcode Scan API** | ✅ Complete | `POST /api/barcode/scan` — parse + lookup in one call |
| **Auth** | ✅ Complete | Works with both processor and admin tokens |
| **Swagger Docs** | ✅ Complete | Available at `/api-docs` under "Return Transaction Items" and "Barcode" tags |
| **Redux Slice (Items)** | ✅ Complete | Extended `returnTransactionsSlice.ts` with 5 items thunks + scan thunk |
| **Adding Products Page** | ✅ Complete | `admin/app/warehouse/returns/[id]/add-items/page.tsx` |
| **Product List Grid** | ✅ Complete | Enhanced `admin/app/warehouse/returns/[id]/page.tsx` with items table + summary |
| **Barcode Scanner** | ✅ Complete | Text input for USB/Bluetooth scanners + manual NDC entry fallback |

> **⚠️ Architecture Note**: Items CRUD uses PostgreSQL RPC functions (zero JS queries).
> Barcode parsing & NDC lookup run in Node.js because they call external APIs (openFDA, RxNav, Azure OpenAI).

### What Client Document Says (Section 4)

> "This is the core capture step."

Preferred workflow:
- Scan bottle QR/2D barcode
- System pulls: NDC, lot number, expiration, serial, possibly price
- User adds only: quantity, partial amount

Fallback workflow:
- Manual NDC entry if no usable QR
- Manual lot/expiration/quantity

### Edge Cases to Handle

- No QR code on bottle
- QR code damaged/unreadable
- QR code parses incorrectly
- NDC scans but policy record missing
- Lot and expiration missing/unreadable
- User scans wrong barcode
- Duplicate item scanned twice
- Same product in multiple bottles/lines
- Bottle is full but user marks partial (or vice versa)

### Developer Tasks

#### Saboor (Backend) ✅ **COMPLETED**

**Task 4.1: Create return_transaction_items table + RPC functions** ✅ DONE
- ✅ File: `scripts/fcr_07_create_return_transaction_items.sql`
- ✅ Table with all columns: ndc, ndc_10, gtin, proprietary_name, generic_name, manufacturer, package_description, dosage_form, strength, route, lot_number, serial_number, expiration_date, standard_price, quantity, full_package_size, is_partial, partial_percentage, estimated_value, return_status, non_returnable_reason, return_reason, destination, dea_schedule, dea_form_222_required, product_type, co_status, bmp_status, memo, wine_cellar_id, scan_source, raw_scan_data
- ✅ Indexes on transaction_id, ndc, ndc_10, gtin, lot_number, return_status, expiration_date
- ✅ Auto-update trigger + RLS
- ✅ **5 PostgreSQL RPC functions** (all CRUD logic in SQL):
  1. `add_return_transaction_item(p_data jsonb)` — validates transaction, checks duplicate NDC+lot, inserts, auto-calculates estimated_value, updates transaction totals
  2. `list_return_transaction_items(p_transaction_id, p_return_status, p_search)` — list + filter + search with summary totals
  3. `get_return_transaction_item(p_item_id)` — single lookup
  4. `update_return_transaction_item(p_item_id, p_updates jsonb)` — partial update, recalculates value + totals
  5. `delete_return_transaction_item(p_item_id)` — delete + update totals

**Task 4.2: Create return transaction items API** ✅ DONE
- ✅ Files:
  - `src/services/returnTransactionItemsService.ts` — **thin RPC callers only**
  - `src/controllers/returnTransactionItemsController.ts` — handlers + scan endpoint
  - `src/routes/returnTransactionItemsRoutes.ts` — routes + Swagger
- ✅ Routes registered in `src/server.ts` at `/api/return-transactions/:id/items`

**Task 4.3: Create GS1 barcode parser service** ✅ DONE
- ✅ File: `src/services/gs1ParserService.ts`
- ✅ Parses GS1 Digital Link URLs (e.g. `https://go.gs1.org/01/GTIN/10/LOT/21/SERIAL?17=EXPIRY`)
- ✅ Parses GS1 element strings (FNC1-delimited, parenthesized AIs)
- ✅ Extracts: GTIN, lot number, serial number, expiration date
- ✅ Converts GTIN-14 → NDC-10 → three NDC-11 candidates
- ✅ GS1 date parsing (YYMMDD → YYYY-MM-DD)

**Task 4.4: Create NDC lookup service** ✅ DONE
- ✅ File: `src/services/ndcLookupService.ts`
- ✅ Multi-source pipeline: openFDA (primary) → RxNav (secondary) → Azure OpenAI (fallback)
- ✅ Tested: correctly identified DOXYCYCLINE HYCLATE 200mg from Solco Healthcare via openFDA
- ✅ `POST /api/barcode/scan` — single endpoint combining parse + lookup

**Barcode scan endpoint** ✅ DONE
- ✅ File: `src/routes/barcodeScanRoutes.ts`
- ✅ `POST /api/barcode/scan` returns `{ scan, product, autoFill }` — ready for frontend form

#### Younas (Admin Frontend) ✅ **COMPLETED**

> **All Module 4 frontend tasks are done.**

##### 📌 Database Migration to Run First

Run this script in Supabase SQL Editor before testing:
```
scripts/fcr_07_create_return_transaction_items.sql
```

##### 📌 API Endpoints Available

**Items CRUD** (nested under return transactions):

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/return-transactions/:id/items` | Add item to return | Processor or Admin |
| `GET` | `/api/return-transactions/:id/items` | List all items (with summary) | Processor or Admin |
| `GET` | `/api/return-transactions/:id/items/:itemId` | Get single item | Processor or Admin |
| `PATCH` | `/api/return-transactions/:id/items/:itemId` | Update item | Processor or Admin |
| `DELETE` | `/api/return-transactions/:id/items/:itemId` | Delete item | Processor or Admin |

**Barcode Scan** (the key integration point):

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/barcode/scan` | Parse GS1 QR + lookup product info | Processor or Admin |

##### 📌 Barcode Scan — Request & Response (THE KEY ENDPOINT)

**Request:**
```json
POST /api/barcode/scan
Authorization: Bearer <token>
{ "scanData": "https://go.gs1.org/01/00343547325060/10/0000054575/21/100000033382?17=251110" }
```

**Response (200) — real tested output:**
```json
{
  "status": "success",
  "data": {
    "scan": {
      "gtin": "00343547325060",
      "lotNumber": "0000054575",
      "serialNumber": "100000033382",
      "expirationDate": "2025-11-10",
      "ndc10": "4354732506",
      "ndcCandidates": ["43547-3250-06", "43547-0325-06", "04354-7325-06"]
    },
    "product": {
      "ndc": "43547-3250-06",
      "proprietaryName": "DOXYCYCLINE HYCLATE",
      "genericName": "DOXYCYCLINE HYCLATE",
      "manufacturer": "Solco Healthcare US LLC",
      "packageDescription": "60 TABLET, DELAYED RELEASE in 1 BOTTLE (43547-325-06)",
      "dosageForm": "TABLET, DELAYED RELEASE",
      "strength": "200 mg/1",
      "route": "ORAL",
      "deaSchedule": null,
      "productType": "HUMAN PRESCRIPTION DRUG",
      "source": "openfda"
    },
    "autoFill": {
      "ndc": "43547-3250-06",
      "ndc10": "4354732506",
      "gtin": "00343547325060",
      "proprietaryName": "DOXYCYCLINE HYCLATE",
      "genericName": "DOXYCYCLINE HYCLATE",
      "manufacturer": "Solco Healthcare US LLC",
      "packageDescription": "60 TABLET, DELAYED RELEASE in 1 BOTTLE (43547-325-06)",
      "dosageForm": "TABLET, DELAYED RELEASE",
      "strength": "200 mg/1",
      "route": "ORAL",
      "lotNumber": "0000054575",
      "serialNumber": "100000033382",
      "expirationDate": "2025-11-10",
      "scanSource": "gs1_qr"
    }
  }
}
```

> **Use the `autoFill` object to populate all form fields at once.**

##### 📌 Add Item — Request & Response

```json
POST /api/return-transactions/{transactionId}/items
Authorization: Bearer <token>
{
  "ndc": "43547-3250-06",
  "ndc10": "4354732506",
  "gtin": "00343547325060",
  "proprietaryName": "DOXYCYCLINE HYCLATE",
  "manufacturer": "Solco Healthcare US LLC",
  "packageDescription": "60 TABLET, DELAYED RELEASE in 1 BOTTLE",
  "dosageForm": "TABLET, DELAYED RELEASE",
  "strength": "200 mg/1",
  "lotNumber": "0000054575",
  "serialNumber": "100000033382",
  "expirationDate": "2025-11-10",
  "standardPrice": 45.99,
  "quantity": 1,
  "fullPackageSize": 60,
  "isPartial": false,
  "returnStatus": "tbd",
  "scanSource": "gs1_qr"
}
```

Response includes `warning` + `duplicateItemId` if same NDC+lot already exists (still saves, just warns).

##### 📌 List Items — Response

```
GET /api/return-transactions/{id}/items?returnStatus=returnable&search=doxy
```

```json
{
  "status": "success",
  "data": {
    "items": [ ...item objects... ],
    "summary": {
      "totalItems": 12,
      "totalReturnableValue": 523.45,
      "totalNonReturnableValue": 89.10,
      "totalValue": 612.55
    }
  }
}
```

##### 📌 Frontend Workflow: Scan → Fill → Save → Next

```
1. User clicks "Add Item" or focuses scan input
2. QR scanner fires → POST /api/barcode/scan { scanData }
3. response.data.autoFill → populate all form fields
4. User reviews, adjusts quantity/price, adds price if missing
5. User clicks "Save & Scan Next" → POST /api/return-transactions/:id/items
6. Form clears → ready for next scan
7. Item appears in grid (GET /api/return-transactions/:id/items)
```

##### 📌 Frontend Tasks for Younas

**Task 4.5: Create "Adding Products Mode" page** ✅ **DONE**

- ✅ **Location:** `admin/app/warehouse/returns/[id]/add-items/page.tsx`
- ✅ **Header:** Pharmacy name, license plate, "Adding Products" label, items added counter badge
- ✅ **Scan/Manual toggle:** Two modes — "Scan Barcode" (auto-focus text input with Enter trigger) and "Manual NDC Entry" (input + lookup button)
- ✅ **Barcode scanning:** On Enter/submit → `POST /api/barcode/scan` → `autoFill` populates all form fields
- ✅ **Product fields (3-column grid):** NDC, Proprietary Name, Generic Name, Manufacturer, Package Description, Dosage Form, Strength, Route, DEA Schedule, Lot Number, Serial Number, Expiration Date
- ✅ **Quantity & Pricing:** Standard Price (editable), Quantity, Full Package Size, Estimated Value (auto-calc = price × qty, adjusted for partial)
- ✅ **Partial toggle:** Checkbox + percentage input when checked
- ✅ **Classification:** Radio buttons — TBD (default) / Returnable / Non-Returnable
- ✅ **Additional:** Return Reason dropdown (9 options), Memo text input
- ✅ **Buttons:** "Save & Scan Next" (POST items + clear form + refocus scan), "Clear Form", "Cancel"
- ✅ **Duplicate warning:** Displays warning from API if same NDC+lot already exists
- ✅ **Scan error handling:** Shows info banner when product not found in database
- ✅ **Redux thunks used:** `fetchReturnTransactionById`, `scanBarcode`, `addTransactionItem`

**Task 4.6: Create product list grid on return detail page** ✅ **DONE**

- ✅ **Location:** `admin/app/warehouse/returns/[id]/page.tsx` (enhanced existing page)
- ✅ **Fetches:** `GET /api/return-transactions/:id/items` with search and status filter
- ✅ **Summary bar:** 4 cards — Total Items, Returnable Value (green), Non-Returnable Value (red), Total Value (blue)
- ✅ **Filters:** Search by NDC/name/manufacturer/lot (debounced), Status dropdown (All/Returnable/Non-Returnable/TBD)
- ✅ **Table columns:** NDC (mono), Name, Manufacturer, QTY (with "P" indicator for partials), Price, Est. Value, Expires, Lot (mono), Status badge
- ✅ **Row actions:** Edit (modal with quantity, price, status, memo), Delete (confirmation modal)
- ✅ **Status badges:** returnable (green), non_returnable (red), tbd (yellow)
- ✅ **Buttons:** "Add Items" → navigates to add-items page, "Start Scanning" when empty
- ✅ **Auto-refresh:** Items re-fetched after edit/delete, transaction totals refreshed

**Task 4.7: Integrate barcode scanner component** ✅ **DONE**

- ✅ **Implementation:** Text input (Option B) that captures USB/Bluetooth scanner output
- ✅ **Auto-focus:** Scan input is auto-focused on page load and after each save
- ✅ **Enter key trigger:** Scanner typically sends Enter after scan; input fires `POST /api/barcode/scan`
- ✅ **Paste support:** Works with pasted GS1 data (copy-paste from phone camera scan apps)
- ✅ **Loading state:** Spinner shown during scan API call
- ✅ **Manual fallback:** "Manual NDC Entry" mode with separate input + "Lookup" button

**Redux Slice Extensions (for Module 4):**

- ✅ **Types added:** `ReturnTransactionItem`, `ReturnTransactionItemsListResponse`, `AddItemPayload`, `BarcodeScanResponse` in `admin/lib/types/index.ts`
- ✅ **State added:** `items`, `itemsSummary`, `isItemsLoading`, `isItemActionLoading`, `isScanLoading`
- ✅ **Thunks added:**
  - `scanBarcode` — `POST /api/barcode/scan`
  - `fetchTransactionItems` — `GET /api/return-transactions/:id/items`
  - `addTransactionItem` — `POST /api/return-transactions/:id/items`
  - `updateTransactionItem` — `PATCH /api/return-transactions/:id/items/:itemId`
  - `deleteTransactionItem` — `DELETE /api/return-transactions/:id/items/:itemId`
- ✅ **Reducer added:** `clearItems`

### How to Implement (Guidance for Cursor AI)

> **All Module 4 tasks are completed. Guidance kept for reference.**

---

## Module 5: Policy Engine

### What Client Document Says (Section 6)

> "This is the most important business-rule step."

The system determines:
- Returnable / Non-returnable / TBD
- Destination (Inmar, Qualanex, PharmaLink)
- Timing rules (6 months prior / 6 months post expiration)
- Whether partials accepted
- Product-specific exceptions

### Edge Cases to Handle

- Policy exists at manufacturer level but not for specific product exception
- Policy says manufacturer accepts returns but certain NDCs do not
- Policy missing entirely
- Timing window logic misunderstood
- Item currently too early but will become eligible later
- Policy and pricing records conflict
- Destination missing even though item is returnable
- Internal policy record outdated
- User knows policy from experience but system disagrees

### Developer Tasks

#### Saboor (Backend)

**Task 5.1: Create manufacturer_policies table** ✅ **DONE**

- Location: `scripts/fcr_08_create_policy_engine_tables.sql`
- SQL migration
- Table: `manufacturer_policies`
  - `id` (UUID, PK)
  - `labeler_id` (VARCHAR 10, UNIQUE) — NDC prefix digits
  - `labeler_type` (ENUM: 'generic', 'brand')
  - `manufacturer_name` (TEXT)
  - `address_1`, `address_2`, `city`, `state`, `zip` (TEXT)
  - `main_contact`, `main_phone`, `fax` (TEXT)
  - `credit_request_email` (TEXT)
  - `contact_2_name`, `contact_2_phone`, `contact_2_email` (TEXT)
  - `average_pay_percent` (DECIMAL) — e.g., 73.2
  - `average_days_to_pay` (INTEGER) — e.g., 297
  - `verified_date` (DATE)
  - `created_at`, `updated_at`

**Task 5.2: Create manufacturer_return_policies table** ✅ **DONE**

- Location: `scripts/fcr_08_create_policy_engine_tables.sql`
- SQL migration
- Table: `manufacturer_return_policies`
  - `id` (UUID, PK)
  - `manufacturer_policy_id` (UUID, FK)
  - `destination` (ENUM: 'inmar', 'qualanex', 'pharmalink')
  - `auto_ra_email` (TEXT)
  - `policy_number` (INTEGER)
  - `policy_description` (TEXT) — e.g., "6 Months Prior to 12 Months Post"
  - `months_before_expiration` (INTEGER) — e.g., 6
  - `months_after_expiration` (INTEGER) — e.g., 6 or 12
  - `discount_rate` (DECIMAL) — e.g., 0.5 = 50%
  - `partials_accepted` (BOOLEAN)
  - `partial_dosage_forms` (TEXT[]) — e.g., ['tablets', 'capsules']
  - `reimbursement_type` (ENUM: 'batch', 'per_item')
  - `created_at`, `updated_at`

**Task 5.3: Create non_returnable_products table** ✅ **DONE**

- Location: `scripts/fcr_08_create_policy_engine_tables.sql`
- SQL migration
- Table: `non_returnable_products`
  - `id` (UUID, PK)
  - `manufacturer_policy_id` (UUID, FK)
  - `ndc` (VARCHAR 13)
  - `product_name` (TEXT)
  - `reason` (TEXT)
  - `created_at`

**Task 5.4: Create manufacturer_policy_notes table** ✅ **DONE**

- Location: `scripts/fcr_08_create_policy_engine_tables.sql`
- SQL migration
- Table: `manufacturer_policy_notes`
  - `id` (UUID, PK)
  - `manufacturer_policy_id` (UUID, FK)
  - `note_date` (DATE)
  - `author_initials` (VARCHAR 5)
  - `note_text` (TEXT)
  - `created_at`

**Task 5.5: Create policy engine service** ✅ **DONE**

- Location: `src/services/policyEngineService.ts`
- Function: `checkReturnability(ndc, expirationDate, isPartial, dosageForm)`
  - Step 1: Extract labeler_id from NDC (first 5 digits)
  - Step 2: Lookup manufacturer_policies by labeler_id
  - Step 3: If no policy found → return { status: 'tbd', reason: 'no_policy' }
  - Step 4: Check non_returnable_products for this specific NDC
    - If found → return { status: 'non_returnable', reason: 'policy_exception' }
  - Step 5: Get return policy (manufacturer_return_policies)
  - Step 6: Calculate return window:
    - window_start = expiration - months_before_expiration
    - window_end = expiration + months_after_expiration
  - Step 7: Check if today is within window:
    - If before window_start → return { status: 'non_returnable', reason: 'too_early', expected_returnable_date: window_start }
    - If after window_end → return { status: 'non_returnable', reason: 'too_late' }
    - If within window → continue
  - Step 8: If partial, check partials_accepted:
    - If not accepted → return { status: 'non_returnable', reason: 'no_partials' }
    - If accepted, check dosage form against partial_dosage_forms
  - Step 9: Return { status: 'returnable', destination, discount_rate }

**Task 5.6: Create policies API** ✅ **DONE**

- Location: Created files:
  - `src/services/policiesService.ts` ✅
  - `src/controllers/policiesController.ts` ✅
  - `src/routes/policiesRoutes.ts` ✅
  - Routes registered in `src/server.ts` ✅
  - Frontend guide: `MODULE_5_FRONTEND_GUIDE.md` ✅
  - Seed data: `scripts/fcr_09_seed_policy_engine_data.sql` ✅
- Endpoints:
  - `GET /api/admin/policies` — List all manufacturer policies (paginated, searchable)
  - `POST /api/admin/policies` — Create policy
  - `GET /api/admin/policies/:id` — Get policy with return policies and exceptions
  - `PATCH /api/admin/policies/:id` — Update policy
  - `DELETE /api/admin/policies/:id` — Delete policy
  - `POST /api/admin/policies/bulk-import` — Import from CSV/spreadsheet
  - `POST /api/policies/check` — Check returnability for an NDC (used by adding products)
    - Input: ndc, expiration_date, is_partial, dosage_form
    - Output: status, reason, destination, expected_returnable_date (if applicable)
  - `GET /api/admin/policies/:id/exceptions` — Get non-returnable products
  - `POST /api/admin/policies/:id/exceptions` — Add exception
  - `GET /api/admin/policies/:id/notes` — Get policy notes
  - `POST /api/admin/policies/:id/notes` — Add note

#### Younas (Admin Frontend)

**Task 5.7: Create policies management page**

- Location: `admin/app/policies/page.tsx`
- UI:
  - Table: Labeler ID, Manufacturer Name, Type, Destination, Partials, Avg Pay %, Avg Days
  - Search by manufacturer name or labeler ID
  - Filter by destination, type
  - Click row → detail page
  - "Add Policy" button → modal form

**Task 5.8: Create policy detail page**

- Location: `admin/app/policies/[id]/page.tsx`
- UI sections:
  1. **Basic info**: Labeler ID, Name, Type, Contact info
  2. **Return policies**: Table of return policy records (destination, window, partials, rate)
  3. **Exceptions**: Table of non-returnable products (NDC, name, reason)
  4. **Notes**: Chronological list of dated notes
  5. **Metrics**: Avg pay percent, Avg days to pay
- Edit buttons for each section

**Task 5.9: Add Redux slice for policies**

- Location: `admin/lib/store/policiesSlice.ts`
- State: list, currentPolicy, pagination, filters, isLoading, error
- Thunks: fetchPolicies, createPolicy, updatePolicy, checkReturnability, etc.

### How to Implement (Guidance for Cursor AI)

When working on Task 5.5 (policy engine):
```
Prompt: "Create a policy engine service at src/services/policyEngineService.ts with a function checkReturnability(ndc, expirationDate, isPartial, dosageForm) that:
1. Extracts labeler_id from NDC (first 5 digits)
2. Looks up manufacturer_policies by labeler_id
3. Returns TBD if no policy found
4. Checks non_returnable_products for specific NDC exceptions
5. Calculates return window based on months_before and months_after expiration
6. Checks if current date is within window
7. Checks partial acceptance rules
8. Returns { status, reason, destination, expected_returnable_date }
Use Supabase for database queries."
```

---

## Module 6: Item Routing & Disposition

### What Client Document Says (Section 7)

Based on policy engine result, route item to:
- **7A. Returnable now** — stays in current return, included on manifest
- **7B. Non-returnable (permanent)** — destruction workflow
- **7C. Non-returnable (timing)** — Wine Cellar for future
- **7D. TBD** — research/exception queue

### Edge Cases to Handle

- Item mistakenly destroyed though should have been aged
- Item aged but never resurfaced later
- TBD never resolved and sits forever
- Product becomes eligible but isn't added to next return
- Wrong store name on baggie
- Missing barcode/bag manifest for wine cellar item
- Same store has multiple future-month wine cellar bags
- Item has no destination before closeout

### Developer Tasks

#### Saboor (Backend)

**Task 6.1: Implement routing in add item endpoint**

- Location: `src/services/returnTransactionService.ts`
- When adding item:
  1. Call policy engine
  2. Based on result:
     - If returnable → set return_status = 'returnable', assign destination
     - If non_returnable (permanent) → set return_status = 'non_returnable', reason = 'policy'
     - If non_returnable (timing) → set return_status = 'non_returnable', reason = 'date', calculate expected_returnable_date
     - If TBD → set return_status = 'tbd'
  3. Save item with classification

**Task 6.2: Create TBD resolution endpoint**

- Location: Extend return transaction items API
- Endpoint: `PATCH /api/return-transactions/:id/items/:itemId/resolve`
  - Input: new_status ('returnable' or 'non_returnable'), reason, destination
  - Used when staff manually researches and resolves TBD items

**Task 6.3: Create destruction_records table**

- Location: SQL migration
- Table: `destruction_records`
  - `id` (UUID, PK)
  - `pharmacy_id` (UUID, FK)
  - `transaction_item_id` (UUID, FK)
  - `ndc` (VARCHAR 13)
  - `product_name` (TEXT)
  - `quantity` (INTEGER)
  - `weight_lbs` (DECIMAL)
  - `destruction_reason` (TEXT)
  - `federal_form_number` (TEXT)
  - `destruction_company` (TEXT)
  - `picked_up_at` (TIMESTAMP)
  - `form_url` (TEXT)
  - `created_at`

**Task 6.4: Create destruction API**

- Location: Create new files for destruction management
- Endpoints:
  - `GET /api/admin/destruction` — List destruction records
  - `POST /api/admin/destruction` — Create record (when item marked for destruction)
  - `PATCH /api/admin/destruction/:id` — Update (pickup date, form number)
  - `GET /api/admin/destruction/pending` — Items awaiting destruction

#### Younas (Admin Frontend)

**Task 6.5: Show routing result in Adding Products Mode**

- Location: `admin/app/warehouse/returns/[id]/add-items/page.tsx`
- After scan/save:
  - Show classification result prominently
  - If non-returnable (timing): Show "This product will become returnable in [MONTH]"
  - If TBD: Show "Policy not found. Needs manual research."
  - Color coding: Green (returnable), Red (non-returnable), Yellow (TBD)

**Task 6.6: Create TBD items view**

- Location: `admin/app/warehouse/tbd-items/page.tsx`
- UI:
  - List all items with return_status = 'tbd'
  - Group by pharmacy/transaction
  - "Resolve" button → modal to set status and destination
  - Filter by date, pharmacy

---

## Module 7: Wine Cellar System

### What Client Document Says (Section 7C)

> "Goes to 'wine cellar' aging inventory. Bagged by store. Labeled so it can be found later. Should be queued for future month when it becomes eligible."

### Edge Cases to Handle

- Item aged but never resurfaced
- Same store has multiple future-month bags
- Missing barcode/manifest for wine cellar item

### Developer Tasks

#### Saboor (Backend)

**Task 7.1: Create wine_cellar table**

- Location: SQL migration
- Table: `wine_cellar`
  - `id` (UUID, PK)
  - `pharmacy_id` (UUID, FK)
  - `transaction_item_id` (UUID, FK, nullable)
  - `ndc` (VARCHAR 13)
  - `product_name` (TEXT)
  - `manufacturer` (TEXT)
  - `lot_number` (TEXT)
  - `serial_number` (TEXT)
  - `expiration_date` (DATE)
  - `quantity` (INTEGER)
  - `standard_price` (DECIMAL)
  - `date_shelved` (TIMESTAMP)
  - `expected_returnable_date` (DATE)
  - `physical_location` (TEXT) — box label/shelf
  - `baggie_barcode` (TEXT)
  - `status` (ENUM: 'shelved', 'ready_to_return', 'returned', 'destroyed')
  - `returned_in_transaction_id` (UUID, FK, nullable)
  - `returned_at` (TIMESTAMP)
  - `created_at`, `updated_at`

**Task 7.2: Create wine cellar service**

- Location: `src/services/wineCellarService.ts`
- Functions:
  - `addToWineCellar(itemData)` — create wine cellar record
  - `getWineCellarItems(filters)` — list items with filters
  - `getDueItems(month)` — get items due for return this month
  - `markAsReturned(id, transactionId)` — update status when added to return
  - `checkAndSurfaceReadyItems()` — cron job function to find newly returnable items

**Task 7.3: Create wine cellar API**

- Location: Create new files
- Endpoints:
  - `GET /api/admin/wine-cellar` — List all items (filterable)
  - `POST /api/admin/wine-cellar` — Add item manually
  - `GET /api/admin/wine-cellar/due` — Get items due this month
  - `POST /api/admin/wine-cellar/:id/return` — Mark item as ready to return
  - `POST /api/admin/wine-cellar/check-ready` — Trigger readiness check

**Task 7.4: Create wine cellar cron job**

- Location: `src/scripts/` or integrate with existing cron
- Monthly job (1st of month):
  - Query wine_cellar where expected_returnable_date <= current month
  - Update status to 'ready_to_return'
  - Create notification for warehouse staff
  - Log items surfaced

#### Younas (Admin Frontend)

**Task 7.5: Create wine cellar page**

- Location: `admin/app/warehouse/wine-cellar/page.tsx`
- UI:
  - Table: NDC, Product, Pharmacy, Shelved Date, Expected Return Date, Status, Location
  - Filters: Status, Pharmacy, Expected month
  - "Due This Month" quick filter
  - "Add to Return" button for ready items
  - Bulk select and add to return

**Task 7.6: Wine cellar integration in return creation**

- Location: `admin/app/warehouse/returns/[id]/page.tsx`
- Add button: "Add Wine Cellar Items"
- Modal: Shows wine cellar items for this pharmacy that are ready
- Select items → add to current return

---

## Module 8: Return Finalization & Shipping

### What Client Document Says (Section 10)

> "Once all items are entered: Shipping info added, carrier tracking entered, pickup confirmation recorded, reports and manifest printed, return finalized."

### Edge Cases to Handle

- Return finalized too early
- Manifest not printed
- Shipping info entered incorrectly
- Carrier tracking missing
- Pickup not actually scheduled
- Store forgot to include paperwork in shipment
- Box count entered incorrectly

### Developer Tasks

#### Saboor (Backend)

**Task 8.1: Create finalization endpoint**

- Location: `src/services/returnTransactionService.ts`
- Endpoint: `POST /api/return-transactions/:id/finalize`
- Logic:
  1. Validate all items have destination (no TBD remaining)
  2. Validate FedEx tracking entered
  3. Set status = 'finalized'
  4. Set finalized_at = now
  5. Lock record (no more edits allowed)
  6. Generate manifest data
- Return: confirmation + manifest data

**Task 8.2: Create manifest generation endpoint**

- Location: `src/services/manifestService.ts`
- Endpoint: `GET /api/return-transactions/:id/manifest`
- Generate PDF with:
  - Store info (name, address, DEA)
  - License plate
  - Returnable items list (NDC, name, qty, price, value)
  - Non-returnable items list
  - Totals
  - Barcode for scanning
- Use PDF generation library (pdfkit, puppeteer, or similar)

**Task 8.3: Create DEA Form 222 generation**

- Location: `src/services/deaFormService.ts`
- Endpoint: `GET /api/return-transactions/:id/dea-form-222`
- Generate DEA Form 222 for Schedule II controlled substances
- Only include items with dea_form_222_required = true

#### Younas (Admin Frontend)

**Task 8.4: Create "Complete Return" flow**

- Location: `admin/app/warehouse/returns/[id]/page.tsx`
- UI flow:
  1. "Complete Return" button (disabled if TBD items exist)
  2. Shows summary: X returnable items ($Y value), Z non-returnable
  3. FedEx tracking input field
  4. Pickup confirmation input (optional)
  5. "Print Manifest" button → opens PDF
  6. "Print DEA Form 222" button (if CII items exist)
  7. Confirmation checkboxes:
     - ☐ Manifest printed and included
     - ☐ DEA Form 222 printed (if applicable)
     - ☐ All items verified
  8. "Finalize Return" button
  9. Warning dialog: "You will no longer be able to edit this return. Proceed?"
  10. On confirm: Call finalize API

**Task 8.5: Create manifest preview/print**

- Location: Component for PDF preview
- Options: View in browser, Download PDF, Print directly

---

## Module 9: Warehouse Receiving

### What Client Document Says (Section 12)

> "Warehouse checks in the return: Scan tracking number, confirm return found, set received date, associate with month/batch, open and verify contents, review return integrity, confirm all items have destinations."

### Edge Cases to Handle

- Tracking number not found
- Received date incorrect
- Contents do not match manifest
- Broken or leaking bottle
- Missing bottle(s)
- Unmanifested items in box
- Manifest says one store, contents are another
- Items cannot be closed out because destination missing

### Developer Tasks

#### Saboor (Backend)

**Task 9.1: Create receiving endpoint**

- Location: `src/services/warehouseService.ts`
- Endpoint: `POST /api/admin/warehouse/receive`
- Input: fedex_tracking
- Logic:
  1. Find return_transaction by fedex_tracking
  2. If not found → return error
  3. Set received_in_warehouse_date = now
  4. Set status = 'received'
  5. Return transaction details for verification

**Task 9.2: Create verification endpoints**

- Location: `src/services/warehouseService.ts`
- Endpoints:
  - `GET /api/admin/warehouse/pending` — Returns awaiting check-in
  - `GET /api/admin/warehouse/received` — Returns received, awaiting verification
  - `POST /api/admin/warehouse/:id/verify` — Mark return as verified
    - Input: pieces_count, verified_integrity, notes
  - `PATCH /api/admin/warehouse/:id/items/:itemId/verify` — Verify individual item
    - Input: verified (boolean), actual_quantity, condition_notes

**Task 9.3: Create discrepancy handling**

- Location: Extend warehouse service
- Endpoint: `POST /api/admin/warehouse/:id/discrepancy`
- Input: type ('missing', 'extra', 'damaged'), item_details, notes
- Creates discrepancy record for resolution

#### Younas (Admin Frontend)

**Task 9.4: Create receiving page**

- Location: `admin/app/warehouse/receiving/page.tsx`
- UI:
  - Large text input: "Scan FedEx Tracking Number"
  - Auto-submit on scan (detect barcode pattern)
  - On success: Show return details (pharmacy, license plate, items count)
  - Confirmation: "This Return Has Been Received. Ready for verification?"
  - "Receive Another" button for batch receiving

**Task 9.5: Create verification page**

- Location: `admin/app/warehouse/receiving/[id]/page.tsx`
- UI:
  - Return header: Pharmacy, License plate, Received date
  - Checklist:
    - ☐ Pieces count matches: [input] / [expected]
    - ☐ Checked in
    - ☐ Verified
    - ☐ Integrity confirmed
  - Items grid with verification checkboxes per item
  - "Report Discrepancy" button
  - "Complete Verification" button

---

## Module 10: Monthly Batch & Close-Out

### What Client Document Says (Sections 13-14)

> "At warehouse closeout, returns are grouped into monthly batches. Generate Cardinal invoice/upload file. Generate pharmacy-level debit memos."

### Edge Cases to Handle

- Item assigned to wrong month
- Wrong lettering/location code
- Batch created twice
- Pharmacy ends up in wrong debit memo group
- Location coding too weak to find baggie later
- Cross-month items from wine cellar incorrectly batched
- Closeout run before all destinations assigned
- Missing baggie manifest
- TBD items still unresolved
- Cardinal upload format mismatch
- Store omitted from closeout
- Same store split incorrectly across memos
- User clicks complete closeout prematurely

### Developer Tasks

#### Saboor (Backend)

**Task 10.1: Create return_batches table**

- Location: SQL migration
- Table: `return_batches`
  - `id` (UUID, PK)
  - `batch_month` (DATE) — first of month
  - `batch_name` (TEXT) — e.g., "March 2026"
  - `status` (ENUM: 'open', 'closed', 'submitted')
  - `total_returns` (INTEGER)
  - `total_debit_memos` (INTEGER)
  - `total_value` (DECIMAL)
  - `cardinal_file_generated` (BOOLEAN)
  - `cardinal_file_url` (TEXT)
  - `cardinal_submitted_at` (TIMESTAMP)
  - `cardinal_approved_at` (TIMESTAMP)
  - `closed_at` (TIMESTAMP)
  - `created_at`, `updated_at`

**Task 10.2: Create debit_memos table**

- Location: SQL migration
- Table: `debit_memos`
  - `id` (UUID, PK)
  - `batch_id` (UUID, FK)
  - `pharmacy_id` (UUID, FK)
  - `memo_number` (VARCHAR 30, UNIQUE) — e.g., "DEL-0326-DCC-XXXX"
  - `destination` (ENUM)
  - `labeler_id` (VARCHAR 10)
  - `labeler_name` (TEXT)
  - `total_items` (INTEGER)
  - `total_ask_value` (DECIMAL)
  - `total_received_value` (DECIMAL)
  - `ra_number` (TEXT)
  - `ra_requested_at` (TIMESTAMP)
  - `ra_received_at` (TIMESTAMP)
  - `tickler_date` (DATE)
  - `baggie_manifest` (TEXT)
  - `outbound_tracking` (TEXT)
  - `shipped_at` (TIMESTAMP)
  - `payment_status` (ENUM: 'pending', 'partial', 'paid', 'disputed')
  - `amount_requested` (DECIMAL)
  - `amount_received` (DECIMAL)
  - `created_at`, `updated_at`

**Task 10.3: Create debit_memo_items table**

- Location: SQL migration
- Table: `debit_memo_items`
  - `id` (UUID, PK)
  - `debit_memo_id` (UUID, FK)
  - `transaction_item_id` (UUID, FK)
  - `ndc` (VARCHAR 13)
  - `product_name` (TEXT)
  - `quantity` (INTEGER)
  - `ask_price` (DECIMAL)
  - `received_price` (DECIMAL)
  - `lot_number` (TEXT)
  - `expiration_date` (DATE)
  - `created_at`

**Task 10.4: Create batch management service**

- Location: `src/services/batchService.ts`
- Functions:
  - `createBatch(month)` — create new monthly batch
  - `assignToBatch(transactionId, batchId)` — assign return to batch
  - `closeBatch(batchId)` — close batch, generate debit memos
  - `generateDebitMemos(batchId)` — create debit memo records
  - `generateCardinalFile(batchId)` — generate CSV/Excel for Cardinal

**Task 10.5: Create batch/close-out API**

- Location: Create new files
- Endpoints:
  - `GET /api/admin/batches` — List all batches
  - `POST /api/admin/batches` — Create new batch
  - `GET /api/admin/batches/:id` — Get batch with debit memos
  - `POST /api/admin/batches/:id/assign` — Assign returns to batch
  - `POST /api/admin/batches/:id/close` — Close batch (generate debit memos)
  - `GET /api/admin/batches/:id/cardinal-file` — Download Cardinal file
  - `POST /api/admin/batches/:id/submit-cardinal` — Mark as submitted

**Task 10.6: Create debit memo API**

- Location: Create new files
- Endpoints:
  - `GET /api/admin/debit-memos` — List all debit memos
  - `GET /api/admin/debit-memos/:id` — Get debit memo with items
  - `PATCH /api/admin/debit-memos/:id` — Update (RA number, payment info)

#### Younas (Admin Frontend)

**Task 10.7: Create batches page**

- Location: `admin/app/warehouse/batches/page.tsx`
- UI:
  - Table: Batch Month, Status, Returns, Debit Memos, Total Value, Cardinal Status
  - "Create New Batch" button
  - Click row → batch detail page

**Task 10.8: Create batch detail page**

- Location: `admin/app/warehouse/batches/[id]/page.tsx`
- UI:
  - Batch info header
  - Returns in batch (table)
  - Debit memos generated (table)
  - Actions:
    - "Close Batch" (generates debit memos)
    - "Generate Cardinal File"
    - "Mark Cardinal Submitted"

**Task 10.9: Create debit memos page**

- Location: `admin/app/warehouse/debit-memos/page.tsx`
- UI:
  - Table: Memo #, Pharmacy, Destination, Items, Ask Value, RA Status, Payment Status
  - Filters: Batch, Destination, RA status, Payment status
  - Click row → detail page

---

## Module 11: RA Request & Tracking

### What Client Document Says (Sections 15-17)

> "Debit memos are sent one-by-one to destination processors. Destinations may include Inmar, PharmaLink, Collex/Colonyx-type routes. Often email-driven."

### Edge Cases to Handle

- Wrong destination chosen
- Email not sent
- Email sent to wrong address
- Duplicate RA request
- Attachment missing
- RA turnaround very slow
- One destination responds same day, another takes weeks
- Staff has no queue view of outstanding RA requests
- Reply email not parsed
- RA arrives without matching debit memo reference
- PDF missing
- RA keyed to wrong pharmacy
- Staff cannot find the right baggie
- Multiple baggies with similar identifiers
- RA received but not recorded
- RA received after product already staged incorrectly

### Developer Tasks

#### Saboor (Backend)

**Task 11.1: Create RA request service**

- Location: `src/services/raRequestService.ts`
- Functions:
  - `sendRARequest(debitMemoId)` — send email to destination
  - `generateRARequestEmail(debitMemo)` — create email content
  - `recordRAReceived(debitMemoId, raNumber, pdfUrl)` — record RA response
  - `getOutstandingRARequests()` — get pending RAs
  - `sendRAReminder(debitMemoId)` — resend request

**Task 11.2: Create RA tracking API**

- Location: Create new files
- Endpoints:
  - `POST /api/admin/debit-memos/:id/request-ra` — Send RA request email
  - `POST /api/admin/debit-memos/:id/receive-ra` — Record RA received
    - Input: ra_number, pdf_url
  - `POST /api/admin/debit-memos/:id/resend-ra` — Resend RA request
  - `GET /api/admin/ra-tracking` — Dashboard of all RA statuses
  - `GET /api/admin/ra-tracking/outstanding` — Pending RAs
  - `GET /api/admin/ra-tracking/overdue` — RAs past tickler date

**Task 11.3: Create email templates**

- Location: `src/templates/` or email service
- Templates:
  - RA request email (per destination format)
  - RA reminder email
  - Include: debit memo number, pharmacy info, item list, contact info

**Task 11.4: Create outbound shipment tracking**

- Location: Extend debit memo service
- Endpoints:
  - `POST /api/admin/debit-memos/:id/ship` — Record shipment to destination
    - Input: fedex_tracking, ship_date
  - `GET /api/admin/shipments/outbound` — List outbound shipments

#### Younas (Admin Frontend)

**Task 11.5: Create RA tracking page**

- Location: `admin/app/warehouse/ra-tracking/page.tsx`
- UI:
  - Summary cards: Pending, Received, Shipped, Overdue
  - Table: Debit Memo, Pharmacy, Destination, Requested Date, Tickler Date, RA Number, Status
  - Filters: Status, Destination, Date range
  - Row actions: Request RA, Record RA, Resend, Ship

**Task 11.6: Create RA request modal**

- Location: Component for RA actions
- UI:
  - Show debit memo details
  - Destination email (pre-filled from policy)
  - "Send RA Request" button
  - Confirmation of email sent

**Task 11.7: Create RA receive modal**

- Location: Component
- UI:
  - RA Number input
  - PDF upload (optional)
  - "Record RA Received" button

---

## Module 12: Manufacturer Payment Tracking

### What Client Document Says (Section 18)

> "Processor/manufacturer handles review. Credits eventually flow back. Actual paid amount is often lower than original ask."

### Edge Cases to Handle

- Manufacturer underpays
- Credit delayed
- No payment received
- Payment comes without clear remittance detail
- Cannot tie payment back to NDC, memo, or manufacturer
- Ask-vs-received analytics missing
- Third-party estimates differ materially from actual realized credits

### Developer Tasks

#### Saboor (Backend)

**Task 12.1: Create payment tracking fields**

- Already in debit_memos table:
  - `amount_requested`, `amount_received`, `payment_status`
- Add: `payment_received_at`, `payment_reference`, `payment_notes`

**Task 12.2: Create unpaid tracking API**

- Location: Extend debit memo service
- Endpoints:
  - `GET /api/admin/debit-memos/unpaid` — List unpaid debit memos
  - `POST /api/admin/debit-memos/:id/record-payment` — Record payment received
    - Input: amount_received, payment_date, reference
  - `POST /api/admin/debit-memos/:id/send-reminder` — Send payment reminder email
  - `GET /api/admin/analytics/ask-vs-received` — Ask vs received analytics
    - Group by manufacturer, time period

**Task 12.3: Create manufacturer payment summary**

- Location: Extend analytics service
- Endpoint: `GET /api/admin/analytics/manufacturer-payments`
- Return per manufacturer:
  - Total unpaid debit memos
  - Outstanding amount
  - Paid amount
  - Average pay percent
  - Average days to pay

#### Younas (Admin Frontend)

**Task 12.4: Create unpaid debit memos page**

- Location: `admin/app/warehouse/unpaid/page.tsx`
- UI:
  - Summary: Total outstanding, # of unpaid memos
  - Table: Debit Memo, Manufacturer, Pharmacy, Amount Requested, Days Outstanding
  - Group by manufacturer option
  - "Send Reminder" button
  - "Record Payment" button

**Task 12.5: Create payment recording modal**

- Location: Component
- UI:
  - Amount received input
  - Payment date
  - Reference number
  - Notes
  - "Record Payment" button

---

## Module 13: Pharmacy & GPO Payout

### What Client Document Says (Section 20)

> "Determine pharmacy payout. Determine company retained fee. Determine GPO share if applicable. Payment may be by check, wire, Zelle, or cash."

### Edge Cases to Handle

- Pharmacy paid before recovery is actually collected
- Wrong payout split between pharmacy and GPO
- GPO white-label logic overrides pharmacy logic
- Manual payment method causes reconciliation issues
- No record of payment status
- Need separate payout schedules by customer type
- Store disputes estimate vs actual paid amount

### Developer Tasks

#### Saboor (Backend)

**Task 13.1: Create pharmacy_payments table**

- Location: SQL migration
- Table: `pharmacy_payments`
  - `id` (UUID, PK)
  - `pharmacy_id` (UUID, FK)
  - `batch_id` (UUID, FK)
  - `total_credit_received` (DECIMAL)
  - `company_fee` (DECIMAL)
  - `company_fee_percent` (DECIMAL)
  - `gpo_share` (DECIMAL)
  - `pharmacy_payout` (DECIMAL)
  - `payment_method` (ENUM: 'wire', 'check', 'zelle', 'cash')
  - `payment_reference` (TEXT)
  - `paid_at` (TIMESTAMP)
  - `status` (ENUM: 'pending', 'processing', 'paid', 'failed')
  - `notes` (TEXT)
  - `created_at`

**Task 13.2: Create pharmacy payment service**

- Location: `src/services/pharmacyPaymentService.ts`
- Functions:
  - `calculatePayout(pharmacyId, batchId)` — calculate amounts
  - `createPaymentRecord(data)` — create payment record
  - `recordPayment(paymentId, method, reference)` — mark as paid
  - `getPaymentHistory(pharmacyId)` — pharmacy's payment history
  - `generatePaymentStatement(paymentId)` — PDF statement

**Task 13.3: Create pharmacy payment API**

- Location: Create new files
- Endpoints:
  - `GET /api/admin/pharmacy-payments` — List all payments
  - `POST /api/admin/pharmacy-payments` — Create payment record
  - `GET /api/admin/pharmacy-payments/:id` — Get payment details
  - `PATCH /api/admin/pharmacy-payments/:id` — Update payment
  - `GET /api/admin/pharmacy-payments/summary` — Summary by pharmacy
  - `GET /api/pharmacy-payments/my-payments` — Pharmacy's own payments (for frontend)

#### Younas (Pharmacy Frontend)

**Task 13.4: Create credit statement page**

- Location: `Frontend/app/(dashboard)/credits/statement/page.tsx`
- UI:
  - Payment history table
  - Per payment: Date, Batch, Credit Received, Fee, Payout, Method, Status
  - Download statement button
  - Filter by date range

**Task 13.5: Wire up existing credits page**

- Location: `Frontend/app/(dashboard)/credits/page.tsx`
- Currently uses mock data
- Connect to `/api/pharmacy-payments/my-payments`
- Show: Total credits, Pending payouts, Payment history

---

## Module 14: Reporting & Analytics

### What Client Document Says (Section 21)

> "The future system should support: estimated vs actual value, ask vs received, by manufacturer, ideally by NDC, by pharmacy, by GPO, aging inventory visibility, outstanding RA visibility, unpaid memo visibility, price source audit trail."

### Developer Tasks

#### Saboor (Backend)

**Task 14.1: Create analytics endpoints**

- Location: Extend `src/services/adminAnalyticsService.ts`
- Endpoints:
  - `GET /api/admin/analytics/returns-summary` — Returns by period, status
  - `GET /api/admin/analytics/ask-vs-received` — By manufacturer, NDC
  - `GET /api/admin/analytics/aging-inventory` — Wine cellar aging report
  - `GET /api/admin/analytics/outstanding-ra` — RA aging report
  - `GET /api/admin/analytics/unpaid-memos` — Unpaid memo aging
  - `GET /api/admin/analytics/price-audit` — Price source audit trail
  - `GET /api/admin/analytics/pharmacy-performance` — By pharmacy
  - `GET /api/admin/analytics/gpo-summary` — By GPO

**Task 14.2: Create ndc_price_history table**

- Location: SQL migration
- Table: `ndc_price_history`
  - `id` (UUID, PK)
  - `ndc` (VARCHAR 13)
  - `old_price` (DECIMAL)
  - `new_price` (DECIMAL)
  - `price_source` (TEXT)
  - `changed_by` (UUID)
  - `changed_at` (TIMESTAMP)

#### Younas (Admin Frontend)

**Task 14.3: Extend analytics page**

- Location: `admin/app/analytics/page.tsx`
- Add new charts/tables:
  - Ask vs Received by manufacturer (bar chart)
  - Returns value trend (line chart)
  - Top manufacturers by volume
  - Outstanding RA aging (pie chart)
  - Unpaid memo aging

#### Younas (Pharmacy Frontend)

**Task 14.4: Wire up pharmacy analytics page**

- Location: `Frontend/app/(dashboard)/analytics/page.tsx`
- Currently uses mock data
- Connect to pharmacy-specific analytics endpoints
- Show: Returns history, Credits received, Estimated vs actual

---

## Edge Cases Reference

### From Client Document — Cross-Cutting Edge Cases

**A. Missing or incomplete data**
- Missing NDC, lot, expiration, price, destination, policy, RA, wholesaler account number

**B. Workflow exceptions**
- Duplicate returns
- Partially completed returns
- Items left in TBD forever
- Items stuck in wine cellar
- Closeout before all items ready
- Shipping before RA received
- Wrong physical paperwork with wrong baggie

**C. Physical-to-digital mismatches**
- Baggie says one thing, system says another
- Scanned inventory not in box
- Box contents exceed manifest
- Paper lost, barcode still exists
- RA received but physical product cannot be found

**D. Policy complexity**
- Manufacturer-level rule plus product-level exceptions
- Partials accepted for some items only
- Timing windows vary by manufacturer
- Destination varies by manufacturer/policy
- Policy records change over time

**E. Scaling pain points**
- One-by-one debit memo emails
- One-by-one RA responses
- Manual printing and stuffing paperwork into baggies
- Manual indexing of boxes by letter codes
- Manual payout execution
- Too much dependence on tribal knowledge

### How to Handle in Code

For each edge case:
1. Add validation in API endpoints
2. Show clear error messages in UI
3. Create exception/discrepancy records when needed
4. Add audit logging for important actions
5. Create admin views to see and resolve exceptions

---

## Database Tables Summary

### New Tables to Create (15 total)

| Table | Owner | Priority |
|-------|-------|----------|
| `processors` | Saboor | Week 1 |
| `processor_store_assignments` | Saboor | Week 1 |
| `manufacturer_policies` | Saboor | Week 1 |
| `manufacturer_return_policies` | Saboor | Week 1 |
| `manufacturer_policy_notes` | Saboor | Week 1 |
| `non_returnable_products` | Saboor | Week 1 |
| `return_transactions` | Saboor | Week 2 |
| `return_transaction_items` | Saboor | Week 2 |
| `wine_cellar` | Saboor | Week 3 |
| `return_batches` | Saboor | Week 4 |
| `debit_memos` | Saboor | Week 4 |
| `debit_memo_items` | Saboor | Week 4 |
| `pharmacy_payments` | Saboor | Week 5 |
| `destruction_records` | Saboor | Week 5 |
| `ndc_price_history` | Saboor | Week 5 |

### Existing Tables to Extend

| Table | Changes | Owner |
|-------|---------|-------|
| `pharmacy` | +12 columns (store_number, wholesaler, service_type, etc.) | Saboor |
| `admin` | +roles (processor, warehouse_staff, sales_rep) | Saboor |

---

## API Endpoints Summary

### New Endpoint Groups

| Group | Base Path | Auth | Owner |
|-------|-----------|------|-------|
| Processors | `/api/admin/processors` | Admin | Saboor |
| Return Transactions | `/api/return-transactions` | Processor/Admin | Saboor |
| Policies | `/api/admin/policies` | Admin | Saboor |
| Policy Check | `/api/policies/check` | Any auth | Saboor |
| Wine Cellar | `/api/admin/wine-cellar` | Admin | Saboor |
| Warehouse | `/api/admin/warehouse` | Admin | Saboor |
| Batches | `/api/admin/batches` | Admin | Saboor |
| Debit Memos | `/api/admin/debit-memos` | Admin | Saboor |
| RA Tracking | `/api/admin/ra-tracking` | Admin | Saboor |
| Pharmacy Payments | `/api/admin/pharmacy-payments` | Admin | Saboor |
| My Payments | `/api/pharmacy-payments/my-payments` | Pharmacy | Saboor |
| Destruction | `/api/admin/destruction` | Admin | Saboor |
| Extended Analytics | `/api/admin/analytics/*` | Admin | Saboor |

---

## AI Prompt Guidelines for Cursor

### General Prompt Structure

When asking Cursor AI to implement a task, use this structure:

```
Task: [Task number and name from this document]

Context:
- This is part of the FCR (First Class Returns) system
- Reference: DEVELOPMENT_GUIDE_FCR_MODULES.md, Module [X]
- Related files: [list relevant existing files]

Requirements:
- [Copy requirements from this document]
- Handle edge cases: [list relevant edge cases]

Implementation:
- Location: [exact file path]
- Follow existing patterns in: [reference file]
- Use [specific middleware/service/pattern]

Expected output:
- [Describe what the code should do]
- [List API response format if applicable]
```

### Example Prompts

**For Backend Task:**
```
Task: 5.5 - Create policy engine service

Context:
- Part of FCR system, Module 5 (Policy Engine)
- Reference: DEVELOPMENT_GUIDE_FCR_MODULES.md
- Related: src/services/policyEngineService.ts (create new)

Requirements:
- Function checkReturnability(ndc, expirationDate, isPartial, dosageForm)
- Extract labeler_id from NDC (first 5 digits)
- Lookup manufacturer_policies by labeler_id
- Check non_returnable_products for exceptions
- Calculate return window based on policy
- Check partial acceptance rules
- Return { status, reason, destination, expected_returnable_date }

Edge cases to handle:
- No policy found → return TBD
- Specific NDC exception exists → return non_returnable
- Date before window → return non_returnable with expected date
- Partial not accepted → return non_returnable

Implementation:
- Create src/services/policyEngineService.ts
- Use supabaseAdmin for database queries
- Follow pattern from src/services/creditsService.ts
```

**For Frontend Task:**
```
Task: 4.5 - Create Adding Products Mode page

Context:
- Part of FCR system, Module 4 (Product Scanning)
- Reference: DEVELOPMENT_GUIDE_FCR_MODULES.md
- Related: admin/app/warehouse/returns/[id]/add-items/page.tsx (create new)

Requirements:
- Header with pharmacy name and license plate
- Barcode scan input field (auto-focus)
- Manual NDC Entry button as fallback
- Product form fields: NDC, name, manufacturer, dosage, strength, unit, lot, serial, expiration, price, quantity, full/partial toggle
- Auto-calculate estimated value
- Classification radio buttons (auto-set by API)
- Save & Return, Cancel, Back buttons

Edge cases to handle:
- QR code parse fails → show error, allow manual entry
- Duplicate item → show warning, allow anyway
- No price found → enable Add Price button

Implementation:
- Create page at admin/app/warehouse/returns/[id]/add-items/page.tsx
- Use existing BarcodeScanner component pattern
- Follow form patterns from admin/app/admins/page.tsx
- Call POST /api/return-transactions/:id/items on save
- Use returnTransactionsSlice for state
```

---

## Final Checklist

### Before Starting Development

- [ ] Read this entire document
- [ ] Read `FCR Workflow.docx` (client document)
- [ ] Read `SYSTEM_ARCHITECTURE_DIAGRAMS.md`
- [ ] Understand existing codebase structure (Frontend, admin, src)
- [ ] Set up local development environment
- [ ] Ensure database access (Supabase)

### Weekly Sync Points

- **Week 1-2**: Database tables created, basic APIs working
- **Week 3-4**: Processor workflow functional, policy engine working
- **Week 5-6**: Warehouse receiving functional, batch management working
- **Week 7-8**: RA tracking, payments, analytics complete

### Definition of Done (per module)

- [ ] Database tables created with proper constraints
- [ ] API endpoints implemented with validation
- [ ] Edge cases handled with appropriate errors
- [ ] UI pages created following existing patterns
- [ ] Redux/Zustand state management connected
- [ ] Manual testing completed
- [ ] Code reviewed by other developer

---

*This document should be the primary reference for all FCR development. Update it as requirements change or clarifications are received from the client.*
