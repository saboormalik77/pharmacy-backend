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

#### Younas (Admin Frontend) ✅ **COMPLETED**

> **All Module 5 frontend tasks are done.**

**Task 5.7: Create policies management page** ✅ **DONE**

- ✅ **Location:** `admin/app/policies/page.tsx`
- ✅ **Table columns:** Labeler ID (mono), Manufacturer Name, Type badge, Destinations (color badges), Partials, Avg Pay %, Avg Days
- ✅ **Search:** Debounced search by manufacturer name, labeler ID, or email
- ✅ **Filters:** Type (All/Generic/Brand), Destination (All/Inmar/Qualanex/PharmaLink)
- ✅ **Pagination:** Full pagination with page indicator
- ✅ **Click row:** Navigates to detail page (`/policies/[id]`)
- ✅ **Add Policy modal:** Labeler ID, Type, Manufacturer Name, Contact, Phone, Email, Avg Pay %, Avg Days
- ✅ **Delete Policy:** Confirmation modal with warning about cascade
- ✅ **Sidebar:** Added "Policies" link with Shield icon in admin navigation

**Task 5.8: Create policy detail page** ✅ **DONE**

- ✅ **Location:** `admin/app/policies/[id]/page.tsx`
- ✅ **Section 1 — Policy Info:** Labeler ID, Type, Contact, Phone, Email, Address, Verified date
- ✅ **Section 2 — Metrics:** Two stat cards (Avg Pay %, Avg Days to Pay), Created/Updated dates
- ✅ **Section 3 — Return Policies:** Table (Destination badge, Window "Xmo before – Ymo after", Partials, Discount rate, Description). Add/Edit/Delete modals with full form (destination, reimbursement type, description, months before/after, discount, partials, auto RA email)
- ✅ **Section 4 — Non-Returnable Exceptions:** Table (NDC mono, Product Name, Reason). Add/Delete modals
- ✅ **Section 5 — Notes:** Chronological cards with date, author initials badge, text. Add/Delete modals
- ✅ **Edit Info modal:** All basic policy fields editable
- ✅ **Delete Policy:** Confirmation modal from header

**Task 5.9: Add Redux slice for policies** ✅ **DONE**

- ✅ **Location:** `admin/lib/store/policiesSlice.ts`
- ✅ **State:** `policies`, `currentPolicy`, `pagination`, `filters`, `isLoading`, `isActionLoading`, `error`
- ✅ **Core thunks:** `fetchPolicies`, `fetchPolicyById`, `createPolicy`, `updatePolicy`, `deletePolicy`
- ✅ **Return Policy thunks:** `addReturnPolicy`, `updateReturnPolicy`, `deleteReturnPolicy`
- ✅ **Exception thunks:** `addException`, `deleteException`
- ✅ **Note thunks:** `addNote`, `deleteNote`
- ✅ **Policy check thunk:** `checkReturnability` (`POST /api/policies/check`)
- ✅ **Reducers:** `setFilters`, `clearError`, `clearCurrentPolicy`
- ✅ **Registered** in `admin/lib/store/store.ts`

**Types added to `admin/lib/types/index.ts`:**
- `ManufacturerPolicy`, `ReturnPolicyRecord`, `NonReturnableProduct`, `PolicyNote`
- `ManufacturerPolicyCreatePayload`, `ReturnPolicyCreatePayload`, `NonReturnableProductPayload`, `PolicyNotePayload`
- `ReturnabilityCheckResult`, `PoliciesListResponse`

### How to Implement (Guidance for Cursor AI)

> **All Module 5 tasks are completed. Guidance kept for reference.**

---

## Module 6: Item Routing & Disposition

**Status: Fully Complete — Backend + Admin Frontend**

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

**Task 6.1: Implement routing in add item endpoint** ✅ DONE

- Location: `src/controllers/returnTransactionItemsController.ts`
- Auto-classifies items via policy engine when `returnStatus` is not provided
- Returns `policyCheck` object alongside saved item data
- Falls back to `tbd` if policy engine fails

**Task 6.2: Create TBD resolution endpoint** ✅ DONE

- Endpoint: `PATCH /api/return-transactions/:id/items/:itemId/resolve`
- Validates item is currently TBD before allowing resolution
- Input: `new_status` ('returnable' or 'non_returnable'), `reason`, `destination`, `memo`
- Location: `src/controllers/returnTransactionItemsController.ts` + `src/routes/returnTransactionItemsRoutes.ts`

**Task 6.3: Create destruction_records table** ✅ DONE

- SQL migration: `scripts/fcr_10_create_destruction_records.sql`
- Includes: status enum, indexes, RLS, updated_at trigger
- Extended columns: `manufacturer`, `lot_number`, `status` enum, `scheduled_date`, `destroyed_at`, `notes`, `created_by`

**Task 6.4: Create destruction API** ✅ DONE

- Service: `src/services/destructionService.ts`
- Controller: `src/controllers/destructionController.ts`
- Routes: `src/routes/destructionRoutes.ts`
- Endpoints:
  - `GET /api/admin/destruction` — List with pagination, filtering, search
  - `POST /api/admin/destruction` — Create record
  - `PATCH /api/admin/destruction/:id` — Update (status, pickup date, form number, etc.)
  - `GET /api/admin/destruction/pending` — Items awaiting destruction
  - `GET /api/admin/destruction/stats` — Statistics by status
  - `GET /api/admin/destruction/:id` — Get single record

#### Younas (Admin Frontend)

**Task 6.5: Show routing result in Adding Products Mode** ✅ DONE

- Location: `admin/app/warehouse/returns/[id]/add-items/page.tsx`
- After item save, a prominent classification banner shows:
  - **Green** banner with check icon for **Returnable** items — shows destination, return window, manufacturer policy
  - **Red** banner with X icon for **Non-Returnable** items — shows reason (date, policy, etc.), expected returnable date if timing-based
  - **Yellow** banner with warning icon for **TBD** items — shows "Needs manual research" message
- Displays full `policyCheck` data: destination, reason, expected returnable date, return window, manufacturer name
- Dismissable via X button; auto-clears on form reset
- Redux: Updated `addTransactionItem` thunk to capture and return `policyCheck` from API response
- Types: Added `ReturnabilityCheckResult` import to add-items page

**Task 6.6: Create TBD items view** ✅ DONE

- Location: `admin/app/warehouse/tbd-items/page.tsx`
- Grouped by return transaction — expandable accordion view
- Each transaction header shows: License Plate, Pharmacy Name, Status badge, TBD count badge, Date
- Expanding a transaction fetches its TBD items (filtered by `return_status=tbd`)
- Items table: NDC, Product, Manufacturer, Lot, Expires, QTY, Resolve button
- Search across items by NDC/product/manufacturer/lot (debounced, re-fetches expanded groups)
- **Resolve modal**: Radio selection (Returnable / Non-Returnable) with color-coded cards, Destination dropdown (Inmar, Qualanex, PharmaLink, Other), Reason field (for non-returnable), Memo textarea
- Calls `PATCH /api/return-transactions/:id/items/:itemId/resolve` via `resolveTransactionItem` thunk
- Auto-refreshes TBD items after resolution
- Added to both admin and processor sidebars with AlertTriangle icon
- Redux: Added `resolveTransactionItem` async thunk to `returnTransactionsSlice.ts`
- Types: Added `DestructionRecord`, `DestructionStats` to `admin/lib/types/index.ts`

---

## Module 7: Wine Cellar System

### ✅ **STATUS: COMPLETE** (Tasks 7.1–7.9)

### What Client Document Says (Section 7C)

> "Goes to 'wine cellar' aging inventory. Bagged by store. Labeled so it can be found later. Should be queued for future month when it becomes eligible."

### Edge Cases to Handle

- Item aged but never resurfaced
- Same store has multiple future-month bags
- Missing barcode/manifest for wine cellar item

### Developer Tasks

#### Saboor (Backend)

**Task 7.1: Create wine_cellar table** ✅ DONE

- Location: `scripts/fcr_11_create_wine_cellar.sql`
- Table: `wine_cellar` with 23 columns including `ndc_10`, `is_partial`, `partial_percentage`, `estimated_value`, `notes`, `created_by`
- 7 indexes, auto-update trigger, RLS policies
- `_wc_to_json()` helper function for camelCase JSONB output with pharmacy name JOIN

**Task 7.2: Create wine cellar service** ✅ DONE

- Location: `src/services/wineCellarService.ts`
- 7 thin RPC wrapper functions (zero query building):
  - `addToWineCellar` → `add_to_wine_cellar` RPC
  - `listWineCellarItems` → `list_wine_cellar_items` RPC
  - `getWineCellarItem` → `get_wine_cellar_item` RPC
  - `updateWineCellarItem` → `update_wine_cellar_item` RPC
  - `markAsReturned` → `mark_wine_cellar_returned` RPC
  - `checkAndSurfaceReadyItems` → `check_and_surface_ready_items` RPC
  - `getWineCellarStats` → `get_wine_cellar_stats` RPC

**Task 7.3: Create wine cellar API** ✅ DONE

- Controller: `src/controllers/wineCellarController.ts` (8 handlers)
- Routes: `src/routes/wineCellarRoutes.ts` (Swagger documented, authenticateAdmin)
- Registered: `app.use('/api/admin/wine-cellar', wineCellarRoutes)` in server.ts
- Endpoints:
  - `GET /api/admin/wine-cellar` — Paginated list with search, status, expected_month filters + summary stats
  - `POST /api/admin/wine-cellar` — Add item (validates pharmacy, checks duplicates)
  - `GET /api/admin/wine-cellar/due` — Items due this month (ready_to_return)
  - `GET /api/admin/wine-cellar/stats` — Count by status + total value
  - `GET /api/admin/wine-cellar/:id` — Single item detail
  - `PATCH /api/admin/wine-cellar/:id` — Update (location, barcode, notes, qty, price, partial fields)
  - `POST /api/admin/wine-cellar/:id/return` — Mark returned, links to return transaction
  - `POST /api/admin/wine-cellar/check-ready` — Surface items past expected date

**Task 7.4: Create wine cellar cron job** ✅ DONE

- **Service:** `src/services/wineCellarCronService.ts` — Wraps `checkAndSurfaceReadyItems()` with logging
- **Integration:** `src/server.ts` — Automated cron job runs daily at 2:00 AM
- **Schedule:** Checks every hour, but only executes at 2 AM; also runs once on server startup
- **RPC:** `check_and_surface_ready_items()` bulk-updates shelved items where `expected_returnable_date <= CURRENT_DATE` → `ready_to_return`
- **Manual trigger:** `POST /api/admin/wine-cellar/check-ready` — Can be called from UI or manually
- **Logs:** `✅ Wine cellar cron completed: N items surfaced` on success

#### Younas (Admin Frontend)

**Task 7.5: Create wine cellar page** ✅ DONE

- Location: `admin/app/warehouse/wine-cellar/page.tsx`
- Types added: `WineCellarItem`, `WineCellarStats`, `WineCellarListResponse`, `WineCellarSurfaceResult` in `admin/lib/types/index.ts`
- Redux slice: `admin/lib/store/wineCellarSlice.ts` (5 async thunks: fetchWineCellarItems, fetchWineCellarStats, updateWineCellarItem, markWineCellarReturned, checkAndSurfaceReady)
- Registered in store: `admin/lib/store/store.ts` → `wineCellar: wineCellarReducer`
- Sidebar: Added Wine Cellar link to `adminSidebarLinks` in `admin/components/layout/Sidebar.tsx`
- UI:
  - Stats cards: Total Items, Shelved, Ready to Return, Returned, Destroyed, Total Value
  - Table: NDC, Product, Pharmacy, QTY, Price, Shelved Date, Expected Return Date, Location, Status, Actions
  - Filters: Search (debounced), Status dropdown, Expected month picker, Clear button
  - "Due This Month" quick filter button
  - "Check Ready Items" button (surfaces items past expected date)
  - Edit modal: Quantity, Price, Physical Location, Baggie Barcode, Expected Date, Notes
  - Pagination with Previous/Next
  - Summary bar: Showing count, Shelved, Ready, Value

**Task 7.6: Wine cellar integration in return creation** ✅ DONE

- Location: `admin/app/warehouse/returns/[id]/page.tsx`
- Added "Wine Cellar Items" button next to "Add Items" in items section header
- Modal: Fetches wine cellar items with `ready_to_return` status for the return's pharmacy
- Table with select-all checkbox, NDC, Product, QTY, Price, Shelved date, Location
- Click rows to toggle selection
- "Add N Items" button calls `POST /api/admin/wine-cellar/:id/return` for each selected item
- Auto-refreshes items list and return summary after adding

**Task 7.7: Auto wine cellar entry from processor scanning** ✅ DONE

- **Flow:** Processor scans item → Policy engine returns `too_early` → Item auto-added to wine cellar
- **Backend changes:**
  - Controller: `src/controllers/returnTransactionItemsController.ts` — `addItemHandler` now checks if `policyResult.reason === 'too_early'` after saving the item. If true, it auto-calls `wcService.addToWineCellar()` with product data from the scan + pharmacy from the transaction, then links the created `wineCellarId` back on the item via `itemsService.updateItem()`. Non-blocking (errors logged but don't crash the request).
  - Import: `wineCellarService` and `getReturnTransactionById` from respective services
  - Response: `addItem` response now includes `wineCellarItem` field when auto-add succeeds
- **Frontend changes:**
  - Location: `admin/app/warehouse/returns/[id]/add-items/page.tsx`
  - Classification result UI shows purple theme with Archive icon when item is auto-added to wine cellar
  - Shows "MOVED TO WINE CELLAR" label with expected returnable date
  - Purple toast notification: "Item auto-added to Wine Cellar! Returnable after {date}"
  - `lastClassification` state extended with `wineCellarItem?: any`
- **Redux changes:**
  - `addTransactionItem` thunk return type now includes `wineCellarItem`

**Task 7.8: Manual move to wine cellar from items list** ✅ DONE

- **Flow:** Admin views return items → Sees item with `nonReturnableReason: 'date'` → Clicks Archive button → Item moved to wine cellar
- **Backend changes:**
  - New handler: `moveToWineCellarHandler` in `src/controllers/returnTransactionItemsController.ts`
  - New route: `POST /api/return-transactions/:id/items/:itemId/wine-cellar` in `src/routes/returnTransactionItemsRoutes.ts`
  - Auth: `authenticateAny` (admin or processor)
  - Request body: `{ expectedReturnableDate, physicalLocation?, baggieBarcode?, notes? }`
  - Logic: Validates item exists, not already in wine cellar, creates wine cellar entry, links `wine_cellar_id` on item, sets `return_status = 'non_returnable'` and `non_returnable_reason = 'date'`
- **Frontend changes:**
  - Location: `admin/app/warehouse/returns/[id]/page.tsx`
  - Status column: Shows `WC` badge (purple, with Archive icon) next to status when `item.wineCellarId` is set
  - Actions column: Archive button for items with `nonReturnableReason === 'date'` and no `wineCellarId`
  - `handleMoveToWineCellar`: Calculates expected returnable date (expiration + 6 months), dispatches `moveItemToWineCellar` thunk
- **Redux changes:**
  - New async thunk: `moveItemToWineCellar` in `admin/lib/store/returnTransactionsSlice.ts`
  - Calls `POST /return-transactions/:transactionId/items/:itemId/wine-cellar`

**Task 7.9: SQL migration for wine_cellar_id link** ✅ DONE

- Location: `scripts/fcr_12_wine_cellar_item_link.sql`
- Changes:
  1. FK constraint `fk_rti_wine_cellar` on `return_transaction_items.wine_cellar_id → wine_cellar.id` (ON DELETE SET NULL)
  2. Partial index `idx_rti_wine_cellar_id` for efficient lookups
  3. Updated `update_return_transaction_item()` RPC to include `wine_cellar_id` in UPDATE clause (was previously missing — the field existed on the table but the RPC ignored it)
- **Run manually:** Execute in Supabase SQL Editor

---

## Module 8: Return Finalization & Shipping

### � **STATUS: COMPLETE (BACKEND + FRONTEND)**

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

### Schema Changes

**SQL Migration:** `scripts/fcr_13_finalization_and_manifest.sql` (run manually)

- Added `box_count INTEGER` column to `return_transactions`
- Added `manifest_generated_at TIMESTAMPTZ` column to `return_transactions`
- Updated `_rt_to_json()` helper to include `boxCount` and `manifestGeneratedAt`

### New RPC Functions

1. **`finalize_return_transaction(p_id UUID, p_fedex_tracking TEXT, p_box_count INTEGER)`**
   - Validates status = 'completed' (must complete before finalizing)
   - Validates no items with `return_status = 'tbd'` remain
   - Validates FedEx tracking is provided
   - Sets status = 'finalized', `finalized_at = NOW()`, stores tracking + box count
   - Returns updated transaction JSON

2. **`get_manifest_data(p_transaction_id UUID)`**
   - Returns full manifest JSON: transaction info, pharmacy info, processor info
   - Includes summary (returnable/non-returnable counts, values, hasCiiItems flag)
   - Includes returnableItems and nonReturnableItems arrays with full item details
   - Sets `manifest_generated_at = NOW()` on the transaction

3. **`get_dea_form_222_data(p_transaction_id UUID)`**
   - Returns pharmacy info + items where `dea_form_222_required = true`
   - Returns 404-style error if no CII items found

### New API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/return-transactions/:id/finalize` | Finalize with validation (body: `fedexTracking`, `boxCount`) |
| GET | `/api/return-transactions/:id/manifest` | Download manifest as PDF |
| GET | `/api/return-transactions/:id/manifest-data` | Get manifest data as JSON |
| GET | `/api/return-transactions/:id/dea-form-222` | Download DEA Form 222 as PDF |

### New Files Created

- `src/services/manifestService.ts` — PDF generation (pdfkit) for manifest and DEA Form 222
- `scripts/fcr_13_finalization_and_manifest.sql` — Schema changes + 3 RPC functions

### Developer Tasks

#### Saboor (Backend)

**Task 8.1: ✅ DONE — Enhanced finalization endpoint with validation**

- Location: `src/services/returnTransactionService.ts`, `src/controllers/returnTransactionController.ts`
- Endpoint: `POST /api/return-transactions/:id/finalize`
- Implementation:
  1. Accepts `fedexTracking` (required) and `boxCount` (optional) in request body
  2. Calls `finalize_return_transaction` RPC which validates:
     - Status must be 'completed'
     - No TBD items remaining
     - FedEx tracking must be provided
  3. Sets status = 'finalized', finalized_at = now
  4. Returns updated transaction JSON
- Frontend types and Redux thunk updated to pass new parameters

**Task 8.2: ✅ DONE — Manifest generation endpoint**

- Location: `src/services/manifestService.ts`
- Endpoints: `GET /manifest` (PDF) and `GET /manifest-data` (JSON)
- PDF includes:
  - Pharmacy info (name, DEA, NPI, phone)
  - Transaction info (license plate, processor, dates, tracking)
  - Summary box (returnable/non-returnable counts + values)
  - Returnable items table (NDC, Product, Lot, Exp, Qty, Price, Value, Destination)
  - Non-returnable items table (NDC, Product, Lot, Exp, Qty, Price, Value, Reason)
  - Page footers with generation timestamp
- Uses pdfkit library (v0.17.2)

**Task 8.3: ✅ DONE — DEA Form 222 generation**

- Location: `src/services/manifestService.ts` (combined with manifest service)
- Endpoint: `GET /api/return-transactions/:id/dea-form-222`
- Generates DEA Form 222 PDF for Schedule II controlled substances
- Only includes items with `dea_form_222_required = true`
- Includes registrant info, numbered CII items table, signature lines

#### Younas (Admin Frontend)

**Task 8.4: ✅ DONE — "Complete Return" finalization flow**

- Location: `admin/app/warehouse/returns/[id]/page.tsx`
- Dedicated finalize modal (replaces simple confirm dialog) with:
  1. **Return Summary** — Shows returnable/non-returnable item counts and values
  2. **TBD Warning** — Red banner if any items still have TBD status (blocks finalization)
  3. **FedEx Tracking** input (required, validated before submit)
  4. **Box Count** input (optional)
  5. **Print Manifest** button — Opens manifest PDF in new browser tab
  6. **Print DEA Form 222** button — Only shown when CII items exist
  7. **Confirmation Checkboxes** (all must be checked to enable finalize):
     - ☐ Manifest printed and included in shipment
     - ☐ DEA Form 222 printed and included (only if CII items exist)
     - ☐ All items have been verified
  8. **Warning banner** — "Finalizing locks this return permanently"
  9. **Finalize Return** button — Disabled until tracking entered + all checks done
  10. On confirm: Calls `finalizeReturnTransaction` thunk with tracking + box count
- **Documents Section** — Shown on detail page after finalization (status = finalized/received/closed_out):
  - "Download Manifest" button (blue, opens PDF in new tab)
  - "DEA Form 222" button (orange, opens PDF in new tab)
  - Shows manifest generation timestamp
- **Shipping Card** — Now shows box count when available
- **List Page** — Finalize button redirects to detail page for full flow (no more simple confirm)

**Task 8.5: ✅ DONE — Manifest preview/print**

- Location: `admin/app/warehouse/returns/[id]/page.tsx` (integrated in detail page)
- PDF download via direct `fetch()` with Bearer token authentication
- Opens PDF in new browser tab (user can view, print via browser, or download)
- Loading state with spinner while PDF generates
- Error handling with toast notifications
- Available in two contexts:
  1. **During finalization** — "Print Manifest" and "Print DEA Form 222" buttons in finalize modal
  2. **After finalization** — "Download Manifest" and "DEA Form 222" buttons in Documents card

---

## Module 9: Warehouse Receiving

### ✅ **STATUS: Fully Complete — Backend + Admin Frontend**

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

**Task 9.1: Create receiving endpoint** ✅ DONE

- SQL Migration: `scripts/fcr_14_warehouse_receiving.sql`
  - Added columns to `return_transactions`: `verified_at`, `verified_by`, `pieces_received`
  - Added columns to `return_transaction_items`: `verified`, `actual_quantity`, `condition_notes`
  - Created `warehouse_discrepancies` table with status tracking and resolution fields
  - Updated `_rt_to_json` helper to include new columns
- Service: `src/services/warehouseService.ts`
- Controller: `src/controllers/warehouseController.ts`
- Routes: `src/routes/warehouseRoutes.ts` → registered at `/api/admin/warehouse`
- RPC: `warehouse_receive_return(p_fedex_tracking)`
  - Finds return by `fedex_tracking` (case-insensitive)
  - Validates status is `finalized` and not already received
  - Sets `status = 'received'`, `received_in_warehouse_date = NOW()`
- Endpoint: `POST /api/admin/warehouse/receive`
  - Input: `{ fedexTracking: string }`
  - Returns: full return transaction object

**Task 9.2: Create verification endpoints** ✅ DONE

- **List pending** — `GET /api/admin/warehouse/pending`
  - RPC: `warehouse_list_pending(p_search, p_page, p_limit)`
  - Returns finalized returns not yet received, with pagination and search
- **List received** — `GET /api/admin/warehouse/received`
  - RPC: `warehouse_list_received(p_search, p_page, p_limit)`
  - Returns received returns awaiting verification, with pagination and search
- **Verify return** — `POST /api/admin/warehouse/:id/verify`
  - RPC: `warehouse_verify_return(p_id, p_pieces_received, p_verified_integrity, p_notes, p_verified_by)`
  - Validates status is `received`
  - Sets `verified_integrity`, `verified_at`, `verified_by`, `pieces_received`
  - Returns transaction + verification summary (totalItems, verifiedItems, openDiscrepancies)
- **Verify item** — `PATCH /api/admin/warehouse/:id/items/:itemId/verify`
  - RPC: `warehouse_verify_item(p_transaction_id, p_item_id, p_verified, p_actual_quantity, p_condition_notes)`
  - Validates return is in `received` status
  - Updates per-item `verified`, `actual_quantity`, `condition_notes`

**Task 9.3: Create discrepancy handling** ✅ DONE

- **Report discrepancy** — `POST /api/admin/warehouse/:id/discrepancy`
  - RPC: `warehouse_report_discrepancy(p_transaction_id, p_type, p_item_id, p_ndc, p_product_name, p_expected_quantity, p_actual_quantity, p_notes, p_reported_by)`
  - Types: `missing`, `extra`, `damaged`, `wrong_store`, `other`
  - Creates record with `status = 'open'`
- **List discrepancies** — `GET /api/admin/warehouse/:id/discrepancies`
  - RPC: `warehouse_list_discrepancies(p_transaction_id, p_status)`
  - Filter by status: `open`, `resolved`, `dismissed`

#### Younas (Admin Frontend)

**Task 9.4: Create receiving page** ✅ DONE

- Location: `admin/app/warehouse/receiving/page.tsx`
- Three-tab layout: Scan & Receive, Pending, Received
- **Scan & Receive tab**: Large barcode-scanner-optimized text input with Enter-to-submit, calls `POST /admin/warehouse/receive`. On success, shows full return details card (license plate, pharmacy, items count, FedEx tracking, box count, value, received timestamp). "Start Verification" button navigates to verification page. "Receive Another" resets for batch scanning.
- **Pending tab**: Lists finalized returns not yet received (`GET /admin/warehouse/pending`) with search, showing license plate, pharmacy, tracking, items, boxes, finalized date.
- **Received tab**: Lists received returns (`GET /admin/warehouse/received`) with search. Shows verification status badge and "Verify" action button linking to the verification page.
- Redux: Created `admin/lib/store/warehouseSlice.ts` with 7 async thunks (`receiveReturn`, `fetchPendingReturns`, `fetchReceivedReturns`, `verifyReturn`, `verifyItem`, `reportDiscrepancy`, `fetchDiscrepancies`, `fetchTransactionForVerification`). Registered `warehouseReducer` in `admin/lib/store/store.ts`.
- Types: Extended `ReturnTransaction` with `verifiedAt`, `verifiedBy`, `piecesReceived`. Extended `ReturnTransactionItem` with `verified`, `actualQuantity`, `conditionNotes`. Added `WarehouseDiscrepancy` and `VerificationSummary` interfaces.
- Sidebar: Added "Receiving" link with `PackageCheck` icon to both admin and processor sidebars.

**Task 9.5: Create verification page** ✅ DONE

- Location: `admin/app/warehouse/receiving/[id]/page.tsx`
- **Return header**: License plate, pharmacy name, received date, status badges
- **Summary cards**: Total items, verified items count, open discrepancies, FedEx tracking, box count
- **Verification checklist**:
  - Pieces received input (compared against expected box count)
  - All items verified indicator (auto-computed)
  - Integrity confirmed checkbox
  - Verification notes textarea
- **Items grid**: Full table of all items with per-item verification checkboxes (`PATCH /admin/warehouse/:id/items/:itemId/verify`). Columns: checkbox, NDC, Product, Manufacturer, Lot, Expires, QTY, Status badge, Destination. "Verify All" bulk action. Filterable by NDC/product/manufacturer/lot.
- **Discrepancies section**: Lists all discrepancies for the return with type badge, product, NDC, expected/actual quantities, notes, status, and report date.
- **Report Discrepancy modal**: Type selector (missing, extra, damaged, wrong_store, other), NDC, product name, expected/actual quantities, notes. Calls `POST /admin/warehouse/:id/discrepancy`.
- **Complete Verification** button: Calls `POST /admin/warehouse/:id/verify` with pieces received, integrity confirmed, and notes.

---

## Module 10: Monthly Batch & Close-Out

### ✅ **STATUS: Fully Complete — Backend + Admin Frontend**

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

**Task 10.1: Create return_batches table** ✅ DONE

- SQL Migration: `scripts/fcr_15_batch_closeout.sql`
- Table: `return_batches` with all specified columns
- Unique index on `batch_month` to prevent duplicate batches for the same month
- `_batch_to_json` helper for consistent camelCase JSON output
- RLS enabled, updated_at trigger

**Task 10.2: Create debit_memos table** ✅ DONE

- Table: `debit_memos` with all specified columns
- Indexes on `batch_id`, `pharmacy_id`, `destination`, `payment_status`
- `_debit_memo_to_json` helper with joined `pharmacyName` from pharmacy table
- RLS enabled, updated_at trigger

**Task 10.3: Create debit_memo_items table** ✅ DONE

- Table: `debit_memo_items` with all specified columns
- Indexes on `debit_memo_id`, `transaction_item_id`
- RLS enabled

**Task 10.4: Create batch management service** ✅ DONE

- Service: `src/services/batchService.ts` — all RPC-backed, zero custom JS logic
- Interfaces: `ReturnBatch`, `DebitMemo`, `DebitMemoItem`
- Functions (all via Supabase RPC):
  - `createBatch(batchMonth, batchName?)` — creates batch, normalises to first-of-month, rejects duplicates
  - `listBatches(status?, page?, limit?)` — paginated list with status filter
  - `getBatch(batchId)` — returns batch + nested debitMemos + assigned returns
  - `assignReturnsToBatch(batchId, transactionIds[])` — assigns received/closed_out returns, skips invalid, updates batch totals
  - `closeBatch(batchId)` — validates no TBD items, no returnable items without destination, generates debit memos grouped by (pharmacy, destination, labeler_id), populates debit_memo_items, closes batch
  - `submitCardinal(batchId)` — marks batch as submitted to Cardinal
  - `listDebitMemos(filters)` — paginated list with batch, pharmacy, destination, payment_status, search filters
  - `getDebitMemo(memoId)` — returns memo + all line items
  - `updateDebitMemo(memoId, updates)` — updates RA info, payment, shipping fields

**Task 10.5: Create batch/close-out API** ✅ DONE

- Controller: `src/controllers/batchController.ts`
- Routes: `src/routes/batchRoutes.ts` → registered at `/api/admin/batches`
- Endpoints:
  - `GET /api/admin/batches` — List batches (filter by status, paginated)
  - `POST /api/admin/batches` — Create batch (`{ batchMonth, batchName? }`)
  - `GET /api/admin/batches/:id` — Get batch with debit memos and returns
  - `POST /api/admin/batches/:id/assign` — Assign returns (`{ transactionIds: [] }`)
  - `POST /api/admin/batches/:id/close` — Close batch (generates debit memos)
  - `POST /api/admin/batches/:id/submit-cardinal` — Mark as submitted

**Task 10.6: Create debit memo API** ✅ DONE

- Controller: `src/controllers/debitMemoController.ts`
- Routes: `src/routes/debitMemoRoutes.ts` → registered at `/api/admin/debit-memos`
- Endpoints:
  - `GET /api/admin/debit-memos` — List memos (filter by batch, pharmacy, destination, payment_status, search)
  - `GET /api/admin/debit-memos/:id` — Get memo with line items
  - `PATCH /api/admin/debit-memos/:id` — Update RA number, payment, shipping info

#### Younas (Admin Frontend)

**Redux & Types Setup** ✅ DONE

- Types: Added `ReturnBatch`, `DebitMemo`, `DebitMemoItem` interfaces to `admin/lib/types/index.ts`
- Redux slice: `admin/lib/store/batchSlice.ts` — state for batches, debit memos, pagination, current detail views
  - Batch thunks: `fetchBatches`, `createBatch`, `fetchBatchDetail`, `assignReturnsToBatch`, `closeBatch`, `submitCardinal`
  - Debit memo thunks: `fetchDebitMemos`, `fetchDebitMemoDetail`, `updateDebitMemo`
  - Reducers: `clearError`, `clearCurrentBatch`, `clearCurrentMemo`
- Store: Registered `batchReducer` in `admin/lib/store/store.ts`
- Sidebar: Added "Batches" (`Layers` icon) and "Debit Memos" (`Receipt` icon) links to admin sidebar

**Task 10.7: Create batches page** ✅ DONE

- Location: `admin/app/warehouse/batches/page.tsx`
- **Stats cards**: Total batches, Open, Closed, Submitted — with color-coded icons
- **Filters**: Status dropdown (All / Open / Closed / Submitted)
- **Table**: Batch Month (formatted as "March 2026"), Name, Status badge, Returns count, Debit Memos count, Total Value (currency), Cardinal status badge (Pending / File Ready / Submitted), Created date
- **Create Batch modal**: Month picker (`<input type="month">`) and optional name field. Calls `POST /api/admin/batches`
- **Row click**: Navigates to batch detail page `/warehouse/batches/:id`
- **Pagination**: Previous/Next with page indicator

**Task 10.8: Create batch detail page** ✅ DONE

- Location: `admin/app/warehouse/batches/[id]/page.tsx`
- **Header**: Batch name, status badge, month, action buttons
- **Info cards**: Returns count, Debit Memos count, Total Value, Cardinal Status with submitted date
- **Batch Details card**: Created date, Closed date, Cardinal Approved date, Cardinal File download link
- **Returns in Batch** (collapsible): Table with License Plate, Pharmacy, Status, Items, Value, Tracking. Row click navigates to return detail.
- **Debit Memos** (collapsible): Table with Memo #, Pharmacy, Destination, Labeler, Items, Ask Value, RA #, Payment Status. Contextual empty message for open vs closed batches.
- **Assign Returns modal** (open batches only): Fetches received returns from warehouse API, searchable list with checkboxes, shows license plate/pharmacy/items/value. Calls `POST /api/admin/batches/:id/assign`
- **Close Batch** confirmation modal (open batches only): Warning about irreversibility, explains what happens (locks batch, generates debit memos, validates no TBD items). Calls `POST /api/admin/batches/:id/close`
- **Mark Cardinal Submitted** confirmation modal (closed batches only): Calls `POST /api/admin/batches/:id/submit-cardinal`

**Task 10.9: Create debit memos page** ✅ DONE

- Location: `admin/app/warehouse/debit-memos/page.tsx`
- **Filters**: Search (memo #, pharmacy, labeler — debounced), Destination dropdown, Payment Status dropdown
- **Accordion list**: Each memo is an expandable row showing Memo #, Pharmacy, Destination, Items, Ask Value, RA Status (Pending/Requested/Received badges), Payment Status badge
- **Expanded detail view** (inline, no separate page):
  - **RA Info card**: RA Number, Requested/Received dates, Tickler date — editable in edit mode
  - **Shipping card**: Baggie Manifest, Outbound Tracking, Shipped date — editable
  - **Payment card**: Status dropdown, Amount Requested, Amount Received — editable
  - **Memo Details card**: Labeler ID, Labeler Name, Destination, Total Ask, Total Received
  - **Line Items table**: NDC, Product, Lot #, Expires, Qty, Ask Price, Received Price
  - **Edit mode**: Toggle with Edit button, updates via `PATCH /api/admin/debit-memos/:id`, inline form fields replace display values
- **Highlight support**: `?highlight=<memoId>` query param auto-expands the specified memo (used from batch detail page)
- **Pagination**: Previous/Next with page/total indicator

---

## Module 11: RA Request & Tracking

### ✅ **STATUS: Fully Complete — Backend + Admin Frontend**

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

**Task 11.1: Create RA request service** ✅ DONE

- SQL Migration: `scripts/fcr_16_ra_request_tracking.sql`
  - Created `ra_requests` table (id, debit_memo_id, request_type, destination_email, destination_name, subject, body_preview, status, sent_by, sent_at, error_message, created_at) with indexes and RLS
  - Added `ra_status` column to `debit_memos` (values: pending, requested, received, shipped, overdue) with index
  - Updated `_debit_memo_to_json` helper to include `raStatus`
  - Created `_ra_request_to_json` helper for consistent camelCase output
- Service: `src/services/raService.ts` — all RPC-backed, zero custom JS logic
  - Interfaces: `RARequest`, `RAEmailTemplate`, `RAReminderTemplate`, `RATrackingSummary`
  - Functions (all via Supabase RPC):
    - `sendRARequest(debitMemoId, sentBy?, emailOverride?)` — looks up `credit_request_email` from `manufacturer_policies`, creates ra_request log, sets ra_status='requested', auto-sets tickler date (14 days)
    - `receiveRA(debitMemoId, raNumber, pdfUrl?)` — records RA number, sets ra_status='received'
    - `resendRARequest(debitMemoId, sentBy?, emailOverride?)` — creates reminder log, bumps tickler date (+7 days)
    - `listRATracking(filters)` — dashboard with ra_status/destination/date/search filters, includes summary counts
    - `listOutstandingRAs(search?, page?, limit?)` — requested but not received RAs
    - `listOverdueRAs(search?, page?, limit?)` — RAs past tickler date
    - `shipDebitMemo(debitMemoId, outboundTracking, shippedAt?)` — records shipment, requires RA number first
    - `listOutboundShipments(search?, page?, limit?)` — shipped debit memos
    - `generateRequestEmail(debitMemoId, emailOverride?)` — builds full email template (to, subject, body, items list)
    - `generateReminderEmail(debitMemoId, emailOverride?)` — builds reminder template with follow-up count

- RPC functions (13 total):
  - `ra_send_request` — validates memo, finds email from manufacturer_policies (or uses override), creates log, updates memo status/tickler
  - `ra_receive` — records RA number and sets status to received
  - `ra_resend_request` — logs reminder with follow-up count, bumps tickler
  - `ra_list_tracking` — full dashboard with sorting (overdue first), pagination, and summary counts per status
  - `ra_list_outstanding` — pending RAs sorted by tickler date
  - `ra_list_overdue` — past-tickler RAs sorted by urgency
  - `ra_ship_debit_memo` — validates RA exists, records tracking + shipped_at, sets ra_status='shipped'
  - `ra_list_outbound_shipments` — shipped memos sorted by ship date
  - `ra_generate_request_email` — builds full email with pharmacy address, item list, contact info
  - `ra_generate_reminder_email` — builds reminder with follow-up count and original request date

**Task 11.2: Create RA tracking API** ✅ DONE

- Controller: `src/controllers/raController.ts`
- Routes registered on two routers:
  - `src/routes/debitMemoRoutes.ts` (extended) — per-memo RA actions:
    - `POST /api/admin/debit-memos/:id/request-ra` — Send RA request
    - `POST /api/admin/debit-memos/:id/receive-ra` — Record RA received (requires `raNumber`)
    - `POST /api/admin/debit-memos/:id/resend-ra` — Resend RA reminder
    - `POST /api/admin/debit-memos/:id/ship` — Record outbound shipment (requires `outboundTracking`, validates RA received)
    - `GET /api/admin/debit-memos/:id/email-preview?type=request|reminder` — Preview email template
  - `src/routes/raTrackingRoutes.ts` → registered at `/api/admin/ra-tracking`:
    - `GET /api/admin/ra-tracking` — Dashboard (filter by ra_status, destination, date range, search; includes summary)
    - `GET /api/admin/ra-tracking/outstanding` — Pending RAs
    - `GET /api/admin/ra-tracking/overdue` — Past-tickler RAs
  - `src/routes/shipmentRoutes.ts` → registered at `/api/admin/shipments`:
    - `GET /api/admin/shipments/outbound` — All shipped debit memos

**Task 11.3: Create email templates** ✅ DONE

- Implemented as RPC functions (no separate template files — all logic in Postgres):
  - `ra_generate_request_email` — returns `{ to, toName, subject, body, memoNumber, pharmacyName, destination, labelerName, totalItems, totalAskValue, items[] }`
  - `ra_generate_reminder_email` — returns `{ to, toName, subject, body, memoNumber, pharmacyName, requestCount, originalDate }`
- Email content includes: debit memo number, pharmacy info (name + address), item list (NDC, product, qty, ask price, lot, expiration), contact info
- Destination email sourced from `manufacturer_policies.credit_request_email` with override option
- Exposed via `GET /api/admin/debit-memos/:id/email-preview?type=request|reminder&emailOverride=...`

**Task 11.4: Create outbound shipment tracking** ✅ DONE

- Endpoints:
  - `POST /api/admin/debit-memos/:id/ship` — Records FedEx/UPS tracking + ship date. Validates RA number exists. Sets ra_status='shipped'.
  - `GET /api/admin/shipments/outbound` — Lists all shipped debit memos with search, pagination. Searchable by memo number, tracking, labeler, pharmacy.

#### Younas (Admin Frontend)

**Redux & Types Setup** ✅ DONE

- Types: Added `raStatus` field to `DebitMemo` interface. Added `RARequest`, `RAEmailTemplate`, `RATrackingSummary` interfaces to `admin/lib/types/index.ts`
- Redux slice: `admin/lib/store/raTrackingSlice.ts` — state for memos, pagination, summary, emailPreview, loading states
  - Thunks: `fetchRATracking`, `fetchOutstandingRAs`, `fetchOverdueRAs`, `sendRARequest`, `receiveRA`, `resendRA`, `shipMemo`, `fetchEmailPreview`
  - Reducers: `clearError`, `clearEmailPreview`
  - All thunks update the memo in-place in the list after successful actions
- Store: Registered `raTrackingReducer` in `admin/lib/store/store.ts`
- Sidebar: Added "RA Tracking" link with `MailCheck` icon to admin sidebar

**Task 11.5: Create RA tracking page** ✅ DONE

- Location: `admin/app/warehouse/ra-tracking/page.tsx`
- **Summary cards**: Pending (gray), Requested (blue), Received (green), Shipped (purple), Overdue (red) — live counts from API summary
- **Filters**: Search (debounced, by memo #/pharmacy/labeler/RA #), RA Status dropdown, Destination dropdown, Date range (from/to) pickers
- **Table columns**: Memo #, Pharmacy, Destination, Labeler, Ask Value, Requested Date, Tickler Date (red + "(!)" if overdue), RA #, Status badge, Actions
- **Overdue row highlighting**: Rows with past tickler dates get a red background tint
- **Context-sensitive row actions** based on `raStatus`:
  - `pending` → "Request RA" button
  - `requested` / `overdue` → "Resend" + "Record RA" buttons
  - `received` → "Ship" button
- **Pagination**: Previous/Next with page/total indicator

**Task 11.6: Create RA request modal** ✅ DONE

- Integrated as a modal within the RA tracking page (opened via "Request RA" or "Resend" row actions)
- **Request RA modal**:
  - Shows debit memo details (Memo #, Pharmacy, Destination, Labeler, Items, Ask Value)
  - Loads email preview via `GET /admin/debit-memos/:id/email-preview?type=request` — shows To, Subject, and full Body preview
  - Email override input (optional) to send to a different address
  - "Send RA Request" button → calls `POST /admin/debit-memos/:id/request-ra`
  - Success toast confirmation
- **Resend RA modal**:
  - Shows original request date and tickler date (with overdue warning)
  - Loads reminder email preview via `?type=reminder`
  - Email override input
  - "Resend Reminder" button → calls `POST /admin/debit-memos/:id/resend-ra`

**Task 11.7: Create RA receive modal** ✅ DONE

- Integrated as a modal within the RA tracking page (opened via "Record RA" row action)
- Shows debit memo details (Memo #, Labeler, Destination)
- **RA Number input** (required, auto-focused)
- **PDF URL input** (optional, for RA authorization document link)
- "Record RA Received" button → calls `POST /admin/debit-memos/:id/receive-ra`
- Also includes a **Ship modal** for received memos:
  - Shows memo details + RA number
  - Outbound tracking # input (required)
  - "Record Shipment" button → calls `POST /admin/debit-memos/:id/ship`

---

## Module 12: Manufacturer Payment Tracking

### ✅ **STATUS: COMPLETE (Backend + Admin Frontend done)**

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

**Task 12.1: Create payment tracking fields** ✅ DONE

- SQL migration: `scripts/fcr_17_manufacturer_payment_tracking.sql`
- Added 3 new columns to `debit_memos`: `payment_received_at`, `payment_reference`, `payment_notes`
- Updated `_debit_memo_to_json` helper to include the new fields
- All columns added with safe `IF NOT EXISTS` checks

**Task 12.2: Create unpaid tracking API** ✅ DONE

- Service: `src/services/paymentTrackingService.ts` — all functions wrap Supabase RPC calls
- Controller: `src/controllers/paymentTrackingController.ts`
- Routes added to `src/routes/debitMemoRoutes.ts` (for debit-memo endpoints) and `src/routes/adminAnalyticsRoutes.ts` (for analytics endpoints)
- Endpoints created:
  - `GET /api/admin/debit-memos/unpaid` — Lists unpaid memos with outstanding amounts, days outstanding, pagination, and summary totals. RPC: `payment_list_unpaid`
  - `POST /api/admin/debit-memos/:id/record-payment` — Records payment (amount, date, reference, notes). Auto-determines payment_status (pending/partial/paid). RPC: `payment_record`
  - `POST /api/admin/debit-memos/:id/send-reminder` — Sends payment reminder email to manufacturer. Logs in `ra_requests` table with `request_type='reminder'`. RPC: `payment_send_reminder`
  - `GET /api/admin/analytics/ask-vs-received` — Ask vs Received analytics grouped by manufacturer or time period. RPC: `payment_ask_vs_received`
- All 5 RPC functions created in SQL migration

**Task 12.3: Create manufacturer payment summary** ✅ DONE

- Endpoint: `GET /api/admin/analytics/manufacturer-payments`
- RPC: `payment_manufacturer_summary` — returns per manufacturer:
  - Total memos, unpaid count, paid count, disputed count
  - Total ask value, total paid amount, outstanding amount
  - Average pay percent, average days to pay
  - Policy-defined avg pay percent and avg days to pay (from `manufacturer_policies`)
- Pagination and search support included

#### Younas (Admin Frontend)

**Task 12.4: Create unpaid debit memos page** ✅ DONE

- Location: `admin/app/warehouse/unpaid/page.tsx`
- Types added to `admin/lib/types/index.ts`: `UnpaidSummary`, `AskVsReceivedRow`, `ManufacturerPaymentSummary`
- Redux slice: `admin/lib/store/paymentTrackingSlice.ts` with 5 async thunks: `fetchUnpaidMemos`, `recordPayment`, `sendPaymentReminder`, `fetchAskVsReceived`, `fetchManufacturerSummary`
- Registered `paymentTrackingReducer` in `admin/lib/store/store.ts`
- Added "Unpaid Memos" link (CircleDollarSign icon) to admin sidebar
- Page has 3 tabs:
  - **Unpaid Memos**: Summary cards (total unpaid, total outstanding), search/destination filters, table with Memo #, Manufacturer, Pharmacy, Destination, Asked, Received, Outstanding, Days Outstanding, Status, Pay/Remind action buttons, pagination
  - **Ask vs Received**: Totals cards (memos, ask, received, pay %), toggle between manufacturer/monthly grouping, analytics table
  - **Manufacturer Summary**: Search, table per manufacturer with total/unpaid/paid memos, ask value, paid amount, outstanding, avg pay %, avg days to pay (with policy benchmarks)

**Task 12.5: Create payment recording modal** ✅ DONE

- Integrated into `admin/app/warehouse/unpaid/page.tsx`
- "Record Payment" modal: Shows memo summary (asked, received so far, outstanding), Amount received input ($ prefix), Payment date picker, Reference # input, Notes textarea, Record Payment button
- Auto-determines payment status (pending/partial/paid) on backend
- "Send Reminder" modal: Sends payment reminder email to manufacturer, optional email override
- Both modals show loading state during async actions and success/error toasts

---

## Module 13: Pharmacy & GPO Payout

### ✅ **STATUS: COMPLETE**

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

**Task 13.1: Create pharmacy_payments table** ✅ DONE

- Location: `scripts/fcr_18_pharmacy_gpo_payout.sql`
- Table: `pharmacy_payments`
  - `id` (UUID, PK)
  - `pharmacy_id` (UUID, FK → pharmacy)
  - `batch_id` (UUID, FK → return_batches, nullable)
  - `total_credit_received` (DECIMAL 12,2)
  - `company_fee` (DECIMAL 12,2)
  - `company_fee_percent` (DECIMAL 5,2)
  - `gpo_share` (DECIMAL 12,2)
  - `gpo_name` (TEXT — auto-populated from pharmacy.gpo_affiliation)
  - `pharmacy_payout` (DECIMAL 12,2)
  - `payment_method` (TEXT: 'wire', 'check', 'zelle', 'cash')
  - `payment_reference` (TEXT)
  - `paid_at` (TIMESTAMPTZ)
  - `status` (TEXT: 'pending', 'processing', 'paid', 'failed', 'disputed')
  - `notes` (TEXT)
  - `created_by` (UUID)
  - `created_at` (TIMESTAMPTZ)
  - `updated_at` (TIMESTAMPTZ — auto-updated via trigger)
- Includes: RLS policy, indexes on pharmacy_id/batch_id/status/paid_at/created_at, updated_at trigger

**Task 13.2: Create pharmacy payment RPC functions** ✅ DONE

- Location: `scripts/fcr_18_pharmacy_gpo_payout.sql`
- RPC Functions (all via Supabase `sb.rpc()`):
  - `pharmacy_payment_calculate(p_pharmacy_id, p_batch_id, p_company_fee_pct, p_gpo_share_pct)` — calculate payout from debit memo totals
  - `pharmacy_payment_create(...)` — create payment record (with duplicate pharmacy+batch guard)
  - `pharmacy_payment_update(...)` — update status/method/reference/amounts (auto-sets paid_at when status='paid')
  - `pharmacy_payment_get(p_payment_id)` — get single payment with associated debit memos
  - `pharmacy_payment_list(p_status, p_pharmacy, p_batch_id, p_search, p_page, p_limit)` — admin paginated list with summary totals
  - `pharmacy_payment_summary(p_search, p_page, p_limit)` — summary grouped by pharmacy
  - `pharmacy_payment_my_payments(p_pharmacy_id, p_status, p_page, p_limit)` — pharmacy-facing own history with summary
- Helper: `_pharmacy_payment_to_json(p)` — consistent JSON serialization

**Task 13.3: Create pharmacy payment API** ✅ DONE

- Service: `src/services/pharmacyPaymentService.ts`
- Controller: `src/controllers/pharmacyPaymentController.ts`
- Routes: `src/routes/pharmacyPaymentRoutes.ts`
- Registered in: `src/server.ts`
- Admin endpoints (require admin auth):
  - `POST /api/admin/pharmacy-payments/calculate` — Calculate payout for pharmacy+batch
  - `GET /api/admin/pharmacy-payments` — List all payments (filters: status, pharmacy, batch_id, search)
  - `POST /api/admin/pharmacy-payments` — Create payment record
  - `GET /api/admin/pharmacy-payments/summary` — Summary grouped by pharmacy
  - `GET /api/admin/pharmacy-payments/:id` — Get payment detail with debit memos
  - `PATCH /api/admin/pharmacy-payments/:id` — Update payment (status, method, reference, amounts)
- Pharmacy endpoint (require pharmacy auth):
  - `GET /api/pharmacy-payments/my-payments` — Pharmacy's own payment history with summary

#### Younas (Pharmacy Frontend)

**Task 13.4: Create credit statement page** ✅ DONE

- Location: `Frontend/app/(dashboard)/credits/statement/page.tsx`
- UI:
  - Payment history table with totals row
  - Per payment: Date, Batch, Month, Credit Received, Company Fee, GPO Share, Payout, Method, Reference, Paid At, Status
  - Download CSV button
  - Filter by date range (start/end date inputs)
  - Pagination support
  - Summary stats: Total Credits, Total Fees, Total Payout, Paid/Pending counts

**Task 13.5: Wire up existing credits page** ✅ DONE

- Location: `Frontend/app/(dashboard)/credits/page.tsx`
- Replaced mock data with real API via `pharmacyPaymentService.getMyPayments()`
- API service: `Frontend/lib/api/services/pharmacyPaymentService.ts`
- Types: `PharmacyPayment`, `PharmacyPaymentSummary` in `Frontend/types/index.ts`
- Shows: Total Credits, Total Payout, Total Fees, Paid/Pending amounts, Payout Rate
- Payment history table with: Date, Batch, Credit Received, Company Fee, GPO Share, Payout, Method, Reference, Paid At, Status
- Status filter buttons (All, Pending, Processing, Paid, Failed, Disputed)
- Pagination support
- Link to credit statement page

---

## Module 14: Reporting & Analytics

### ✅ **STATUS: Backend Complete**

| Component | Status | Files |
|-----------|--------|-------|
| **ndc_price_history table** | ✅ Complete | `scripts/fcr_19_reporting_analytics.sql` |
| **RPC: analytics_returns_summary** | ✅ Complete | Returns by period, status, service type |
| **RPC: analytics_ask_vs_received** | ✅ Complete | By manufacturer, NDC, or destination |
| **RPC: analytics_aging_inventory** | ✅ Complete | Wine cellar aging report with buckets |
| **RPC: analytics_outstanding_ra** | ✅ Complete | RA aging report with buckets |
| **RPC: analytics_unpaid_memos** | ✅ Complete | Unpaid memo aging with buckets |
| **RPC: analytics_price_audit** | ✅ Complete | NDC price source audit trail |
| **RPC: analytics_pharmacy_performance** | ✅ Complete | Per-pharmacy performance |
| **RPC: analytics_gpo_summary** | ✅ Complete | Per-GPO summary |
| **RPC: analytics_pharmacy_dashboard** | ✅ Complete | Pharmacy-facing own analytics |
| **Backend Service** | ✅ Complete | `src/services/reportingAnalyticsService.ts` |
| **Backend Controller** | ✅ Complete | `src/controllers/reportingAnalyticsController.ts` |
| **Admin API Routes** | ✅ Complete | Extended `src/routes/adminAnalyticsRoutes.ts` |
| **Pharmacy API Route** | ✅ Complete | `src/routes/pharmacyAnalyticsRoutes.ts` |
| **Server Registration** | ✅ Complete | `src/server.ts` |

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
| `pharmacy_payments` | Saboor | Week 5 ✅ |
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
| Pharmacy Payments | `/api/admin/pharmacy-payments` | Admin | Saboor | ✅ |
| My Payments | `/api/pharmacy-payments/my-payments` | Pharmacy | Saboor | ✅ |
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
