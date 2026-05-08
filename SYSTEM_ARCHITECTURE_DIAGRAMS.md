# PharmAnalytics — Complete System Architecture & Flow Diagrams

**Generated:** March 9, 2026
**Based on:** Full codebase analysis + NEXT_STEPS_ACTION_PLAN.md + Client meeting (March 5, 2026)

---

## 1. CURRENT vs NEW — System Overview

### What EXISTS Today (✅)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CURRENT SYSTEM (Analytics Focus)                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────┐    ┌──────────────────────┐                      │
│  │   ADMIN PANEL        │    │   PHARMACY FRONTEND   │                     │
│  │   (Next.js 16)       │    │   (Next.js 16)        │                     │
│  │                      │    │                        │                     │
│  │  • Dashboard         │    │  • Dashboard + Charts  │                     │
│  │  • Pharmacies CRUD   │    │  • NDC Search          │                     │
│  │  • Distributors CRUD │    │  • Inventory CRUD      │                     │
│  │  • Marketplace Deals │    │  • Returns Processing  │                     │
│  │  • Documents         │    │  • Documents Upload    │                     │
│  │  • Payments          │    │  • Optimization Engine │                     │
│  │  • Analytics         │    │  • Marketplace (B2B)   │                     │
│  │  • Admin Users       │    │  • Subscriptions       │                     │
│  │  • Settings          │    │  • Barcode Scanner     │                     │
│  │  • Shipments (MOCK)  │    │  • Warehouse (MOCK)    │                     │
│  │                      │    │  • Credits (MOCK)      │                     │
│  └──────────┬───────────┘    │  • Analytics (MOCK)    │                     │
│             │                │  • Reports (MOCK)      │                     │
│             │                └──────────┬─────────────┘                     │
│             │                           │                                   │
│             └───────────┬───────────────┘                                   │
│                         │                                                   │
│                         ▼                                                   │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │              BACKEND (Express + TypeScript)                   │          │
│  │                                                               │          │
│  │  31 Controllers │ 34 Services │ 30+ RPC Functions            │          │
│  │  Auth (JWT + Supabase) │ Stripe │ Resend │ Azure OpenAI      │          │
│  │                                                               │          │
│  │  Database: Supabase (PostgreSQL) — 23 Tables                 │          │
│  └──────────────────────────────────────────────────────────────┘          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### What NEEDS TO BE BUILT (🔴 NEW)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NEW SYSTEM (Operational Warehouse Engine)                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  🔴 PROCESSOR WORKFLOW     🔴 WAREHOUSE OPS        🔴 FINANCIAL ENGINE     │
│  ─────────────────────     ──────────────────       ──────────────────      │
│  • Store Selection         • FedEx Receiving        • Debit Memo Gen       │
│  • License Plate Gen       • Verification           • RA Request System    │
│  • QR/Barcode Scanning     • Batch Assignment       • RA Tracking          │
│  • Adding Products Mode    • Destination Assign     • Cardinal Upload      │
│  • Policy Engine Check     • Baggy Manifest Print   • Unpaid Memo Track    │
│  • Wine Cellar Entry       • Wine Cellar Review     • Pharmacy Payments    │
│  • Complete/Finalize       • Monthly Close-Out      • Ask vs Receive       │
│  • DEA Form 222            • Destruction Track      • Credit Collection    │
│                                                                             │
│  🔴 NEW DATA LAYER        🔴 NEW INTEGRATIONS      🔴 NEW ROLES           │
│  ──────────────────        ───────────────────       ──────────────         │
│  • 15 New DB Tables        • FedEx API              • Processor            │
│  • Manufacturer Policies   • Cardinal Health        • Warehouse Staff      │
│  • NDC Pricing History     • Inmar/PharmaLink       • Sales Rep            │
│  • Return Transactions     • Email Automation       • Self-Service Pharm   │
│  • Debit Memos/Batches     • PDF Generation         • GPO Admin            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. COMPLETE ROLE HIERARCHY

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ALL SYSTEM ROLES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────┐                           │
│  │           ADMIN ROLES (Existing)             │                           │
│  │                                              │                           │
│  │  ┌─────────────────┐  FULL system access     │                           │
│  │  │  SUPER_ADMIN    │  All CRUD, settings,    │                           │
│  │  │  (exists ✅)     │  user management        │                           │
│  │  └─────────────────┘                         │                           │
│  │           │                                  │                           │
│  │  ┌────────┴────────┐                         │                           │
│  │  │                 │                         │                           │
│  │  ▼                 ▼                         │                           │
│  │  ┌──────────┐  ┌──────────┐                  │                           │
│  │  │ MANAGER  │  │ REVIEWER │  Documents,      │                           │
│  │  │(exists ✅)│  │(exists ✅)│  return approval │                           │
│  │  └──────────┘  └──────────┘                  │                           │
│  │                    │                         │                           │
│  │                    ▼                         │                           │
│  │              ┌──────────┐                    │                           │
│  │              │ SUPPORT  │  Read-only access  │                           │
│  │              │(exists ✅)│                    │                           │
│  │              └──────────┘                    │                           │
│  └─────────────────────────────────────────────┘                           │
│                                                                             │
│  ┌─────────────────────────────────────────────┐                           │
│  │         NEW ROLES (To Build 🔴)              │                           │
│  │                                              │                           │
│  │  ┌─────────────────────────────────────┐     │                           │
│  │  │  PROCESSOR (Field Rep) 🔴            │     │                           │
│  │  │  • Sees ONLY assigned stores         │     │                           │
│  │  │  • Create return transactions        │     │                           │
│  │  │  • Scan products (QR/barcode)        │     │                           │
│  │  │  • Classify items (policy engine)    │     │                           │
│  │  │  • Complete & finalize returns       │     │                           │
│  │  │  • Print manifests                   │     │                           │
│  │  │  • Enter FedEx tracking              │     │                           │
│  │  │  • NO access to warehouse/financial  │     │                           │
│  │  └─────────────────────────────────────┘     │                           │
│  │                                              │                           │
│  │  ┌─────────────────────────────────────┐     │                           │
│  │  │  WAREHOUSE_STAFF 🔴                  │     │                           │
│  │  │  • Receive shipments (FedEx scan)    │     │                           │
│  │  │  • Verify items (integrity check)    │     │                           │
│  │  │  • Assign batches                    │     │                           │
│  │  │  • Print baggy manifests             │     │                           │
│  │  │  • Monthly close-out                 │     │                           │
│  │  │  • RA fulfillment (scan & ship)      │     │                           │
│  │  │  • Wine Cellar management            │     │                           │
│  │  │  • Destruction tracking              │     │                           │
│  │  └─────────────────────────────────────┘     │                           │
│  │                                              │                           │
│  │  ┌─────────────────────────────────────┐     │                           │
│  │  │  SALES_REP 🔴                        │     │                           │
│  │  │  • View assigned pharmacies          │     │                           │
│  │  │  • View return history & credits     │     │                           │
│  │  │  • Visit scheduling                  │     │                           │
│  │  │  • NO create/edit returns            │     │                           │
│  │  └─────────────────────────────────────┘     │                           │
│  │                                              │                           │
│  │  ┌─────────────────────────────────────┐     │                           │
│  │  │  GPO_ADMIN 🔴 (Future)               │     │                           │
│  │  │  • White-label view per GPO          │     │                           │
│  │  │  • Rebate tracking                   │     │                           │
│  │  │  • GPO-specific analytics            │     │                           │
│  │  └─────────────────────────────────────┘     │                           │
│  └─────────────────────────────────────────────┘                           │
│                                                                             │
│  ┌─────────────────────────────────────────────┐                           │
│  │       PHARMACY ROLES (Existing + Extend)     │                           │
│  │                                              │                           │
│  │  ┌─────────────────────────────────────┐     │                           │
│  │  │  PHARMACY_USER (exists ✅)            │     │                           │
│  │  │  • Full-service (processor visits)   │     │                           │
│  │  │  • Dashboard, analytics, marketplace │     │                           │
│  │  │  • View credits & payment history    │     │                           │
│  │  └─────────────────────────────────────┘     │                           │
│  │                                              │                           │
│  │  ┌─────────────────────────────────────┐     │                           │
│  │  │  SELF_SERVICE_PHARMACY 🔴 (extend)   │     │                           │
│  │  │  • Sees ONLY own store               │     │                           │
│  │  │  • Can create own returns (scan)     │     │                           │
│  │  │  • Request FedEx labels              │     │                           │
│  │  │  • Track return through lifecycle    │     │                           │
│  │  │  • View credit statements            │     │                           │
│  │  └─────────────────────────────────────┘     │                           │
│  └─────────────────────────────────────────────┘                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2.1 PHARMACY vs PROCESSOR — Clear Guide

**Who they are and how we treat them in the system.**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PHARMACY USER vs PROCESSOR USER                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  PHARMACY USER                                                        │   │
│  │  ═══════════════                                                      │   │
│  │                                                                       │   │
│  │  WHO: The pharmacy/store (your CUSTOMER).                             │   │
│  │       One account = one physical store.                               │   │
│  │                                                                       │   │
│  │  LOGS IN TO: Pharmacy Frontend (PharmAnalytics portal)               │   │
│  │  AUTH: Supabase Auth + JWT (existing)                                 │   │
│  │  DATA: Linked to ONE pharmacy row (pharmacy.id)                      │   │
│  │                                                                       │   │
│  │  WHAT THEY SEE:                                                       │   │
│  │  • Their own store only (their pharmacy_id)                          │   │
│  │  • Dashboard, documents, inventory, marketplace, subscription          │   │
│  │  • Credits and payments that belong to THEM                           │   │
│  │  • If self-service: they can create returns for their own store      │   │
│  │                                                                       │   │
│  │  WHO OWNS THE RETURN: The pharmacy. Credit goes to the pharmacy.      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  PROCESSOR USER                                                       │   │
│  │  ═══════════════                                                     │   │
│  │                                                                       │   │
│  │  WHO: Your company’s field rep (your EMPLOYEE).                        │   │
│  │       One processor visits many pharmacies.                           │   │
│  │                                                                       │   │
│  │  LOGS IN TO: Admin/Warehouse app (same as admin panel)                │   │
│  │  AUTH: Same as admin (e.g. admin table or extended auth)             │   │
│  │  DATA: Linked to processors table + processor_store_assignments      │   │
│  │                                                                       │   │
│  │  WHAT THEY SEE:                                                       │   │
│  │  • A DROPDOWN of stores they are ASSIGNED to (many pharmacies)       │   │
│  │  • They choose “which store am I at today?” → then create return     │   │
│  │  • They do NOT see other company stuff (payments, batches, etc.)      │   │
│  │                                                                       │   │
│  │  WHO OWNS THE RETURN: The pharmacy they selected. Processor is      │   │
│  │  just the person doing the data entry on behalf of that store.        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Side-by-Side Comparison

| Aspect | Pharmacy User | Processor User |
|--------|----------------|----------------|
| **Identity** | The store (customer) | Your employee (field rep) |
| **Count** | 1 user = 1 store | 1 processor = many stores (assigned) |
| **Login** | Pharmacy Frontend (pharmacy portal) | Admin/Warehouse app |
| **Auth system** | Supabase Auth (pharmacy signup/signin) | Admin-style auth (email/password, like admin) |
| **Stores they see** | Only their own store | Only stores in their assignment list |
| **Creates return for** | Themselves (if self-service) | Whichever store they select in the dropdown |
| **Return ownership** | Return belongs to the pharmacy | Return belongs to the pharmacy they chose |
| **Credit/payment** | They receive the credit | They do not; the pharmacy receives it |
| **Database** | `pharmacy` table, `refresh_tokens` (pharmacy_id) | `processors` table, `processor_store_assignments` |

### How We Treat Them in the System

```
  CREATING A RETURN — WHO DOES IT?
  ────────────────────────────────

  Option A: PROCESSOR creates return
  ─────────────────────────────────
  • Processor logs into Warehouse app.
  • Sees: "Select store" → [GlenVista Pharmacy ▼] [Health Choice Pharmacy] ...
  • Picks "GlenVista Pharmacy".
  • Clicks "Create Return Transaction" → license plate generated.
  • Scans products at GlenVista’s location.
  • Return is saved with pharmacy_id = GlenVista, processor_id = that processor.
  • GlenVista (pharmacy) will get the credit; processor is just the actor.

  Option B: PHARMACY (self-service) creates return
  ───────────────────────────────────────────────
  • Pharmacy user logs into Pharmacy Frontend.
  • No store dropdown — they ARE the store (their pharmacy_id from token).
  • Clicks "Start Return" or similar.
  • Scans their own products.
  • Return is saved with pharmacy_id = themselves, processor_id = null (or “self”).
  • They get the credit.
```

### One-Line Summary

- **Pharmacy** = the **store (customer)**; one account per store; logs into the **pharmacy portal**; returns and credits belong to them.
- **Processor** = **your employee** who visits many stores; logs into the **warehouse app**; selects which store they’re at and creates returns **on behalf of** that pharmacy; they never “own” the return or the credit.

---

## 3. COMPLETE END-TO-END RETURN LIFECYCLE FLOW

This is the **core business flow** that needs to be built — the entire journey from scanning a bottle at a pharmacy to receiving manufacturer credit.

```
══════════════════════════════════════════════════════════════════════════════
  PHASE 1: FIELD PROCESSING (At Pharmacy Store)
  Actor: PROCESSOR or SELF-SERVICE PHARMACY
══════════════════════════════════════════════════════════════════════════════

  ┌─────────────┐     ┌──────────────────┐     ┌─────────────────────────┐
  │ 1. LOGIN    │────▶│ 2. SELECT STORE  │────▶│ 3. CREATE RETURN        │
  │             │     │ (assigned only)  │     │    TRANSACTION          │
  │ Processor   │     │                  │     │                         │
  │ sees only   │     │ Dropdown of      │     │ Generate License Plate: │
  │ their stores│     │ assigned stores  │     │ MMDDYY-23HA-XXXX       │
  └─────────────┘     └──────────────────┘     │                         │
                                                │ Confirm dialog:         │
                                                │ "You are about to       │
                                                │  create Return ID..."   │
                                                │ [Yes] / [No]            │
                                                └───────────┬─────────────┘
                                                            │
                                                            ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ 4. ADDING PRODUCTS MODE (repeat for each item)                         │
  │                                                                         │
  │  ┌──────────────┐     ┌───────────────────────────────────────────┐    │
  │  │ SCAN QR CODE │────▶│ AUTO-POPULATE FIELDS:                     │    │
  │  │ (90%+ have   │     │  • NDC (11-digit)                        │    │
  │  │  QR codes)   │     │  • Proprietary Name                      │    │
  │  │              │     │  • Manufacturer                          │    │
  │  │  ─ OR ─      │     │  • Package Description                   │    │
  │  │              │     │  • Dosage / Strength / Unit               │    │
  │  │ MANUAL NDC   │     │  • Lot Number, Serial Number             │    │
  │  │ ENTRY        │     │  • Expiration Date                       │    │
  │  └──────────────┘     │  • Standard Price                        │    │
  │                        └──────────────────┬────────────────────────┘    │
  │                                           │                            │
  │                                           ▼                            │
  │  ┌────────────────────────────────────────────────────────────────┐    │
  │  │ 5. RETURN POLICY ENGINE CHECK (automatic)                      │    │
  │  │                                                                 │    │
  │  │  NDC ──▶ Lookup Labeler ID ──▶ Find Policy ──▶ Check Window    │    │
  │  │                                                                 │    │
  │  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │    │
  │  │  │ ✅ RETURNABLE     │  │ ❌ NON-RETURNABLE │  │ ❓ TBD       │ │    │
  │  │  │                  │  │                  │  │              │ │    │
  │  │  │ Within 6-mo pre  │  │ BY DATE:         │  │ No policy    │ │    │
  │  │  │ to 6-mo post     │  │ → WINE CELLAR    │  │ found.       │ │    │
  │  │  │ expiration       │  │ (store until     │  │ Needs manual │ │    │
  │  │  │                  │  │  returnable)     │  │ research.    │ │    │
  │  │  │ Check: partials  │  │                  │  │              │ │    │
  │  │  │ accepted?        │  │ BY POLICY:       │  │              │ │    │
  │  │  │                  │  │ → DESTRUCTION     │  │              │ │    │
  │  │  │                  │  │ (pills removed,  │  │              │ │    │
  │  │  │                  │  │  federal forms)  │  │              │ │    │
  │  │  └──────────────────┘  └──────────────────┘  └──────────────┘ │    │
  │  └────────────────────────────────────────────────────────────────┘    │
  │                                                                         │
  │  MANUALLY ENTER: Quantity, Return Reason (dropdown), DEA Class,        │
  │                  Memo. Can "View Policy" or "Add Price" inline.        │
  │                                                                         │
  │  [Save & Return] → item added to grid, scan next item                  │
  │  [Cancel This Item] → discard                                          │
  └─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ 6. REVIEW ALL SCANNED ITEMS (Data Grid)                                │
  │                                                                         │
  │ Columns: NDC | Name | QTY | FBS | CO | Price | Est.Value | Expires |   │
  │          Returnable | DEA | Lot | Memo | Manufacturer                   │
  │                                                                         │
  │ Actions:                                                                │
  │  [Check Pricing] — Look up missing prices (GoodRX, manual)             │
  │  [Import CSV] — Bulk import scanned data                                │
  │  [Pause Return] — Save WIP, resume later                               │
  │  [Future] — Send items to Wine Cellar                                   │
  │  [Delete Return] — Remove entire transaction (before close-out only)    │
  └──────────────────────────────────────┬──────────────────────────────────┘
                                          │
                                          ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ 7. COMPLETE & FINALIZE RETURN                                          │
  │                                                                         │
  │  [Complete Return] ──▶ Print manifests (returnable + non-returnable)   │
  │                        Enter FedEx tracking # or schedule pickup        │
  │                                                                         │
  │  [Finalize Return] ──▶ ⚠️ WARNING: "You will no longer be able to      │
  │                        edit/view this return. OK to proceed?"           │
  │                                                                         │
  │                        ☐ Print DEA Form 222 for CII items              │
  │                        ☐ Confirmation checkboxes                        │
  │                        [Yes] / [No]                                     │
  │                                                                         │
  │                        ✅ LOCKED — No further edits                      │
  │                        ✅ Data synced to warehouse system                │
  │                        ✅ FedEx label generated (self-service)           │
  └──────────────────────────────────────┬──────────────────────────────────┘
                                          │
                                          │ 📦 Physical box shipped
                                          │    via FedEx to warehouse
                                          ▼

══════════════════════════════════════════════════════════════════════════════
  PHASE 2: WAREHOUSE RECEIVING & VERIFICATION
  Actor: WAREHOUSE_STAFF
══════════════════════════════════════════════════════════════════════════════

  ┌─────────────────────────────────────────────────────────────────────────┐
  │ 8. FEDEX RECEIVING CHECK-IN                                            │
  │                                                                         │
  │  Scan FedEx tracking barcode on received box                           │
  │           │                                                             │
  │           ▼                                                             │
  │  System matches to field return record                                 │
  │           │                                                             │
  │           ▼                                                             │
  │  Set received date + Select batch month (e.g., "March 2026")           │
  │           │                                                             │
  │           ▼                                                             │
  │  Generate debit memo license plate: DEL-MMYY-ABC-XXXX                 │
  │                                                                         │
  │  "This Return Has Been Received in Full, Ready For Close-Out.          │
  │   Do You Have Other Tracking Numbers to Receive?" [Yes] [No]           │
  └──────────────────────────────────────┬──────────────────────────────────┘
                                          │
                                          ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ 9. ITEM-BY-ITEM VERIFICATION                                          │
  │                                                                         │
  │  For EACH item in the return:                                          │
  │                                                                         │
  │  ☐ Pieces count matches?                                               │
  │  ☐ Checked in?                                                         │
  │  ☐ Verified? (correct product, correct NDC)                            │
  │  ☐ Integrity confirmed?                                                │
  │     • Sealed bottle = FULL                                             │
  │     • Opened bottle = PARTIAL (adjust quantity/value)                  │
  │                                                                         │
  │  Columns: NDC | Name | Mfg | Expires | Lot | DEA | Returnable |       │
  │           FPS | QTY | Price | Value | Adj% | Store Value |             │
  │           CO Destination | CO (Y/N) | BMP (Y/N)                        │
  └──────────────────────────────────────┬──────────────────────────────────┘
                                          │
                                          ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ 10. DESTINATION ASSIGNMENT & WINE CELLAR                               │
  │                                                                         │
  │  FOR EACH VERIFIED ITEM:                                               │
  │                                                                         │
  │  ┌──────────────────┐                                                  │
  │  │ RETURNABLE       │──▶ Auto-assign destination from policy DB:       │
  │  │                  │    • INMAR (~90% of items)                       │
  │  │                  │    • QUALANEX (now Inmar-owned)                  │
  │  │                  │    • PHARMALINK (~25-30 generic vendors)         │
  │  └──────────────────┘                                                  │
  │                                                                         │
  │  ┌──────────────────┐                                                  │
  │  │ NON-RETURNABLE   │──▶ Date-based: Check Wine Cellar for newly      │
  │  │ (by date)        │    returnable items from previous months         │
  │  │                  │    → Add to current batch if now returnable      │
  │  └──────────────────┘                                                  │
  │                                                                         │
  │  ┌──────────────────┐                                                  │
  │  │ NON-RETURNABLE   │──▶ → Destruction bin (by weight)                │
  │  │ (by policy)      │    → Federal destruction form generated          │
  │  └──────────────────┘                                                  │
  │                                                                         │
  │  ┌──────────────────┐                                                  │
  │  │ TBD              │──▶ Manual research: contact manufacturer,        │
  │  │                  │    find policy, resolve classification            │
  │  └──────────────────┘                                                  │
  │                                                                         │
  │  [Print Baggy Manifests] — Per-pharmacy manifest with barcode          │
  └──────────────────────────────────────┬──────────────────────────────────┘
                                          │
                                          ▼

══════════════════════════════════════════════════════════════════════════════
  PHASE 3: MONTHLY CLOSE-OUT & RA PROCESSING
  Actor: WAREHOUSE_STAFF + SUPER_ADMIN
══════════════════════════════════════════════════════════════════════════════

  ┌─────────────────────────────────────────────────────────────────────────┐
  │ 11. MONTHLY CLOSE-OUT (Complete CO)                                    │
  │                                                                         │
  │  Status flow: Available to CO ──▶ Closed-Out ──▶ Completed             │
  │                                                                         │
  │  End of month:                                                         │
  │  1. Review all returns received this month                             │
  │  2. Resolve remaining TBD items                                        │
  │  3. Click [Complete CO]                                                │
  │  4. System generates:                                                  │
  │     • Debit memos (per pharmacy × per reverse distributor)             │
  │     • Cardinal Health upload file (single spreadsheet)                 │
  │     • Invoice per pharmacy                                             │
  │                                                                         │
  │  Batch status: Open → Closed → Submitted                               │
  └──────────────────────────────────────┬──────────────────────────────────┘
                                          │
                              ┌───────────┼───────────┐
                              ▼           ▼           ▼
               ┌──────────────────┐ ┌──────────┐ ┌───────────────┐
               │ 12a. CARDINAL    │ │ 12b.INMAR│ │ 12c.PHARMALINK│
               │ HEALTH UPLOAD    │ │ RA EMAIL │ │ ONLINE PORTAL │
               │                  │ │          │ │               │
               │ Upload single    │ │ Send per-│ │ Submit online │
               │ spreadsheet      │ │ debit-   │ │ → same-day RA │
               │ → approved ~1hr  │ │ memo     │ │               │
               │                  │ │ email    │ │               │
               │                  │ │ → 2-6wk  │ │               │
               │                  │ │ turnaround│ │               │
               └──────────────────┘ └──────────┘ └───────────────┘
                                          │
                                          ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ 13. RA TRACKING & FULFILLMENT                                          │
  │                                                                         │
  │  Per debit memo, track:                                                │
  │                                                                         │
  │  ┌─────────────┐    ┌──────────────┐    ┌─────────────┐               │
  │  │ RA REQUESTED│───▶│ RA RECEIVED  │───▶│ PRODUCT     │               │
  │  │             │    │              │    │ SHIPPED     │               │
  │  │ Date sent   │    │ RA Number    │    │             │               │
  │  │ Re-send date│    │ (BL603...)   │    │ FedEx track │               │
  │  │ Tickler date│    │ Date received│    │ Ship date   │               │
  │  │ (follow-up) │    │ Print RA PDF │    │ Destination │               │
  │  └─────────────┘    └──────────────┘    └──────┬──────┘               │
  │                                                 │                      │
  │  Workflow: Print RA paper → place in pharmacy baggy                    │
  │            → all bags for same distributor in one FedEx box             │
  │            → assign new FedEx tracking → ship                          │
  └──────────────────────────────────────┬──────────────────────────────────┘
                                          │
                                          ▼

══════════════════════════════════════════════════════════════════════════════
  PHASE 4: CREDIT COLLECTION & PHARMACY PAYMENT
  Actor: SUPER_ADMIN / MANAGER
══════════════════════════════════════════════════════════════════════════════

  ┌─────────────────────────────────────────────────────────────────────────┐
  │ 14. MANUFACTURER CREDIT TRACKING                                       │
  │                                                                         │
  │  Per manufacturer (Labeler):                                           │
  │  • # of Unpaid Debit Memos                                            │
  │  • DM Credit Requests Not Started                                     │
  │  • DM Requests Started, Not Emailed                                   │
  │  • Outstanding $$$ vs Paid $$$                                        │
  │                                                                         │
  │  Actions:                                                              │
  │  [Create Files & E-Mail] — Generate and send credit request emails     │
  │  [E-Mail DM's Not Sent] — Send pending emails                         │
  │  [Add Credit Memo] — Record received credit                           │
  │                                                                         │
  │  Key metrics:                                                          │
  │  • Ask price = full WAC (always ask for more)                         │
  │  • Avg Pay Percent: ~73.2% of WAC                                    │
  │  • Avg Days to Pay: ~297 days                                         │
  └──────────────────────────────────────┬──────────────────────────────────┘
                                          │
                                          ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ 15. PHARMACY PAYMENT                                                   │
  │                                                                         │
  │  Credit from Manufacturer                                              │
  │           │                                                             │
  │           ▼                                                             │
  │  Calculate company fee/commission                                      │
  │           │                                                             │
  │           ▼                                                             │
  │  Pharmacy payout = Credit received - Company fee                       │
  │           │                                                             │
  │           ▼                                                             │
  │  Payment methods: Wire / Check / Zell / Cash                           │
  │           │                                                             │
  │           ▼                                                             │
  │  Record: Payment date, method, reference #, amount                     │
  │           │                                                             │
  │           ▼                                                             │
  │  Generate payment statement for pharmacy                               │
  │  (pharmacy sees this on their portal)                                  │
  └─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. SYSTEM ARCHITECTURE — NEW COMPLETE SYSTEM

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              COMPLETE SYSTEM ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  FRONTENDS                                                                           │
│  ────────                                                                            │
│                                                                                      │
│  ┌──────────────────────┐  ┌─────────────────────────┐  ┌───────────────────────┐   │
│  │  ADMIN PANEL         │  │  WAREHOUSE PANEL 🔴      │  │  PHARMACY PORTAL      │   │
│  │  (Existing + Extend) │  │  (New — Same Admin App)  │  │  (Existing + Extend)  │   │
│  │                      │  │                          │  │                        │   │
│  │  /dashboard          │  │  /warehouse/dashboard    │  │  /dashboard            │   │
│  │  /pharmacies         │  │  /warehouse/returns      │  │  /returns/start 🔴     │   │
│  │  /distributors       │  │  /warehouse/returns/new  │  │  /returns/status 🔴    │   │
│  │  /marketplace        │  │  /warehouse/receiving    │  │  /credits/statement 🔴 │   │
│  │  /documents          │  │  /warehouse/wine-cellar  │  │  /products             │   │
│  │  /payments           │  │  /warehouse/batches      │  │  /optimization         │   │
│  │  /analytics          │  │  /warehouse/debit-memos  │  │  /marketplace          │   │
│  │  /admins             │  │  /warehouse/ra-tracking  │  │  /documents            │   │
│  │  /settings           │  │  /warehouse/unpaid       │  │  /subscription         │   │
│  │  /shipments 🔴       │  │  /warehouse/destruction  │  │  /inventory            │   │
│  │  /processors 🔴      │  │  /warehouse/policies     │  │  /settings             │   │
│  │  /policies 🔴        │  │  /warehouse/ndc-pricing  │  │  /notifications        │   │
│  │  /ndc-pricing 🔴     │  │  /warehouse/payments     │  │  /support              │   │
│  │                      │  │  /warehouse/processors   │  │                        │   │
│  └──────────┬───────────┘  └───────────┬──────────────┘  └──────────┬─────────────┘   │
│             │                          │                            │                 │
│             └──────────────┬───────────┘────────────────────────────┘                 │
│                            │                                                          │
│                            ▼                                                          │
│  ┌────────────────────────────────────────────────────────────────────────────────┐   │
│  │                         BACKEND API (Express + TypeScript)                      │   │
│  │                                                                                 │   │
│  │  EXISTING ROUTES (23)              NEW ROUTES (8 groups) 🔴                    │   │
│  │  ─────────────────                 ─────────────────────                        │   │
│  │  /api/auth                         /api/return-transactions                     │   │
│  │  /api/inventory                    /api/policies (manufacturer)                 │   │
│  │  /api/returns                      /api/wine-cellar                             │   │
│  │  /api/products                     /api/warehouse                               │   │
│  │  /api/optimization                 /api/batches + /api/debit-memos              │   │
│  │  /api/marketplace                  /api/pharmacy-payments                       │   │
│  │  /api/subscriptions                /api/processors                              │   │
│  │  /api/dashboard                    /api/destruction                              │   │
│  │  /api/documents                    /api/ndc-pricing                              │   │
│  │  /api/admin/*                                                                   │   │
│  │  /api/notifications                                                             │   │
│  │  /api/ndc-search                                                                │   │
│  │  ... (14 more)                                                                  │   │
│  │                                                                                 │   │
│  │  MIDDLEWARE                                                                     │   │
│  │  ──────────                                                                     │   │
│  │  authenticate (pharmacy JWT)          authenticateAdmin (admin JWT)              │   │
│  │  authenticateProcessor 🔴 (NEW)       authenticateWarehouse 🔴 (NEW)             │   │
│  │  checkPharmacyStatus                  checkProcessorStoreAccess 🔴 (NEW)        │   │
│  └────────────────────────────────────────────────────────────────────────────────┘   │
│                            │                                                          │
│                            ▼                                                          │
│  ┌────────────────────────────────────────────────────────────────────────────────┐   │
│  │                         SUPABASE (PostgreSQL)                                   │   │
│  │                                                                                 │   │
│  │  EXISTING TABLES (23)              NEW TABLES (15) 🔴                          │   │
│  │  ────────────────────              ──────────────────                           │   │
│  │  pharmacy                          manufacturer_policies                        │   │
│  │  admin                             manufacturer_return_policies                 │   │
│  │  refresh_tokens                    manufacturer_policy_notes                    │   │
│  │  reverse_distributors              non_returnable_products                      │   │
│  │  uploaded_documents                processors                                   │   │
│  │  return_reports                    processor_store_assignments                  │   │
│  │  custom_packages                   return_transactions                          │   │
│  │  custom_package_items              return_transaction_items                     │   │
│  │  product_list_items                wine_cellar                                  │   │
│  │  marketplace_deals                 return_batches                               │   │
│  │  marketplace_orders                debit_memos                                  │   │
│  │  pharmacy_cart                     debit_memo_items                             │   │
│  │  admin_settings                    pharmacy_payments                            │   │
│  │  admin_recent_activity             destruction_records                          │   │
│  │  pharmacy_inventory_uploads        ndc_price_history                            │   │
│  │  pharmacy_inventory_items                                                       │   │
│  │  inventory_reminders               EXTEND: pharmacy table 🔴                   │   │
│  │  pharmacy_notifications            (+12 new columns)                            │   │
│  └────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
│  EXTERNAL INTEGRATIONS                                                               │
│  ─────────────────────                                                               │
│  ┌────────────┐ ┌────────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐             │
│  │ Supabase   │ │ Stripe     │ │ Resend   │ │ Azure     │ │ FedEx 🔴 │             │
│  │ Auth       │ │ Payments   │ │ Email    │ │ OpenAI    │ │ API      │             │
│  │ (exists ✅) │ │ (exists ✅) │ │(exists ✅)│ │ (exists ✅)│ │ (new)    │             │
│  └────────────┘ └────────────┘ └──────────┘ └───────────┘ └──────────┘             │
│  ┌────────────┐ ┌────────────┐ ┌──────────┐                                        │
│  │ Cardinal   │ │ Inmar      │ │PharmaLink│                                        │
│  │ Health 🔴  │ │ Portal 🔴  │ │Portal 🔴 │                                        │
│  │ (file      │ │ (RA email  │ │(online RA│                                        │
│  │  upload)   │ │  + portal) │ │ submit)  │                                        │
│  └────────────┘ └────────────┘ └──────────┘                                        │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. DATABASE ENTITY RELATIONSHIP — NEW TABLES

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          NEW DATABASE ENTITY RELATIONSHIPS                           │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│                                                                                      │
│  ┌────────────────────┐                                                             │
│  │ PHARMACY (extend)  │◄──────────────────────────┐                                │
│  │ + store_number     │                           │                                │
│  │ + primary_wholesaler│                           │                                │
│  │ + service_type     │◄───┐                      │                                │
│  │ + days_between_    │    │                      │                                │
│  │   visits           │    │                      │                                │
│  │ + assigned_        │    │                      │                                │
│  │   processor_id ────┼────┼──────────────┐       │                                │
│  └──────┬─────────────┘    │              │       │                                │
│         │                  │              ▼       │                                │
│         │                  │  ┌────────────────┐  │                                │
│         │                  │  │ PROCESSORS     │  │                                │
│         │                  │  │                │  │                                │
│         │                  │  │ id, name,      │  │                                │
│         │                  │  │ email, phone,  │  │                                │
│         │                  │  │ status         │  │                                │
│         │                  │  └───────┬────────┘  │                                │
│         │                  │          │           │                                │
│         │                  │          ▼           │                                │
│         │                  │  ┌────────────────┐  │                                │
│         │                  └──│ PROCESSOR_STORE│  │                                │
│         │                     │ _ASSIGNMENTS   │  │                                │
│         │                     │ processor_id   │  │                                │
│         │                     │ pharmacy_id    │  │                                │
│         │                     └────────────────┘  │                                │
│         │                                         │                                │
│         ▼                                         │                                │
│  ┌───────────────────────┐                        │                                │
│  │ RETURN_TRANSACTIONS   │                        │                                │
│  │                       │                        │                                │
│  │ id                    │                        │                                │
│  │ license_plate (UK)    │    ┌───────────────┐   │                                │
│  │ pharmacy_id ──────────┼───▶│ PHARMACY      │   │                                │
│  │ processor_id ─────────┼───▶│               │   │                                │
│  │ batch_id ─────────────┼──┐ └───────────────┘   │                                │
│  │ status                │  │                     │                                │
│  │ fedex_tracking        │  │                     │                                │
│  │ total_items           │  │                     │                                │
│  │ total_returnable_val  │  │                     │                                │
│  │ finalized_at          │  │                     │                                │
│  │ received_in_warehouse │  │                     │                                │
│  │ verified_integrity    │  │                     │                                │
│  │ time_in, time_out     │  │                     │                                │
│  └───────┬───────────────┘  │                     │                                │
│          │                  │                     │                                │
│          │ has many         │                     │                                │
│          ▼                  │                     │                                │
│  ┌────────────────────────┐ │                     │                                │
│  │ RETURN_TRANSACTION_    │ │                     │                                │
│  │ ITEMS                  │ │                     │                                │
│  │                        │ │                     │                                │
│  │ id                     │ │                     │                                │
│  │ transaction_id ────────┼─┤                     │                                │
│  │ ndc, ndc_10            │ │                     │                                │
│  │ proprietary_name       │ │                     │                                │
│  │ manufacturer           │ │                     │                                │
│  │ dosage, strength, unit │ │                     │                                │
│  │ lot_number             │ │                     │                                │
│  │ serial_number          │ │                     │                                │
│  │ expiration_date        │ │                     │                                │
│  │ standard_price         │ │                     │                                │
│  │ quantity               │ │                     │                                │
│  │ full_package_size      │ │                     │                                │
│  │ is_partial             │ │                     │                                │
│  │ return_status ─────────┼─┤ returnable │ non_returnable │ tbd                    │
│  │ return_reason          │ │                     │                                │
│  │ destination            │ │ inmar │ qualanex │ pharmalink                        │
│  │ estimated_value        │ │                     │                                │
│  │ dea_class              │ │                     │                                │
│  │ dea_form_222           │ │                     │                                │
│  │ co_status, bmp_status  │ │                     │                                │
│  │ wine_cellar_id ────────┼─┼──────────────┐     │                                │
│  │ memo                   │ │              │     │                                │
│  └────────────────────────┘ │              ▼     │                                │
│                             │  ┌────────────────┐│                                │
│                             │  │ WINE_CELLAR    ││                                │
│                             │  │                ││                                │
│                             │  │ pharmacy_id    ││                                │
│                             │  │ item_id        ││                                │
│                             │  │ ndc            ││                                │
│                             │  │ expected_      ││                                │
│                             │  │ returnable_date││                                │
│                             │  │ status:        ││                                │
│                             │  │  shelved │     ││                                │
│                             │  │  ready │       ││                                │
│                             │  │  returned │    ││                                │
│                             │  │  destroyed     ││                                │
│                             │  └────────────────┘│                                │
│                             │                     │                                │
│                             ▼                     │                                │
│  ┌────────────────────┐    ┌────────────────────┐ │                                │
│  │ RETURN_BATCHES     │◄───│ RETURN_TRANSACTIONS│ │                                │
│  │                    │    └────────────────────┘ │                                │
│  │ batch_month        │                           │                                │
│  │ batch_name         │                           │                                │
│  │ status: open │     │                           │                                │
│  │  closed │ submitted│                           │                                │
│  │ cardinal_submitted │                           │                                │
│  └───────┬────────────┘                           │                                │
│          │                                        │                                │
│          │ has many                               │                                │
│          ▼                                        │                                │
│  ┌─────────────────────┐                          │                                │
│  │ DEBIT_MEMOS         │                          │                                │
│  │                     │                          │                                │
│  │ batch_id            │                          │                                │
│  │ pharmacy_id ────────┼──────────────────────────┘                                │
│  │ memo_number (UK)    │                                                           │
│  │ destination         │                                                           │
│  │ labeler_id ─────────┼───────────────────────────────┐                           │
│  │ ra_number           │                               │                           │
│  │ ra_requested_at     │                               │                           │
│  │ ra_received_at      │                               │                           │
│  │ tickler_date        │                               │                           │
│  │ baggie_manifest     │                               │                           │
│  │ outbound_tracking   │                               │                           │
│  │ payment_status      │                               ▼                           │
│  │ amount_requested    │                   ┌─────────────────────────┐             │
│  │ amount_received     │                   │ MANUFACTURER_POLICIES   │             │
│  └───────┬─────────────┘                   │                         │             │
│          │                                 │ labeler_id (UK)         │             │
│          │ has many                        │ labeler_type            │             │
│          ▼                                 │ manufacturer_name       │             │
│  ┌─────────────────────┐                   │ credit_request_email    │             │
│  │ DEBIT_MEMO_ITEMS    │                   │ avg_pay_percent (73.2%) │             │
│  │                     │                   │ avg_days_to_pay (297)   │             │
│  │ debit_memo_id       │                   └─────────┬───────────────┘             │
│  │ transaction_item_id │                             │                             │
│  │ ndc                 │                             │ has many                    │
│  │ ask_price (WAC)     │                             ▼                             │
│  │ received_price      │                   ┌─────────────────────────┐             │
│  └─────────────────────┘                   │ MANUFACTURER_RETURN_    │             │
│                                            │ POLICIES                │             │
│  ┌─────────────────────┐                   │                         │             │
│  │ PHARMACY_PAYMENTS   │                   │ destination             │             │
│  │                     │                   │ auto_ra_email           │             │
│  │ pharmacy_id         │                   │ policy_number           │             │
│  │ batch_id            │                   │ policy_description      │             │
│  │ total_credit        │                   │ discount_rate (50%)     │             │
│  │ company_fee         │                   │ partials_accepted       │             │
│  │ pharmacy_payout     │                   │ reimbursement_type      │             │
│  │ payment_method      │                   └─────────────────────────┘             │
│  │ (wire/check/zell)   │                                                           │
│  │ paid_at             │                   ┌─────────────────────────┐             │
│  └─────────────────────┘                   │ NON_RETURNABLE_PRODUCTS │             │
│                                            │ (exceptions per mfg)    │             │
│  ┌─────────────────────┐                   │ ndc, product_name       │             │
│  │ DESTRUCTION_RECORDS │                   └─────────────────────────┘             │
│  │                     │                                                           │
│  │ pharmacy_id         │                   ┌─────────────────────────┐             │
│  │ item_id             │                   │ NDC_PRICE_HISTORY       │             │
│  │ ndc                 │                   │                         │             │
│  │ weight_lbs          │                   │ ndc, ndc_10             │             │
│  │ federal_form_number │                   │ current_price           │             │
│  │ destruction_company │                   │ est_store_price (~50%)  │             │
│  └─────────────────────┘                   │ price_source            │             │
│                                            │ close_out_destination   │             │
│                                            │ old_price → new_price   │             │
│                                            └─────────────────────────┘             │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. RETURN POLICY ENGINE — Decision Tree

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RETURN POLICY ENGINE — DECISION FLOW                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  INPUT: Scanned product (NDC + Expiration Date)                            │
│                                                                             │
│  Step 1: Extract Labeler ID from NDC                                       │
│  ────────────────────────────────                                          │
│  NDC: 43547-0325-06 → Labeler ID: 43547                                   │
│                                                                             │
│  Step 2: Lookup manufacturer policy                                        │
│  ──────────────────────────────────                                        │
│          │                                                                  │
│          ├──▶ Policy FOUND                                                 │
│          │    │                                                             │
│          │    ├──▶ Check: Is this specific NDC in non_returnable_products? │
│          │    │    │                                                        │
│          │    │    ├──▶ YES → ❌ NON-RETURNABLE (by policy)                 │
│          │    │    │         → Destination: DESTRUCTION                     │
│          │    │    │         → "This product is never returnable"           │
│          │    │    │                                                        │
│          │    │    └──▶ NO → Continue to Step 3                            │
│          │    │                                                             │
│          │    └──▶ Step 3: Check expiration against return window          │
│          │         │                                                        │
│          │         │  Policy window example:                               │
│          │         │  "6 Months Prior to 12 Months Post Expiration"        │
│          │         │                                                        │
│          │         │  Today: March 2026                                    │
│          │         │  Product expires: November 2025                       │
│          │         │                                                        │
│          │         │  Window start: May 2025 (6mo before exp)             │
│          │         │  Window end:   November 2026 (12mo after exp)        │
│          │         │                                                        │
│          │         ├──▶ WITHIN WINDOW → ✅ RETURNABLE                       │
│          │         │    │                                                   │
│          │         │    └──▶ Check: is_partial AND partials_accepted?      │
│          │         │         ├── YES → ✅ Returnable (check dosage form)    │
│          │         │         │   Tablets/capsules/soft gels = OK           │
│          │         │         │   Creams/suspensions/ointments = ❌ NO       │
│          │         │         └── NO (partial not accepted) → ❌             │
│          │         │                                                        │
│          │         ├──▶ BEFORE WINDOW (not yet in window)                  │
│          │         │    → ❌ NON-RETURNABLE (by date)                       │
│          │         │    → 🍷 WINE CELLAR                                   │
│          │         │    → expected_returnable_date = window_start          │
│          │         │    → "This product will become returnable in [MONTH]" │
│          │         │                                                        │
│          │         └──▶ AFTER WINDOW (past return deadline)                │
│          │              → ❌ NON-RETURNABLE (expired past window)           │
│          │              → Destination: DESTRUCTION                          │
│          │                                                                  │
│          └──▶ Policy NOT FOUND                                             │
│               → ❓ TBD (To Be Determined)                                   │
│               → Needs manual research                                      │
│               → Contact manufacturer for policy                            │
│                                                                             │
│  OUTPUT:                                                                    │
│  ┌──────────┬───────────────────┬───────────────────────┐                  │
│  │ Status   │ Destination       │ Action                │                  │
│  ├──────────┼───────────────────┼───────────────────────┤                  │
│  │RETURNABLE│ Inmar/Qualanex/   │ Add to return batch   │                  │
│  │          │ PharmaLink        │ (from policy DB)      │                  │
│  ├──────────┼───────────────────┼───────────────────────┤                  │
│  │NON-RET.  │ Wine Cellar       │ Store until window    │                  │
│  │(by date) │                   │ opens, monthly check  │                  │
│  ├──────────┼───────────────────┼───────────────────────┤                  │
│  │NON-RET.  │ Destruction Bin   │ Remove pills, weigh,  │                  │
│  │(by policy│                   │ federal forms          │                  │
│  ├──────────┼───────────────────┼───────────────────────┤                  │
│  │TBD       │ Hold              │ Manual research needed │                  │
│  └──────────┴───────────────────┴───────────────────────┘                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. MONEY & PRODUCT FLOW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MONEY & PRODUCT FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PRODUCT FLOW (Physical goods):                                            │
│  ──────────────────────────────                                            │
│                                                                             │
│  PHARMACY          PROCESSOR/         WAREHOUSE         REVERSE            │
│  (Store)           SELF-SERVICE       (HQ - Cohoes)     DISTRIBUTOR        │
│     │                  │                   │               │                │
│     │  Expired/excess  │                   │               │                │
│     │  medications     │                   │               │                │
│     ├─────────────────▶│                   │               │                │
│     │  Scanned &       │                   │               │                │
│     │  classified      │  📦 FedEx ship    │               │                │
│     │                  ├──────────────────▶│               │                │
│     │                  │                   │  Received,    │                │
│     │                  │                   │  verified,    │                │
│     │                  │                   │  batched      │                │
│     │                  │                   │               │                │
│     │                  │                   │  📦 FedEx ship│                │
│     │                  │                   │  (per reverse │                │
│     │                  │                   │  distributor) │                │
│     │                  │                   ├──────────────▶│                │
│     │                  │                   │               │  Forward to    │
│     │                  │                   │               │  MANUFACTURER  │
│     │                  │                   │               ├──────────────▶ │
│                                                                             │
│  MONEY FLOW (Credits & Payments):                                          │
│  ────────────────────────────────                                          │
│                                                                             │
│  MANUFACTURER      REVERSE           COMPANY            PHARMACY           │
│                    DISTRIBUTOR        (PharmAnalytics)   (Store)            │
│     │                │                   │                  │               │
│     │  Credit memo   │                   │                  │               │
│     │  (avg 73.2%    │                   │                  │               │
│     │   of WAC)      │                   │                  │               │
│     ├───────────────▶│                   │                  │               │
│     │                │  Pass-through     │                  │               │
│     │                ├──────────────────▶│                  │               │
│     │                │                   │                  │               │
│     │                │                   │  Deduct company  │               │
│     │                │                   │  fee/commission  │               │
│     │                │                   │                  │               │
│     │                │                   │  💰 Wire/Check/  │               │
│     │                │                   │  Zell payment    │               │
│     │                │                   ├─────────────────▶│               │
│     │                │                   │                  │               │
│     │                │                   │  Pharmacy sees   │               │
│     │                │                   │  "estimated store│               │
│     │                │                   │  price" (~50% of │               │
│     │                │                   │  WAC)            │               │
│                                                                             │
│  KEY METRICS:                                                              │
│  ────────────                                                              │
│  • WAC Price asked: 100%                                                   │
│  • Avg manufacturer pays: ~73.2% of WAC                                   │
│  • Estimated store price: ~50% of current price                            │
│  • Avg days to receive payment: ~297 days                                  │
│  • Discount rate per manufacturer: varies (e.g., 50%)                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. IMPLEMENTATION PHASES — VISUAL ROADMAP

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        IMPLEMENTATION ROADMAP                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WEEK  1────2────3────4────5────6────7────8────9────10───11───12───12+     │
│                                                                             │
│  ┌──────────────────┐                                                      │
│  │ PHASE 1:         │  🔴 FOUNDATION                                       │
│  │ FOUNDATION       │                                                      │
│  │                  │  • 15 new database tables                            │
│  │ Weeks 1-3       │  • Extend pharmacy schema (+12 columns)              │
│  │                  │  • Manufacturer policy DB + admin UI                 │
│  │                  │  • Processor role system                             │
│  │                  │  • Wine Cellar tables                                │
│  │                  │  • Batch management tables                           │
│  │                  │  • Return transaction tables                         │
│  └──────────────────┘                                                      │
│         │                                                                   │
│         ▼                                                                   │
│         ┌──────────────────────────┐                                       │
│         │ PHASE 2:                 │  🔴 PROCESSOR WORKFLOW                 │
│         │ PROCESSOR WORKFLOW       │                                       │
│         │                          │  • Return transaction creation         │
│         │ Weeks 3-6               │  • Adding Products Mode form           │
│         │                          │  • QR/barcode scanning + policy engine │
│         │                          │  • Product list grid view              │
│         │                          │  • Check Pricing / View Policy         │
│         │                          │  • Complete + Finalize return          │
│         │                          │  • Manifest PDF generation             │
│         │                          │  • Wine Cellar entry workflow          │
│         └──────────────────────────┘                                       │
│                    │                                                        │
│                    ▼                                                        │
│                    ┌──────────────────────────┐                             │
│                    │ PHASE 3:                 │  🔴 WAREHOUSE OPS           │
│                    │ WAREHOUSE WORKFLOW       │                             │
│                    │                          │  • FedEx receiving check-in │
│                    │ Weeks 6-9               │  • Verification checklist   │
│                    │                          │  • Batch + debit memo gen   │
│                    │                          │  • Destination assignment   │
│                    │                          │  • Baggy manifest printing  │
│                    │                          │  • Wine Cellar monthly cron │
│                    └──────────────────────────┘                             │
│                               │                                            │
│                               ▼                                            │
│                               ┌──────────────────────────┐                 │
│                               │ PHASE 4:                 │ 🔴 FINANCIAL    │
│                               │ CLOSE-OUT & RA           │                 │
│                               │                          │ • Monthly CO    │
│                               │ Weeks 9-12              │ • Cardinal file │
│                               │                          │ • RA email sys  │
│                               │                          │ • RA tracking   │
│                               │                          │ • Unpaid DM's   │
│                               │                          │ • Pharm payments│
│                               │                          │ • Ask vs Receive│
│                               └──────────────────────────┘                 │
│                                          │                                 │
│                                          ▼                                 │
│                                  ┌──────────────────┐                      │
│                                  │ PHASE 5:         │  🟡 ENHANCEMENTS     │
│                                  │ ENHANCEMENTS     │                      │
│                                  │                  │  • FedEx API          │
│                                  │ Weeks 12+       │  • Destruction forms  │
│                                  │                  │  • GPO management     │
│                                  │                  │  • Bulk payments      │
│                                  │                  │  • NDC DB integration │
│                                  │                  │  • DEA compliance     │
│                                  │                  │  • Real-time sync     │
│                                  └──────────────────┘                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. WHAT NEEDS TO BE UPDATED IN EXISTING CODE

### Backend Updates Required

```
┌──────────────────────────────────────────────────────────────────────┐
│                    EXISTING CODE UPDATES NEEDED                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  AUTH SYSTEM                                                          │
│  ───────────                                                          │
│  ☐ Add processor role to authentication                              │
│  ☐ Add warehouse_staff role to authentication                        │
│  ☐ Add sales_rep role to authentication                              │
│  ☐ New middleware: authenticateProcessor                              │
│  ☐ New middleware: authenticateWarehouse                              │
│  ☐ New middleware: checkProcessorStoreAccess                         │
│  ☐ Extend admin login to handle new role types                       │
│  ☐ Role-based route guards for all new endpoints                     │
│                                                                       │
│  DATABASE                                                             │
│  ────────                                                             │
│  ☐ 15 new tables (see Section 5)                                     │
│  ☐ Extend pharmacy table (+12 columns)                               │
│  ☐ New RPC functions for complex queries                             │
│  ☐ Database indexes for performance                                  │
│  ☐ Row-level security policies for processor access                  │
│                                                                       │
│  BACKEND API                                                          │
│  ───────────                                                          │
│  ☐ 8 new route groups (~60+ new endpoints)                           │
│  ☐ 8+ new controllers                                                │
│  ☐ 8+ new services                                                   │
│  ☐ Extend existing barcode service for QR scanning                   │
│  ☐ PDF generation service (manifests, debit memos, DEA forms)        │
│  ☐ Email templates for RA requests                                   │
│  ☐ New cron job: Wine Cellar monthly check                           │
│  ☐ Extend Swagger docs for all new endpoints                        │
│                                                                       │
│  ADMIN PANEL                                                          │
│  ───────────                                                          │
│  ☐ New sidebar section: "Warehouse"                                  │
│  ☐ ~18 new pages (see Section 4)                                     │
│  ☐ ~10 new Redux slices                                              │
│  ☐ New API service functions                                         │
│  ☐ Extend Sidebar with warehouse navigation                          │
│  ☐ Extend ProtectedRoute for role-based access                       │
│  ☐ Wire up existing Shipments page (currently mock)                  │
│  ☐ Processor management page                                        │
│  ☐ Policy management page with CRUD                                 │
│                                                                       │
│  PHARMACY FRONTEND                                                    │
│  ──────────────────                                                   │
│  ☐ Self-service return creation flow (/returns/start)                │
│  ☐ Return lifecycle tracking (/returns/status)                       │
│  ☐ Credit statement view (/credits/statement)                        │
│  ☐ Wire up existing warehouse pages (currently mock)                 │
│  ☐ Wire up existing credits page (currently mock)                    │
│  ☐ Wire up existing analytics page (currently mock)                  │
│  ☐ Wire up existing reports page (currently mock)                    │
│  ☐ Extend settings with service type, wholesaler info                │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 10. NUMBERS SUMMARY

```
┌──────────────────────────────────────────────────────────────────────┐
│                         BY THE NUMBERS                                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  EXISTING SYSTEM                    NEW SYSTEM (to build)             │
│  ───────────────                    ─────────────────────             │
│                                                                       │
│  Backend:                           Backend:                          │
│  • 31 controllers                   • 8+ new controllers              │
│  • 34 services                      • 8+ new services                 │
│  • 23 DB tables                     • 15 new DB tables                │
│  • 30+ API routes                   • ~60+ new API endpoints          │
│  • 2 auth middleware                • 3 new auth middleware            │
│  • 1 cron job                       • 1 new cron job                  │
│                                                                       │
│  Admin Panel:                       Admin Panel:                      │
│  • 14 pages                         • ~18 new pages                   │
│  • 11 Redux slices                  • ~10 new Redux slices            │
│                                                                       │
│  Pharmacy Frontend:                 Pharmacy Frontend:                │
│  • 40 pages (8 mock)                • 3 new pages                     │
│                                     • 4 pages to wire up              │
│                                                                       │
│  Roles:                             New Roles:                        │
│  • super_admin                      • processor                       │
│  • manager                          • warehouse_staff                 │
│  • reviewer                         • sales_rep                       │
│  • support                          • self_service_pharmacy           │
│  • pharmacy_user                    • gpo_admin (future)              │
│                                                                       │
│  External Integrations:             New Integrations:                 │
│  • Supabase Auth                    • FedEx API                       │
│  • Stripe                           • Cardinal Health                 │
│  • Resend Email                     • Inmar Portal                    │
│  • Azure OpenAI                     • PharmaLink Portal               │
│                                                                       │
│  Timeline: ~12+ weeks (5 phases)                                      │
│  Complexity: HIGH — complete operational engine                       │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```
