# Implementation Tasks — PharmAnalytics

> Concise overview of all features and tasks we are going to build.
> For full details see `NEXT_STEPS_ACTION_PLAN.md`.

---

## Features to Build

### 🔴 Critical (Must-Have)

1. **Processor Return Creation Workflow** — Scan products, classify returnable/non-returnable/TBD, create return shipment
2. **License Plate Number Generation** — Unique transaction IDs (format: `MMDDYY-23HA-XXXX`)
3. **Adding Products Mode** — Item entry form with barcode scan, manual NDC entry, View Policy, Add Price, DEA Form 222 flag
4. **Return Policy Engine** — Auto-classify products based on manufacturer return policies (6-6, 6-12 windows, partials, exceptions)
5. **Wine Cellar System** — Track deferred returns stored until they enter the returnable window
6. **Warehouse Receiving & Check-In** — Scan FedEx tracking, verify contents, assign to monthly batch
7. **Batch Management & Monthly Close-Out** — Aggregate all store returns, generate debit memos, submit to Cardinal
8. **Debit Memo Generation** — Per pharmacy, per reverse distributor, per batch
9. **RA (Return Authorization) Request System** — Send RA request emails to Inmar/Qualanex/PharmaLink, track responses
10. **RA Tracking & Fulfillment** — Track RA lifecycle: requested → received → shipped → credit received (with tickler dates)
11. **Cardinal Health File Upload** — Generate monthly spreadsheet in Cardinal's required format
12. **Manufacturer/Labeler Policy Database** — Master DB of all manufacturer return policies, pay metrics, discount rates, notes

### 🟡 High Priority

13. **NDC Pricing Management** — Dual 11/10-digit lookup, price sources, estimated store price, close-out destination, price history
14. **Store/Pharmacy Onboarding & Management** — Wholesaler, service type, processor assignment, visit scheduling, store numbers
15. **Pharmacy Payment Tracking** — Record wire/check/Zell/cash payments to pharmacies per batch
16. **Debit Memo Payment Tracking** — Track unpaid memos, credit requests, follow-ups, manufacturer payment collection
17. **FedEx Label Generation & Shipping** — Generate labels, track inbound/outbound shipments
18. **Destruction Tracking** — Non-returnable item destruction with federal forms
19. **Product Verification Workflow** — Integrity check: pieces count, verified, confirmed
20. **DEA Controlled Substance Handling** — DEA Form 222 printing for Schedule II (CII) items

### 🟢 Medium Priority

21. **GPO/Buying Group Management** — White-label tabs, rebate tracking per GPO
22. **Processor/Sales Rep Management** — Processor profiles, store assignments
23. **Wine Cellar Monthly Auto-Check Cron** — Surface newly returnable items each month
24. **Automatic FedEx Pickup Scheduling** — Automated pickup at pharmacies and warehouse

### 🔵 Future

25. **Direct Manufacturer Returns** — Bypass reverse distributors for high-volume manufacturers
26. **EDI Integration** — Electronic Data Interchange with distributors
27. **Commercial NDC Database Integration** — External pricing + policy data (~$7-8K/year)
28. **Automated Wire Payment System** — Bulk-pay hundreds of pharmacies at once
29. **Real-Time Sync** — WebSocket/SSE for field-to-warehouse live data

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1–3)
- [ ] Build manufacturer/labeler policy database (schema + admin UI + CRUD)
- [ ] Extend pharmacy/store schema (wholesaler, service type, processor, visit scheduling, store number)
- [ ] Create processor/user role system (assigned stores, permissions)
- [ ] Create Wine Cellar tables
- [ ] Create batch management tables
- [ ] Create return transaction tables + license plate generation

### Phase 2: Processor Workflow (Weeks 3–6)
- [ ] Build return transaction creation flow (select store → generate license plate → confirm)
- [ ] Build Adding Products Mode form (scan barcode / manual NDC → fill fields → classify → save)
- [ ] Integrate QR/barcode scanning with policy engine (auto-classify)
- [ ] Build product list view (grid with all columns matching legacy)
- [ ] Build "Check Pricing" feature
- [ ] Build "View Policy" inline lookup per item
- [ ] Build "Complete Return" + "Finalize Return" flow (manifests, FedEx tracking, lock)
- [ ] Build report/manifest PDF generation
- [ ] Build Wine Cellar entry workflow

### Phase 3: Warehouse Workflow (Weeks 6–9)
- [ ] Build warehouse receiving check-in (scan FedEx → match → received date)
- [ ] Build verification checklist (pieces, integrity, confirmed)
- [ ] Build batch assignment + debit memo number generation
- [ ] Build destination assignment (auto from policy + manual override)
- [ ] Build baggy manifest printing with barcode
- [ ] Build Wine Cellar monthly review cron
- [ ] Build "Add from Wine Cellar" feature

### Phase 4: Close-Out & RA (Weeks 9–12)
- [ ] Build monthly close-out (Complete CO → generate all debit memos)
- [ ] Build Cardinal Health upload file generation
- [ ] Build RA request email system (per debit memo per distributor)
- [ ] Build RA tracking dashboard (with tickler dates, re-send, follow-up)
- [ ] Build outbound shipment management (group baggies by destination)
- [ ] Build unpaid debit memo tracking dashboard
- [ ] Build pharmacy payment tracking (record payments, generate statements)
- [ ] Build ask-vs-receive analysis (per manufacturer pricing analytics)

### Phase 5: Enhancements (Weeks 12+)
- [ ] FedEx API integration (labels, pickups, tracking)
- [ ] Destruction tracking with federal forms
- [ ] GPO/Buying group management
- [ ] Automated wire payment system
- [ ] Commercial NDC database integration
- [ ] DEA controlled substance workflow (cage, compliance)
- [ ] Real-time sync (WebSocket/SSE)

---

## New Database Tables Needed

1. `manufacturer_policies` — Labeler ID, type, name, contacts, pay metrics
2. `manufacturer_return_policies` — Destination, auto RA email, policy #, discount rate, partials, reimbursement type
3. `manufacturer_policy_notes` — Dated notes with author initials
4. `non_returnable_products` — NDC-level exceptions per manufacturer
5. `processors` — Field rep profiles
6. `processor_store_assignments` — Which processor handles which stores
7. `return_transactions` — License plate, pharmacy, batch, status, verification, time tracking
8. `return_transaction_items` — NDC, drug details, pricing, classification, DEA class, memo
9. `wine_cellar` — Deferred items with expected returnable date
10. `return_batches` — Monthly batches, Cardinal submission tracking
11. `debit_memos` — Per pharmacy per destination, RA tracking, payment tracking
12. `debit_memo_items` — Line items on each debit memo
13. `pharmacy_payments` — Payments to pharmacies (method, amount, reference)
14. `destruction_records` — Non-returnable items, federal forms
15. `ndc_price_history` — Price changes, sources, reimbursements

**Extend existing:** `pharmacy` table (+wholesaler, store number, fax, visit scheduling, sales person, service type)

---

## Data Needed From Client

- [ ] Manufacturer policy spreadsheet (Josephine — ~100 done, hundreds remaining)
- [ ] Cardinal Health upload file format/example
- [ ] RA email samples (Inmar, Colonex, PharmaLink)
- [ ] Debit memo example (digital copy)
- [ ] QR code sample photos
- [ ] 10 NDC price samples (5 brand + 5 generic)
- [ ] March close-out process recording (Josephine)
- [ ] Commercial NDC database vendor info (Joe)
