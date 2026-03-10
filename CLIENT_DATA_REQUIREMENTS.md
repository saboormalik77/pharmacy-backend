# Client Data Requirements & Questions

> Questions for client with specific reasons why we need each piece of data for development.

---

## Immediate Development Needs (📅 Required within 1-2 weeks)

### 1. Manufacturer Return Policies Database
**Question:** Can you provide the manufacturer policy spreadsheet Josephine has been building (~100 entries completed)?

**Why we need it:**
- Core business logic for auto-classifying products as Returnable/Non-Returnable/TBD
- We can build the policy engine with mock data, but need real policies for accurate testing
- Determines which reverse distributor to use (Inmar/Qualanex/PharmaLink)
- Essential for calculating expected returnable dates for Wine Cellar items

**Format needed:** Excel/CSV with columns: Labeler ID, Manufacturer Name, Return Window (6-6 or 6-12), Partials Accepted (Y/N), Destination, Notes

---

### 2. Cardinal Health File Format
**Question:** Can you provide an example of the monthly spreadsheet file you upload to Cardinal Health? (from any previous month)

**Why we need it:**
- **Blocking Phase 4 development** — we can't build the Cardinal export without knowing exact column headers, data format, file structure
- Prevents having to rebuild this feature when we get the format later
- Cardinal approves files within 1 hour, so format must be exact

**Format needed:** Actual Excel/CSV file from previous month's close-out

---

### 3. QR Code Sample Photos
**Question:** Can you send 3-5 photos of actual QR codes on prescription bottles?

**Why we need it:**
- **Blocking Adding Products Mode development** — need to test QR scanning integration
- Must understand data structure inside QR codes (NDC format, lot number format, expiration date format, price format)
- Different manufacturers may use different QR formats
- Critical for auto-populating the Adding Products Mode form

**Format needed:** High-resolution photos showing QR codes clearly + the bottle labels

---

## Phase 3-4 Development Needs (📅 Required within 4-6 weeks)

### 4. RA (Return Authorization) Email Examples
**Question:** Can you forward examples of RA request emails and RA response emails from each reverse distributor?

**Why we need it:**
- **Required for Phase 4 RA system** — we need exact email templates, subject lines, recipient addresses
- Each distributor (Inmar/Qualanex/PharmaLink) likely has different format requirements
- Need to understand RA number format for parsing responses
- Email automation depends on following their exact format

**What we need:**
- 2-3 Inmar RA request emails you sent + their RA response emails
- 2-3 Qualanex RA request emails you sent + their RA response emails  
- 2-3 PharmaLink RA request emails you sent + their RA response emails
- Email addresses for sending RA requests to each distributor

---

### 5. Debit Memo Examples
**Question:** Can you provide digital copies of 3-5 debit memos you've generated for manufacturers?

**Why we need it:**
- **Required for Phase 4** — need to understand debit memo format and content
- Must match exactly what manufacturers expect to receive
- Need to see RFDM, CMOF, and other tracking codes in context
- PDF generation template depends on matching current format

**Format needed:** PDF copies of actual debit memos (can redact sensitive pharmacy names if needed)

---

### 6. Manifest/Baggy Printout Examples
**Question:** Can you scan/photograph the manifests you print for pharmacy baggies?

**Why we need it:**
- **Required for Phase 3-4** — PDF generation for baggy manifests
- Need barcode format, layout, required fields
- Must match what warehouse expects for scanning
- Different from debit memos — these go in physical baggies

**Format needed:** High-resolution scan of actual manifest printouts

---

## Validation & Testing Data (📅 Required within 3-4 weeks)

### 7. NDC Pricing Samples for Testing
**Question:** Can you provide 10 specific NDC numbers with their current pricing data?

**Why we need it:**
- **Validation of NDC pricing system** — need real data to test price lookup, estimated store price calculations
- Must verify our price source integration works correctly
- Need to test dual 11-digit/10-digit NDC format handling
- Understanding price differential between "current price" vs "estimated store price"

**What we need:**
- 5 brand-name drugs: NDC, current price, estimated store price, price source, last update date
- 5 generic drugs: NDC, current price, estimated store price, price source, last update date

---

### 8. Store/Pharmacy Data for Testing  
**Question:** Can you provide a list of 10-20 test pharmacies for development?

**Why we need it:**
- **Testing processor workflow** — need realistic store data for return transaction testing
- Must test store number generation, wholesaler assignment, visit scheduling
- Validation of service type assignments (In-Store/Self/FedEx Express)
- Need variety of wholesalers (Cardinal, McKesson, H.D. Smith, etc.)

**Format needed:** Store name, address, phone, wholesaler, account #, service type, assigned processor, DEA #

---

## Process Recording & Documentation (📅 Required within 6-8 weeks)

### 9. March 2026 Close-Out Process Recording
**Question:** Can you record the complete March close-out process from start to finish?

**Why we need it:**
- **Final validation of Phase 4** — ensure our automated system matches your exact manual process
- Catch edge cases and business rules not visible in screenshots
- Understand timing, sequence, and decision points in close-out
- Validate our Cardinal file generation matches what you actually submit

**Format needed:** Screen recording of complete March 2026 close-out process

---

### 10. Physical Policy Binders Digitization
**Question:** Can we prioritize the top 250 manufacturers by dollar volume from Joe's physical binders?

**Why we need it:**
- **Long-term policy database completion** — Josephine's spreadsheet covers ~100, but need hundreds more
- Focus on highest-impact manufacturers first (80/20 rule)
- Prevents having to manually research policies during production use
- Core business logic depends on comprehensive policy coverage

**What we need:** Joe to identify top 250 manufacturers by revenue, then either:
- Ship binders for scanning, or
- Have someone digitize key pages into the spreadsheet format

---

## Integration Research (📅 Required within 8-10 weeks)

### 11. Commercial NDC Database Vendor Research
**Question:** Can Joe research the commercial NDC database vendor he mentioned (~$7-8K/year)?

**Why we need it:**
- **Potential Phase 5 integration** — might replace manual policy management
- Could include both pricing data AND return policies
- Significant time-saver if it covers manufacturer policies we need
- Need to evaluate cost vs. building everything manually

**What we need:** Vendor name, contact info, data coverage details, API availability, pricing

---

### 12. FedEx Integration Details  
**Question:** Can you connect us with Bahir's FedEx discount contact for API access?

**Why we need it:**
- **Phase 5 enhancement** — automated label generation and tracking
- Potentially significant cost savings on shipping
- Need API access level and integration requirements
- Must understand rate structure for budgeting

**What we need:** Contact info for Bahir's FedEx contact, introduction for API access discussion

---

---

## Existing Data Audit (`pahrmacy data/` folder)

> **Analysis of files already in the project's `pahrmacy data/` folder.**
> **Result: None of the 12 client data requirements are satisfied. All items still need to be requested from the client.**

### What the folder DOES contain (valuable for development):

| File | Content | Useful For |
|------|---------|------------|
| `entity realtionship diagram.svg` | Full ER diagram with 13+ entities, ALL field names, types, PKs/FKs, enum values | **Database schema design** — matches & validates our proposed tables |
| `workflow diagram.svg` | Complete 4-phase business process (41+ steps) | **Workflow engine** — exact step sequence for all phases |
| `runability deciosin tree.svg` | Complete returnability decision algorithm with dosage form categories | **Policy engine** — exact classification logic |
| `portal architecture.svg` | Full module breakdown: 7 Processing, 8 Warehouse, 7 Master Data, 6 Financial, 6 Pharmacy Portal, 6 External Integrations | **System architecture** — validates our module design |
| `moneyproduct flow.svg` | End-to-end money/product flow with metrics (73.2% WAC avg credit, 297 days avg payment) | **Financial calculations** — exact business metrics |
| `sample_inventory_truemed app.csv` | 12 rows of mock inventory data (NDC, Product Name, Manufacturer, Full, Partial, Expiration, Lot, Cost) | **CSV import template** — but data is mock (all same price $45.99) |
| `retrurn reports/*.pdf` | 2 return report PDFs (binary — can't read in code) | **Potentially useful** — may contain real NDC/pricing data if opened manually |
| `Returns_Business_Analysis_v2.pages` | Apple Pages business analysis document | **Business context** — can't be read programmatically |
| `screenshots/` | 17 meeting screenshots (same as previously analyzed) | **Already analyzed** — incorporated into NEXT_STEPS_ACTION_PLAN.md |

### Cross-reference: Requirements vs. Available Data

| # | Requirement | Found? | Notes |
|---|-------------|--------|-------|
| 1 | Manufacturer Return Policies | ❌ NO | ER diagram shows LABELER table structure but no actual policy data |
| 2 | Cardinal Health File Format | ❌ NO | Still **BLOCKING** |
| 3 | QR Code Sample Photos | ❌ NO | Still **BLOCKING** |
| 4 | RA Email Examples | ❌ NO | ER model shows RA_REQUEST table but no example emails |
| 5 | Debit Memo Examples | ❌ NO | ER model shows DEBIT_MEMO table but no example PDFs |
| 6 | Manifest/Baggy Printout Examples | ❌ NO | — |
| 7 | NDC Pricing Samples | ⚠️ PARTIAL | CSV has NDC numbers (60219-1748-02, etc.) but all fake pricing ($45.99) |
| 8 | Store/Pharmacy Data | ⚠️ PARTIAL | ER model shows exact STORE table fields but no actual store data |
| 9 | March Close-Out Recording | ❌ NO | Future action |
| 10 | Policy Binders Digitization | ❌ NO | — |
| 11 | NDC Database Vendor | ❌ NO | — |
| 12 | FedEx Integration | ❌ NO | — |

### Key Discovery: ER Diagram Entities (exact fields from diagram)

The entity relationship diagram defines these tables with complete field specifications:

- **STORE** — store_id (PK), store_name, address, dea_number, dea_expiration, wholesaler_id (FK), wholesaler_account, service_type (Full|Self|Express), days_between_visits
- **RETURN_TRANSACTION** — return_id (PK), license_plate (UK, MMDDYY-nnHA-SSSS), store_id (FK), batch_id (FK), return_date, fedex_tracking, status (Active|Finalized|Received|ClosedOut), full_value, est_store_value, channel (InStore|Web)
- **RETURN_LINE_ITEM** — line_item_id (PK), return_id (FK), ndc_11, lot_number, serial_number, expiration_date, quantity, is_full_package, wac_price, returnability (Returnable|NonReturnable|TBD), co_destination (Inmar|Qualanex|PharmaLink), bmp_printed
- **BATCH** — batch_id (PK), month_year, status (Open|Closed)
- **NDC_PRODUCT** — ndc_11 (PK), product_name, labeler_id (FK), full_package_size, current_price, est_store_price, price_source, last_update
- **LABELER** — labeler_id (PK), labeler_name, labeler_type (Generic|Brand), credit_request_email, auto_ra_email, destination (Inmar|Qualanex|PharmaLink), discount_rate (0.5=50%), accepts_partials, avg_pay_percent, avg_days_to_pay
- **DEBIT_MEMO** — dm_id (PK), dm_number, batch_id (FK), store_id (FK), labeler_id (FK), amount_requested, amount_received, status (Unpaid|Paid)
- **RA_REQUEST** — ra_id (PK), dm_id (FK), ra_number (e.g. BL603088500041), ra_request_date, received_ra_date, fedex_tracking_outbound, ship_date, ship_to_destination
- **WHOLESALER**, **GPO**, **USER**, **WINE_CELLAR_ITEM**, **RETURN_POLICY**, **PAYMENT**

---

## Summary: Critical Path Items

**🚨 BLOCKING DEVELOPMENT (need ASAP):**
1. QR code sample photos — blocks Adding Products Mode
2. Cardinal Health file format — blocks entire Phase 4

**⚡ HIGH PRIORITY (need within 2 weeks):**
3. Manufacturer policy spreadsheet — improves testing accuracy
4. RA email examples — needed for Phase 4 planning

**📋 MEDIUM PRIORITY (need within 4-6 weeks):**
5. Debit memo examples — needed for Phase 4 development
6. NDC pricing samples — needed for testing validation
7. Store data for testing — needed for realistic testing

**🔍 RESEARCH/FUTURE (need within 8+ weeks):**
8. March close-out recording — final validation
9. Policy binders digitization — long-term database completion
10. Commercial NDC database research — potential integration
11. FedEx integration setup — Phase 5 enhancement