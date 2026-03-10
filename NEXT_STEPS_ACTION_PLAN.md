# PharmAnalytics — Post-Meeting Action Plan

**Date:** March 6, 2026
**Based on:** Client meeting March 5, 2026 (Bryan Shnider, Joseph Delaney, Josephine Velazquez, Bahir Tayob, Arnie Sarkar, Asim Hayat)
**Meeting recording screenshots:** 17 screenshots captured during demo session

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [What We Currently Have (Existing Platform)](#2-what-we-currently-have)
3. [What the Client Showed Us (Their Legacy System)](#3-what-the-client-showed-us)
4. [Gap Analysis: What We Need to Build](#4-gap-analysis)
5. [Feature Breakdown — Detailed Requirements](#5-feature-breakdown)
6. [Priority Task List](#6-priority-task-list)
7. [Data Requirements & External Integrations](#7-data-requirements)
8. [Database Schema Changes Needed](#8-database-schema-changes)
9. [API Endpoints to Build](#9-api-endpoints-to-build)
10. [Frontend Pages to Build](#10-frontend-pages-to-build)
11. [Open Questions & Follow-ups](#11-open-questions)

---

## 1. Executive Summary

The client (Joseph Delaney / Josephine Velazquez) demonstrated their **existing legacy desktop application** — a pharmaceutical returns processing system used to scan products, create return shipments, track credits, and submit debit memos to reverse distributors (Inmar, Colonex/now Inmar, PharmaLink). The demonstration covered the **complete end-to-end return workflow** from pharmacy to manufacturer credit.

**The key takeaway:** Our existing PharmAnalytics platform covers the **analytics and optimization** side well (NDC search, pricing comparison, earnings estimation, inventory analysis). What we are **missing entirely** is the **operational warehouse workflow** — the actual return processing engine that Josephine showed during the meeting. This is the core product the client needs digitized into a modern web application.

---

## 2. What We Currently Have

### Backend (31 Controllers, 34 Services, 30+ RPC Functions)

| Feature Area | Status | Notes |
|---|---|---|
| Authentication (Pharmacy + Admin) | ✅ Complete | JWT + refresh tokens, dual auth system |
| Pharmacy Dashboard & Analytics | ✅ Complete | Earnings history, estimation, period filtering |
| NDC Search & Product Lookup | ✅ Complete | Cached index, fuzzy search, <1ms response |
| Inventory Management | ✅ Complete | CRUD, CSV import, lot/expiration tracking |
| Return Reports Processing | ✅ Complete | PDF upload, AI extraction, distributor mapping |
| Optimization Engine | ✅ Complete | Distributor comparison, package suggestions |
| Marketplace (B2B deals) | ✅ Complete | Full e-commerce with Stripe checkout |
| Subscriptions & Billing | ✅ Complete | Free/Basic/Premium/Enterprise with Stripe |
| Admin Panel | ✅ Complete | Pharmacies, distributors, marketplace, users, settings |
| Custom Packages | ✅ Complete | Package builder with fee calculations |
| Document Management | ✅ Complete | Upload, view, download return report PDFs |
| Credits Estimation | ✅ Complete | Expiration windows, condition multipliers |
| Barcode Scanning/Parsing | ✅ Complete | QR code → NDC + lot + expiration via AI |
| Inventory Analysis (AI) | ✅ Complete | CSV/PDF upload, AI recommendations |
| Email Notifications | ✅ Complete | Expiring product cron, branded templates |
| Earnings Estimation | ✅ Complete | Actual vs potential earnings with charts |

### Frontend (40 Pages, 15 API Services)

| Feature Area | Status | Notes |
|---|---|---|
| Authentication Flow | ✅ 100% | Login, register, password reset, token refresh |
| Dashboard with Charts | ✅ 100% | Recharts integration, period filtering |
| Products & NDC Management | ✅ 100% | Barcode scan, CSV import, manual entry |
| Inventory CRUD | ✅ 100% | Full create/edit/delete with metrics |
| Returns Processing | ✅ 100% | Create from inventory, status workflow |
| Documents Upload & Management | ✅ 100% | Upload, list, view, delete |
| Optimization & Suggestions | ✅ 95% | Distributor comparison, package builder |
| Marketplace | ✅ 95% | Browse, cart, Stripe checkout, orders |
| Subscription Management | ✅ 100% | Plans, checkout, portal, cancel/reactivate |
| Settings & Profile | ✅ 100% | NPI/DEA, addresses, password change |
| Warehouse Management | ⚠️ 40% | UI exists but uses mock data |
| Credits Page | ⚠️ 60% | UI exists but uses mock data |
| Analytics Page | ⚠️ 40% | UI scaffolding, mock data only |
| Reports Generation | ⚠️ 40% | UI structure, no backend generation |

---

## 3. What the Client Showed Us (Legacy System)

The legacy system is a **desktop application** used by processors (field reps like Josephine) and warehouse staff. The meeting walked through the **complete return lifecycle**:

### 3.1 Processor Side (Field Work — At Pharmacy Store)

**Store Selection Screen** (Screenshots: 7:17 PM, 7:18 PM)
- Processor logs in and sees only the stores they are assigned to process
- Self-service pharmacies would only see their own store
- Each processor has a list of assigned pharmacies

**Create Return Transaction** (Screenshots: 7:35 PM + Screenshot 1 — Create Return ID Dialog)
- System generates a unique **License Plate Number** per return on-the-fly
  - Format: `MMDDYY-23HA-XXXX` (date + identifier + last 4 = store number)
  - "23HA" = House Account identifier
  - Used to tie credits back to the store account
  - One license plate per return transaction per store (rarely two per day)
- **Create Return ID? Confirmation Dialog** (Screenshot 1):
  - "You Are About to Create Return Transaction ID: 030526-23HA-5544"
  - "Once You Do This You Can Then Begin Adding Products to the Return"
  - "OK To Do This?"
  - "Selecting 'No' Will Clear ALL Info So That You Can Re-Start the Process"
  - [Yes] / [No] buttons
  - After confirming: "Create Return Transaction" button greys out, "Add Return Items" button becomes active

**Product Scanning via QR Code** (Discussed at 19:23-19:25)
- **90%+ of bottles now have QR codes** (started ~4 years ago)
- QR code scan auto-populates: NDC, lot number, serial number, expiration date, standard price
- For products without QR codes: manual NDC entry (11-digit number)
- Only thing manually entered: **quantity** (number of bottles/tablets)
- **Partial bottles**: processor enters estimated quantity (e.g. 75%)

**Adding Products Mode — Individual Item Entry Form** (Screenshot 2 — NEW)
- **Application**: First Class Returns Processor 2019 Ver 2.10
- **Header**: Pharmacy Name + License Plate (e.g., "GlenVista Pharmacy" | "030526-23HA-5544") + "Adding Products Mode" label
- **Barcode Input**: "Scan Package BarCode" field + **"Manual NDC Entry"** button (fallback for unreadable barcodes)
- **Product Fields**:
  - 11 Digit NDC Code
  - Proprietary Name
  - Manufacturer
  - Package Description
  - Dosage / Strength / Unit (three separate fields for drug formulation)
  - DEA Class (with radio button for "DEA Form 222" — Schedule II controlled substances)
  - Expiration Date (month/year dropdowns)
  - Return Reason (dropdown)
  - Serial Number
  - Lot Number
  - Standard Price (with **"Add Price"** button for manual price entry + **"View Policy"** button for inline manufacturer policy lookup)
  - Full Package Size
  - Full Package QTY Returned (with toggle for full vs partial)
  - Estimated Value (auto-calculated)
  - Memo (multi-line text field)
- **Classification Radio Buttons** (right side):
  - ○ Returnable Product
  - ○ NON Returnable Product
  - ○ To Be Determined (TBD)
- **Action Buttons** (bottom):
  - **Save & Return** (blue) — save item and go back to main grid
  - **Cancel This Item** (blue) — discard without saving
  - **Delete Entry** (grey/disabled until item exists) — remove a saved item
  - **Back To Main Form** (blue) — return to transaction view
- **Key Insights from this form**:
  - "View Policy" button enables inline policy lookup per item during scanning
  - DEA Form 222 radio is at the individual item level (not just at finalization)
  - Package Description, Dosage, Strength, Unit are separate structured fields (not free-text)
  - Return Reason is a dropdown (standardized reasons, not free-text)

**Return Policy Check** (Screenshots: 7:41 PM, 7:42 PM)
- System automatically checks manufacturer return policies:
  - **6 months prior to 6 months post expiration** (12-month window)
  - **No partials accepted** — policy varies by manufacturer
  - Product automatically classified as: **Returnable**, **Non-Returnable**, or **To Be Determined (TBD)**
- Policies are loaded internally into the system (not from QR code)
- Some specific products within a manufacturer may be non-returnable (e.g., HUMIRA, Crixivan for Abbott)
- Return reasons tracked (manufacturer return, etc.)

**Product Classification & Handling**
- **Returnable**: Goes into return shipment
- **Non-Returnable (by date)**: Goes into the **"Wine Cellar"** — stored until the product enters the returnable window
  - System queues monthly checks to see what's now returnable from the Wine Cellar
  - Products come back out when they enter the 6-month post-expiration window
- **Non-Returnable (by policy)**: Goes to destruction (pills removed from bottles, collected by weight, destruction company picks up, federal destruction forms required)
- **TBD**: Missing data, contact manufacturer, try to find policy

**Return Transaction Entry Screen** (Screenshot 2 — Processor View)
- **Store Information Panel**: Store Name, Address, City, State, Zip Code, Contact, E-Mail Address, Phone Number, Fax Number, Service Type, DEA Number, DEA Expiration, Wholesaler, Acct #
- **Controls**: Select a Store dropdown, Active Returns dropdown, Web checkbox, Date field, Return Transaction ID
- **Action Buttons**: Create Return Transaction, Add Return Items, Edit Store Info, Edit Wholesaler
- **Data Grid Columns**: NDC, Proprietary Name, QTY, FBS (Full Bottle Size), CO (Close-Out status), Price, Est. Value, Expires, Returnable, DEA, Lot Number, Memo, Manufacturer
- **Sample Data Row** (Screenshot 3): NDC `43547-0325-06`, Doxycycline Hyclate, QTY: 1, FBS: 60, Price: $1,395.59, Est. Value: $1,395.59, Expires: 11/2025, Returnable: NO, Lot: 0000054575, Memo: NO, Manufacturer: Solco Healthcare US LLC
- **Bottom Buttons**: Refresh Form, Pause Return, Delete Return, Minimize App | Check Pricing, Import CSV, Future, Complete Return, Quit Application
- **Check Pricing**: If no price on bottle, manually look up on GoodRX or online, enter price
- **Import CSV**: Bulk import of scanned product data from CSV files
- **Pause Return**: Save work-in-progress to resume later
- **Future**: Sets items for future processing (Wine Cellar workflow)

**Complete Return** (Screenshots: 7:47 PM + Screenshot 3)
- Print job sheets (reports) — shows returnable and non-returnable line items
- Enter **FedEx tracking number** for the box (or PRP confirmation number for FedEx pickup)
- Option to schedule automatic FedEx pickup
- **Complete Return** button reveals **"Finalize Return"** sub-button beneath it (Screenshot 3)
- **Finalize**: Locks the return — no further changes allowed
- **Sync**: Ensures data is sent from field laptop to warehouse system (needs to be real-time in new system)
- **State changes after creating transaction** (Screenshot 3): "Create Return Transaction" button greys out, "Add Return Items" becomes active, Return Transaction ID becomes a clickable hyperlink

**Finalize Return Dialog** (Screenshot 1)
- Displays: Transaction ID (e.g., `030526-23HA-5544`), Store Name, Address, Service Type: "Full", DEA Number, DEA Expiration
- Warning: "You are About to Finalize this Return. Once You do this You Will No Longer Be Able to Edit/View This Return. Ok to Proceed With Finalizing This Return?"
- **"Print DEA Form 222's For CII's on this Return"** button — generates DEA Form 222 for Schedule II controlled substances (critical compliance requirement)
- Confirmation checkboxes must be completed before finalizing
- Yes/No confirmation dialog to prevent accidental finalization
- "Back To Main Form" button to cancel

### 3.2 Warehouse Side (Receiving & Close-Out — at HQ)

**Receiving Check-In** (Screenshots: 7:57 PM)
- Scan FedEx tracking number from received box
- System matches to the field return record
- Set received date
- Select **batch** for the month (e.g., March 2026)
- System generates a unique **debit memo license plate**: `DEL-MMYY-ABC-XXXX`
  - Last digits = NDC numbers
  - Unique lettering (e.g., DCC, DEL) per store for identification
  - This number goes on the debit memo sent to the reverse distributor

**Warehouse Close-Out Detail View** (Screenshot 4 — Full Layout)
- **Application**: First Class Returns Close-Out 2019 Ver 1.88
- **Top Controls**: Scan License Plate field, "Return To Close-Out [Month Year]" dropdown
- **Status Tabs**: Available To CO, Closed-Out, Completed, Returns No Status
- **Batch**: Displays current batch month (e.g., "Mar 2026")
- **Store Info Panel**: Store Name, Address, CSZ, Contact Name, Phone, Email, DEA Number, DEA Expiration, Service Type, Primary Wholesaler, Wholesaler Account Number, Processor name
- **Transaction Tracking**: Return Transaction Date, Time In (e.g., 9:19:12 AM), Received In Cohoes Complete On date, Time Out (e.g., 9:42:47 AM PLT), FedEX PRP #, FedEX Tracking #, Return Transaction ID, Close-Out User (e.g., "Josephine Velazquez"), Close-Out Date
- **Value Totals**: Full $$$ Value and Est. Store Return Value displayed in orange
- **Data Grid Columns**: NDC, Proprietary Name, Manufacturer, Expires, Lot, DEA, Returnable (YES/NO), FPS (Full Package Size), QTY, FP Price (Full Price), Value, Adj % (Adjustment Percent — e.g., 0.5), Store Value, CO Destination, CO (Close-Out YES/NO), BMP (Baggy Manifest Printed YES/NO)
- **Sample Row**: NDC `43547-0325-06`, Doxycycline Hyclate, Solco Healthcare US LLC, 11/2025, Lot 0000054575, Returnable: NO, FPS: 60, QTY: 1, FP Price: $1,395.59, Value: $1,395.59, Adj %: 0.5
- **Scan Return Item**: Barcode scanning field for item lookup

**Verification Checklist** (left side of screen)
- Return Check-In with Pieces count (e.g., "Pieces: 1")
- Verified Integrity checkbox
- Confirmed checkbox
- Each step checked per product to verify: unopened bottles (sealed), correct quantities, correct products

**Bottom Action Buttons** (Screenshot 4)
- **Refresh**: Refresh screen data
- **Add Item**: Add Wine Cellar items that became returnable for this store
- **"No" CO Only**: Filter to show only items with Close-Out status = NO (missing destination assignment)
  - Destination determined by manufacturer → loaded in the policy database
  - 90%+ go to **Inmar**, some to **Colonex** (now owned by Inmar), some to **PharmaLink** (~25-30 vendors, mostly generics)
- **"NO" BMP Only**: Filter to show items where Baggy Manifest has NOT been printed
- **"TBD" Only**: Show only TBD items needing resolution
- **Reports**: Generate/re-run store reports
- **Reset CO Status**: Reset close-out status on selected items
- **DALLC-Shared**: Access shared files/folders
- **Clear Form**: Reset the current form
- **Complete CO** (green button): End-of-month close-out → generates the file uploaded to Cardinal
- **Invoice** (orange button): Generate invoice for the return
- **Switchboard**: Return to main Administrative Switchboard menu

### 3.3 Administrative Switchboard & FedEx Receiving

**Administrative Switchboard** (Screenshot 8 — Main Menu)
- **Application**: First Class Returns Close-Out 2019 Ver 1.88
- User field and Today's Date display
- **Three columns of navigation buttons** (15 total):
  - Left column (blue): Returns Main, Store Lookup, RA Requests, Unpaid Debit Memo's, Labeler Information
  - Middle column (blue): Send FedEX Label, Receive By FedEX Tracking, Add/Edit NDC, Cardinal Invoice, Cardinal Vendor # Edit
  - Right column (orange): Delete A Return, Pay Stores, Legacy Stores, NDC Pricing, Nothing Yet (placeholder)
  - Plus Quit button

**FedEx Receiving** (Screenshot 3)
- Title: "Return Received By FedEX Tracking Number"
- "Scan FedEX Tracking To Mark Return Received in the Warehouse" with barcode scan input field
- Confirmation dialog: "This Return Has Been Received in Full, and Ready For Close-Out. Do You Have Other Tracking Numbers to Receive?" [Yes] [No]
- Supports batch receiving of multiple tracking numbers in sequence

**Delete A Return** (Screenshot 9)
- Warning: "Select, then Delete all references to the Selected Return, which would include the License Plate, any Line Items on that Return and all FedEx Information. You will ONLY be able to Select Returns that have NOT been Closed-Out. Make your Selection and proceed with Caution, as once Deleted the Data can NOT be recovered."
- Select a Return dropdown
- Displays (in red highlight): License Plate (e.g., `030526-23HA-5544`), Store (e.g., "GlenVista Pharmacy"), Return Date (e.g., "3/5/2026")
- Buttons: Delete It, Cancel, Exit
- Cannot delete closed-out returns (safety constraint)

### 3.4 RA (Return Authorization) Process

**RA Requests Screen** (Screenshots: 8:09 PM)
- Shows all debit memos organized by batch month (e.g., January's batch)
- Each row = one pharmacy's debit memo
- System sends individual emails to reverse distributors (Inmar/Colonex/PharmaLink) per debit memo per pharmacy
- **Inmar**: Emails RA back → 2-week turnaround (Sandra expedites); typical 4-6 week wait
- **PharmaLink**: Same-day RA via their online portal
- **Colonex (now Inmar)**: Similar to Inmar
- RA email comes with PDF including barcode → printed, placed in the pharmacy's baggy

**RA Fulfillment** (Screenshots: 8:21 PM)
- Scan baggy barcode → match RA number
- Put RA paper into baggy with product
- Assign new FedEx tracking number for the Inmar/PharmaLink shipment
- All bags for same reverse distributor can go in one box (regardless of pharmacy)
- Box lettering on outside matches internal tracking

**RA Request Detail View** (Screenshot 6 — Per-Debit-Memo Tracking)
- **RA Requested**: YES/NO indicator
- **Batch**: Month identifier (e.g., "Jan 2026")
- **License Plate (Trans ID)**: e.g., `012426-34HA-5668`
- **Store Return**: Pharmacy name (e.g., "KISI (DBA Health Choice Pharmacy)")
- **Baggie Manifest**: Unique code (e.g., `DEL 0126DCB00093`) with View and Re-Create buttons
- **RA Request Date**: When RA was first requested (e.g., 2/5/2026)
- **RA Re-Send Date**: For re-sending requests + "Re-EMail RA Request" button
- **Tickler Date**: Follow-up reminder date for pending RAs
- **RA Number**: Authorization number from reverse distributor (e.g., `BL603088500041`)
- **Received RA Date**: When RA was received back (e.g., 2/19/2026)
- **FedEX Tracking**: Outbound tracking number (e.g., `962200190000305960100416980011250`)
- **Ship Date**: When product was shipped to reverse distributor
- **Labeler Header Name**: Manufacturer (e.g., "Teva Pharmaceuticals USA, Inc.")
- **Ship To Destination**: Reverse distributor (e.g., "Inmar")
- **Notes**: Free-text notes field
- **Buttons**: Save, DALLC-Shared, navigation arrows

### 3.5 Close-Out & Invoicing

**Cardinal Invoice** (discussed at 20:00-20:01)
- Complete CEO (Close-out) at end of month → generates file to upload to Cardinal Health
- Cardinal approves within an hour typically
- One spreadsheet per month for all stores → Cardinal processes it

**Unpaid Debit Memos** (Screenshots: 8:26 PM)
- Track which debit memos haven't been paid by manufacturers
- Send follow-up emails to manufacturers requesting payment
- Ask price = full WAC price (always ask for more → manufacturer pays a percentage)
- Track estimated store price (what pharmacy sees) vs current price (what company uses)

**Labeler Debit Memo Payment Request** (Screenshot 7 — Manufacturer Credit Tracking)
- **Labeler Lookup**: Searchable dropdown of all manufacturers with Labeler IDs
  - Example entries: AbbVie Inc. (00032, 00074), Accord Healthcare Inc. (16729), ACELLA PHARMACEUTICALS (42192), Actavis Pharma Inc (61874, 00591, 52544, 00472), Actelion Pharmaceuticals US Inc. (66215), Ajanta Pharma Limited (27241)
  - Note: Some manufacturers have multiple Labeler IDs (e.g., Actavis Pharma has 4 IDs)
- **Summary Fields**: Labeler Name, Labeler ID, Number of Unpaid DM’s, DM Credit Requests Not Started, DM Requests Started Not Emailed, Outstanding $$$, Paid $$$
- **Contact Info**: Contact name, Credit Request E-Mail, Phone, Through Batch
- **Debit Memo Grid Columns**: Batch, Debit Memo, RFDM, CMOF, Requested, E-Mail Date, Follow Up, $$$ Requested, Paid, $$$ Received
- **Action Buttons**: Clear, Create Files & E-Mail, E-Mail DM's Not Sent, Open DM-Export, Add Credit Memo
- This screen is the primary tool for tracking manufacturer payment collection

### 3.6 Pricing & Policies

**Master Labeler Information** (Screenshot 12 — Manufacturer Policy Database)
- **Identification**: Labeler ID (e.g., `64980`), Labeler Type dropdown (Generic / Brand), Labeler Name (e.g., "Rising Pharmaceuticals, Inc.")
- **Contact Information**: Address 1-2, City, State, Zip, Main Contact, Main Phone, Fax, Credit Request E-Mail (e.g., `mbattala@risingpharma.com`), Contact 2, Phone 2, E-Mail 2
- **Performance Metrics**:
  - **Average Pay Percent**: e.g., 73.2% (what percentage of WAC the manufacturer actually pays)
  - **Average Number of Days to Pay**: e.g., 297 days (how long it takes to get paid)
- **Notes Panel**: Dated entries with author initials, e.g.:
  - "7/28/2022 - JV - Returnable partial must be tablets, capsules, soft gels, granules, oral solution, syrups and elixirs."
  - "7/28/2022 - JV - Non returnable if partial creams, suspensions, ointments, pastes, powders, gels, oils, lotion, nasal solution"
- **Labeler Return Information** (sub-section per manufacturer):
  - **Destination**: Reverse distributor dropdown (e.g., Qualanex, Inmar, PharmaLink)
  - **Auto RA E-Mail**: Automated RA request email address (e.g., `customerservice@qualanex.com`)
  - **Policy #**: Policy identifier with description (e.g., Policy # 1 = "6 Months Prior to 12 Months Post Drug Expiration")
  - **New Policy #**: Dropdown for updated policy assignment
  - **Discount Rate**: e.g., 0.5 (50%) — the expected reimbursement percentage
  - **Partials?**: YES/NO dropdown
  - **Reimbursement**: Type dropdown (e.g., BATCH — paid per batch vs per item)
- **Action Buttons**: Edit Return, Save Return Info, Cancel, Add Note, Save Contact Info, Close

**NDC Pricing Screen** (Screenshots 11, 13, 14 — Price Lookup & Management)
- **Search**: Scan In field (barcode), 11-Digit NDC + Find button, 10-Digit NDC + Find button (supports both formats)
- **Product Info**: Product Name, Description (e.g., "100 mL in 1 BOTTLE (0093-4175-73)"), Labeler, Full Package Size
- **Pricing Fields**:
  - **Current Price**: Latest known price with edit capability (e.g., $16.80)
  - **Last Update**: Date of last price change (e.g., 7/10/2018)
  - **Last Reimbursement**: Most recent reimbursement received (with help icon)
  - **Last Price**: Previous price before current
  - **Estimated Store Price**: What the pharmacy is shown (typically ~50% of current — e.g., $8.40 when current is $16.80)
  - **Price Source**: Dropdown with all options:
    - Avella 2016 Price List
    - Avella 2018 Price List
    - Good RX Retail
    - Labeler Credit Memo
    - Price Chopper 2016
    - Processor Added "PA"
    - Single Item DM
    - User Add During Close-Out
    - Westcliff 2017
  - **Close Out Destination**: Dropdown (e.g., Inmar, Qualanex, PharmaLink)
- **Edit Mode**: Orange-highlighted editable fields, Cancel Edit button replaces Edit Price
- **Action Buttons**: Edit Price, Save, Clear, Add Credit Memo
- **Sample Data**: Cephalexin, NDC `00093-4175-73` / `0093-4175-73`, Teva Pharmaceuticals USA Inc, Package Size: 100, Price: $16.80, Est. Store Price: $8.40, Source: Avella 2018 Price List, Destination: Inmar

### 3.7 Store Management

**Store Lookup / Add New Store** (Screenshot 5)
- **Fields**: Date Added, Wholesaler (dropdown), Account #, Store Name, Street, City, State (dropdown), Zip, Contact, Phone, Fax, Email
- **Assignment Fields**: Processor (dropdown), Sales Person (dropdown)
- **Compliance Fields**: DEA Number (orange highlight), DEA Expiration (orange highlight)
- **Service Type**: Dropdown (In-Store, Self, FedEx Express)
- **Visit Scheduling**: Number of Days Between Visits (default: 120), Last Visit Date, Next Visit Date
- **Buttons**: Save, Clear, navigation
- **Key Insight**: 120-day default visit cycle — processors visit each pharmacy approximately every 4 months
- **Secondary wholesaler** tracking needed for buying group/GPO intelligence

### 3.8 Payments to Stores

**Pay a Store** (Screenshot 10)
- **Store Selection**: "Store That You Want to Pay" dropdown with full pharmacy list including:
  - Format: Pharmacy Name, City, State, Store Number (4-digit)
  - Example entries: 12422 Central Pharmacy (Chino CA 5654), 16th Ave. Pharmacy (Brooklyn NY 1273), A & B Pharmacy (Miami Garden FL 1209), A1 Care Pharmacy (Santa Ana CA 5649), Abbey Pharmacy (Bay City MI 20022)
- **Store Number**: Separate 4-digit identifier dropdown (e.g., 5654, 1273, 1209)
- **Payment Fields**: Date of the Check or Wire, The DM's Available to Pay, Check or Wire Amount, Select Wire or Check
- **Payment Grid**: Batch Memo column, Paid column
- **Buttons**: Save, Clear
- Record wire/check/Zell/cash payments to pharmacies
- Need: automated wire payment system for scale (pay 1000 stores in one day)
- Track payment amounts, method, date

### 3.9 FedEx Label Management (discussed at 20:29-20:30)

- For web/self-service returns: generate and send FedEx labels to pharmacies
- Pharmacy requests a certain number of labels via email
- Scan and distribute labels from the system

---

## 4. Gap Analysis: What We Need to Build

### What we HAVE that maps to their needs:
| Our Feature | Their Need | Status |
|---|---|---|
| Barcode scanning + AI parsing | QR code scanning at pharmacy | ✅ Maps well |
| NDC search + product lookup | NDC/product identification | ✅ Maps well |
| Return reports processing | Credit memo tracking | ✅ Maps well |
| Inventory management | Product tracking per pharmacy | ✅ Maps well |
| Credits estimation | Estimated return value | ✅ Maps well |
| Optimization engine | Best distributor selection | ✅ Maps well |
| Custom packages | Batch shipment creation | ✅ Partially maps |
| Marketplace | Not directly needed for warehouse | ✅ Separate feature |
| Subscriptions | Not part of warehouse workflow | ✅ Separate feature |

### What we DO NOT HAVE (New Features Needed):

| Feature | Priority | Complexity |
|---|---|---|
| **Processor/Field Return Creation Workflow** | 🔴 Critical | High |
| **License Plate Number Generation** | 🔴 Critical | Medium |
| **Return Policy Engine** | 🔴 Critical | High |
| **Wine Cellar (Deferred Returns) System** | 🔴 Critical | High |
| **Warehouse Receiving & Check-In** | 🔴 Critical | High |
| **Batch Management (Monthly Close-Out)** | 🔴 Critical | High |
| **Debit Memo Generation** | 🔴 Critical | High |
| **RA (Return Authorization) Request System** | 🔴 Critical | High |
| **RA Tracking & Fulfillment** | 🔴 Critical | Medium |
| **Cardinal Health File Upload/Integration** | 🔴 Critical | Medium |
| **Manufacturer/Labeler Policy Database** | 🔴 Critical | High |
| **NDC Pricing Management (Ask vs Receive)** | 🟡 High | Medium |
| **Store/Pharmacy Onboarding & Management** | 🟡 High | Medium |
| **Pharmacy Payment Tracking & Processing** | 🟡 High | Medium |
| **FedEx Label Generation & Shipping Integration** | 🟡 High | Medium |
| **Destruction Tracking (Non-Returnable Items)** | 🟡 High | Low |
| **Product Verification Workflow (Integrity Check)** | 🟡 High | Medium |
| **Debit Memo Payment Tracking** | 🟡 High | Medium |
| **GPO/Buying Group Management** | 🟢 Medium | Medium |
| **Processor/Sales Rep Management** | 🟢 Medium | Low |
| **Wine Cellar Monthly Auto-Check Cron** | 🟢 Medium | Low |
| **Automatic FedEx Pickup Scheduling** | 🟢 Medium | Medium |
| **Direct Manufacturer Returns (Bypass Inmar)** | 🔵 Future | High |
| **DEA Controlled Substance Handling** | � High | Medium |

> **Note (from Screenshot 1):** The legacy system already has DEA Form 222 printing for Schedule II (CII) controlled substances built into the Finalize Return dialog. This is a compliance requirement, not a future enhancement.
| **EDI Integration (Electronic Data Interchange)** | 🔵 Future | High |

---

## 5. Feature Breakdown — Detailed Requirements

### Feature 1: Processor Return Creation Workflow 🔴

**What it does:** Allows a field processor (or self-service pharmacy) to scan products, classify them as returnable/non-returnable/TBD, and create a return shipment.

**User Roles:**
- **Processor**: Sees only their assigned stores. Creates returns in the field using a laptop.
- **Self-Service Pharmacy**: Logs into their own account, sees only their own store.

**Workflow Steps (refined from Screenshots 1, 2, 3):**
1. Select store (from assigned list)
2. Click "Create Return Transaction"
3. **Confirmation dialog**: "You Are About to Create Return Transaction ID: [ID]. Once You Do This You Can Then Begin Adding Products to the Return. OK To Do This?" → Yes/No
4. "Create Return Transaction" greys out, "Add Return Items" becomes active
5. Click "Add Return Items" → opens **Adding Products Mode** form
6. Scan Package BarCode OR click "Manual NDC Entry" for manual 11-digit NDC input
7. System auto-populates: NDC, Proprietary Name, Manufacturer, Package Description, Dosage, Strength, Unit, Lot, Serial, Expiration, Standard Price
8. Enter Full Package QTY Returned (toggle for full vs partial)
9. System checks return policy → auto-selects radio: Returnable / NON Returnable / To Be Determined (TBD)
10. Set DEA Class if applicable (with DEA Form 222 flag for Schedule II)
11. Select Return Reason from dropdown
12. Can click **"View Policy"** for inline manufacturer policy lookup
13. Can click **"Add Price"** if price needs manual entry
14. Add Memo if needed
15. Click **"Save & Return"** → item added to grid, returns to main form
16. Repeat steps 5-15 for all products
17. View all scanned products in list (sortable, searchable)
18. "Check Pricing" for items missing prices
19. Click **"Complete Return"** → reveals **"Finalize Return"** sub-button
20. Enter FedEx tracking number or schedule pickup
21. Click **"Finalize Return"** → DEA Form 222 printing option → locks return permanently
14. Print manifests for pharmacy (returnable + non-returnable lists)
15. Finalize → lock return, sync data to warehouse

**Data Captured Per Item (from Screenshots 2 & 3 — Adding Products Mode + Processor Grid):**
- NDC (11-digit, displayed as `XXXXX-XXXX-XX`)
- Proprietary name (drug name)
- Manufacturer
- Package Description
- Dosage / Strength / Unit (structured drug formulation fields)
- DEA Class (with DEA Form 222 flag for Schedule II)
- Lot number
- Serial number (from QR code)
- Expiration date (month/year)
- Return Reason (dropdown — standardized reasons)
- Standard price (from QR or manual lookup via "Add Price")
- Full Package Size
- Full Package QTY Returned (with full/partial toggle)
- Est. Value (auto-calculated: Price × QTY)
- Return status radio: Returnable Product / NON Returnable Product / To Be Determined (TBD)
- CO (Close-Out status) — shown in grid
- Memo (multi-line notes per item)
- Destination (Inmar / Qualanex / PharmaLink)

**Adding Products Mode Action Buttons:**
- **Save & Return**: Save item to grid and return to main transaction form
- **Cancel This Item**: Discard changes without saving
- **Delete Entry**: Remove a previously saved item (disabled until item exists)
- **Back To Main Form**: Return to transaction view without saving
- **Add Price**: Manual price entry for items without QR price data
- **View Policy**: Inline lookup of manufacturer return policy for the scanned NDC

**Main Form Controls (from Screenshots 1 & 3):**
- **Import CSV**: Bulk import of scanned product data
- **Pause Return**: Save incomplete return for resumption
- **Future**: Defer items for future processing (Wine Cellar)
- **Delete Return**: Remove entire return transaction (only before close-out)
- **Active Returns** dropdown: Switch between in-progress returns

### Feature 2: Return Policy Engine 🔴

**What it does:** Automatic classification of products based on manufacturer return policies.

**Policy Data Points Per Manufacturer (from Screenshot 12 — Master Labeler Information):**
- Labeler ID (NDC prefix digits, e.g., `64980`)
- Labeler Type: Generic or Brand (dropdown)
- Manufacturer/Labeler name
- Return window policy: Policy # with description (e.g., "6 Months Prior to 12 Months Post Drug Expiration")
- Partials accepted: YES/NO dropdown
- Destination: Reverse distributor (Qualanex, Inmar, PharmaLink, etc.)
- Auto RA E-Mail: Address for automated RA requests
- Discount Rate: Expected reimbursement percentage (e.g., 0.5 = 50%)
- Reimbursement Type: BATCH or per-item
- Average Pay Percent: Historical payment rate (e.g., 73.2%)
- Average Number of Days to Pay: Historical payment timeline (e.g., 297 days)
- Specific non-returnable products (by NDC) — e.g., HUMIRA, Crixivan for Abbott
- Dated notes/exceptions with author initials
- Credit Request E-Mail: For debit memo follow-ups
- Contact information (name, phone, email, secondary contact)

**Logic:**
```
IF product.expiration_date is within manufacturer.return_window:
  → RETURNABLE (check policy for partial acceptance)
ELIF product.expiration_date will enter window in future:
  → NON-RETURNABLE (by date) → Wine Cellar with expected_returnable_date
ELIF product is in manufacturer.non_returnable_products:
  → NON-RETURNABLE (by policy) → Destruction
ELIF no manufacturer policy found:
  → TBD (needs manual research)
```

**Enhancement (Bryan's suggestion):**
- Show "This product will become returnable in [MONTH]"
- Auto-suggest which Wine Cellar box to place it in

### Feature 3: Wine Cellar System 🔴

**What it does:** Track products stored for future return when they're outside the return window.

**Workflow:**
1. Product scanned → classified as non-returnable by date
2. System calculates when it will become returnable
3. Product goes into Wine Cellar — tagged with pharmacy store name and expected returnable month
4. Monthly cron job checks Wine Cellar for newly returnable products
5. Newly returnable items auto-added to the store's next return batch
6. Items re-scanned and processed through normal return workflow

**Data:**
- Product details (NDC, lot, serial, quantity, price)
- Original pharmacy/store
- Date shelved
- Expected returnable date (based on policy window)
- Status: shelved / ready_to_return / returned
- Physical location identifier (box label)

### Feature 4: Warehouse Receiving & Check-In 🔴

**What it does:** Track receipt of return shipments from pharmacies, verify contents, assigns to monthly batch.

**Workflow:**
1. Scan FedEx tracking number on received box
2. System matches to field return record
3. Set received date
4. Select batch month (e.g., March 2026)
5. System generates debit memo license plate (e.g., `DEL-0326-DCC-XXXX`)
6. Verification checklist per item:
   - Pieces returned ✓
   - Checked in ✓
   - Verified ✓
   - Integrity confirmed ✓ (bottle sealed = full; opened = partial)
7. Add Wine Cellar items that are now returnable
8. Assign destination per item (Inmar / Colonex / PharmaLink)
9. Print baggy manifests per pharmacy
10. Resolve TBD items (contact manufacturer, find policy)

### Feature 5: Batch Management & Close-Out 🔴

**What it does:** Monthly batch processing — aggregate all store returns, generate debit memos, submit to Cardinal Health.

**Workflow:**
1. Throughout month: returns received, checked in, assigned to batch
2. End of month: "Complete CEO" (close-out)
3. System generates debit memos per pharmacy per reverse distributor
4. Cardinal Health: Upload single spreadsheet → approved within ~1 hour
5. Inmar: Individual emails per debit memo → RA returned in 2-6 weeks
6. PharmaLink: Online submission → same-day RA
7. Track RA numbers per debit memo
8. Print RA papers → place in pharmacy baggies
9. Create shipments to reverse distributors (all bags for same distributor in one box)
10. Finalize batch → mark as closed

**Cardinal Upload File Format:** Need to obtain exact format from Josephine (requested in meeting)

### Feature 6: RA (Return Authorization) Tracking 🔴

**What it does:** Track the lifecycle of RA requests from submission to credit receipt.

**Data (from Screenshot 6 — RA Request Detail):**
- RA Requested (YES/NO)
- Batch month (e.g., "Jan 2026")
- License Plate (Trans ID) linking to original return
- Store name (with DBA if applicable)
- Baggie Manifest number (e.g., `DEL 0126DCB00093`) with View/Re-Create
- RA Request Date (when first sent)
- RA Re-Send Date (for follow-ups, with "Re-EMail RA Request" button)
- **Tickler Date** (follow-up reminder — critical for tracking delayed responses)
- RA Number (authorization from reverse distributor, e.g., `BL603088500041`)
- Received RA Date (when authorization came back)
- FedEx Tracking number (outbound to reverse distributor)
- Ship Date
- Labeler Header Name (manufacturer)
- Ship To Destination (reverse distributor name)
- Notes field
- Credit amount requested (WAC price)
- Credit amount received (actual from manufacturer)
- Date credit received
- Payment status: pending / partial / paid / disputed

### Feature 7: Manufacturer/Labeler Policy Database 🔴

**What it does:** Master database of all manufacturer return policies.

**Data per manufacturer (from Screenshot 12 — Master Labeler Information):**
- Labeler ID (NDC prefix digits, e.g., `64980`)
- Labeler Type (Generic / Brand dropdown)
- Manufacturer/labeler name
- Address, City, State, Zip
- Main Contact, Main Phone, Fax
- Credit Request E-Mail
- Contact 2, Phone 2, E-Mail 2
- Average Pay Percent (e.g., 73.2%)
- Average Number of Days to Pay (e.g., 297 days)
- **Return Policy Sub-Record** (per manufacturer, can have multiple):
  - Destination (reverse distributor dropdown)
  - Auto RA E-Mail address
  - Policy # with text description (e.g., "6 Months Prior to 12 Months Post Drug Expiration")
  - Discount Rate (e.g., 0.5 = 50%)
  - Partials accepted (YES/NO)
  - Reimbursement type (BATCH / per-item)
- Non-returnable product exceptions (specific NDCs)
- Dated notes with author initials (e.g., "7/28/2022 - JV - Returnable partial must be tablets, capsules...")
- Last verified date

**Source:** Josephine is building a spreadsheet (~100 done, hundreds remaining). Joe has physical binders with policies. Potential commercial NDC database available for ~$7-8K/year.
- **Joe's suggestion**: Prioritize top 250 vendors by dollar volume instead of alphabetical

### Feature 8: NDC Pricing Management 🟡

**What it does:** Track and manage pricing data for all NDCs with ask-vs-receive analysis.

**Existing:** We already have NDC pricing in our return_reports data. Need to add:
- **Estimated store price** (what pharmacy is shown — typically ~50% of current price)
- **Current price** (latest known actual price)
- **Last Reimbursement** (most recent reimbursement received for this NDC)
- **Full Package Size** (unit count, e.g., 100)
- **Close Out Destination** (dropdown: Inmar, Qualanex, PharmaLink, etc.)
- **Price source** tracking (exact dropdown options from Screenshot 14):
  - Avella 2016 Price List
  - Avella 2018 Price List
  - Good RX Retail
  - Labeler Credit Memo
  - Price Chopper 2016
  - Processor Added "PA"
  - Single Item DM (Single Item Debit Memo)
  - User Add During Close-Out
  - Westcliff 2017
- **Price history**: date changed, old price, new price, who changed it
- **Dual NDC support**: Both 11-digit (e.g., `00093-4175-73`) and 10-digit (e.g., `0093-4175-73`) lookup
- **Ask vs Receive**: track the WAC price asked vs percentage actually received per manufacturer (currently only aggregated by manufacturer, not per NDC)
- **Edit Mode**: Toggle between view and edit mode with Cancel Edit capability

### Feature 9: Pharmacy Store Management 🟡

**What it does:** Complete store/pharmacy onboarding and management.

**Additional fields beyond current pharmacy table (from Screenshot 5 — Store Lookup):**
- Primary wholesaler + wholesaler account number
- Secondary wholesaler
- GPO/buying group affiliation
- Service type: In-Store / Self / FedEx Express
- Assigned processor (dropdown)
- Assigned sales person (dropdown)
- Last visit date
- Next visit date
- Number of days between visits (default: 120)
- Date added
- Fax number
- DEA number + expiration date (already have)
- NPI number (already have)
- **Store Number**: 4-digit unique identifier (e.g., 5654, 1273, 5649) used in Pay a Store and license plate generation

### Feature 10: Pharmacy Payments & Credits 🟡

**What it does:** Track payments made to pharmacies for their returned products.

**Workflow:**
1. Credit received from manufacturer
2. Calculate company fee/commission
3. Determine pharmacy payout amount
4. Track payment method: wire / check / Zell / cash
5. Record payment date and details
6. Generate payment statement for pharmacy

**Future enhancement:** Automated wire payment system for bulk payments (pay hundreds of stores at once)

### Feature 11: FedEx Shipping Integration 🟡

**What it does:** Generate shipping labels, schedule pickups, track shipments.

**Capabilities needed:**
- Generate FedEx labels for self-service pharmacy returns
- Schedule automatic pickup at pharmacies and at warehouse
- Track inbound shipments (pharmacy → warehouse)
- Track outbound shipments (warehouse → reverse distributors)
- Discounted rates through bahir's FedEx contact

### Feature 12: Destruction Tracking 🟡

**What it does:** Track non-returnable products that must be destroyed.

**Workflow:**
1. Product classified as non-returnable (by policy, not date)
2. Pills removed from bottles
3. Collected by weight in destruction bins
4. Destruction company picks up
5. Federal destruction form generated
6. Form associated with pharmacy for DEA compliance

---

## 6. Priority Task List

### Phase 1: Foundation (Weeks 1-3) — Core Data & Infrastructure

| # | Task | Details |
|---|---|---|
| 1.1 | **Build manufacturer/labeler policy database** | Create schema + admin UI for policy CRUD. Import Josephine's spreadsheet when ready. |
| 1.2 | **Extend pharmacy/store schema** | Add wholesaler, wholesaler account #, service type, assigned processor, GPO, secondary wholesaler |
| 1.3 | **Create processor/user role system** | Processors with assigned stores list. Self-service pharmacies see only their store. |
| 1.4 | **Create Wine Cellar tables** | Products stored for deferred return, with expected_returnable_date |
| 1.5 | **Create batch management tables** | Monthly batches, debit memo tracking, RA number tracking |
| 1.6 | **Create return transaction tables** | License plate generation, line items per transaction, status tracking |

### Phase 2: Processor Workflow (Weeks 3-6) — Field/In-Store Return Creation

| # | Task | Details |
|---|---|---|
| 2.1 | **Build return transaction creation flow** | Select store → generate license plate → start scanning |
| 2.2 | **Integrate QR/barcode scanning with policy engine** | Scan → parse → auto-classify returnable/non-returnable/TBD |
| 2.3 | **Build product list view (scanned items)** | Show all items with columns matching legacy system |
| 2.4 | **Build "Check Pricing" feature** | Lookup and update NDC prices from multiple sources |
| 2.5 | **Build "Complete Return" flow** | Generate manifests, enter FedEx tracking, finalize |
| 2.6 | **Build report/manifest printing** | Returnable items list + non-returnable items list per pharmacy |
| 2.7 | **Wine Cellar entry workflow** | Auto-calculate expected return date, create shelved record |

### Phase 3: Warehouse Workflow (Weeks 6-9) — Receiving, Verification & Batch Processing

| # | Task | Details |
|---|---|---|
| 3.1 | **Build warehouse receiving check-in** | Scan FedEx tracking → match return → set received date |
| 3.2 | **Build verification checklist** | Per-item check: pieces, check-in, verified, integrity |
| 3.3 | **Build batch assignment** | Select monthly batch, generate debit memo numbers |
| 3.4 | **Build destination assignment** | Auto-assign based on policy, manual override for TBD |
| 3.5 | **Build baggy manifest printing** | Per-pharmacy manifest with barcode |
| 3.6 | **Build Wine Cellar monthly review cron** | Auto-check and surface newly returnable items |
| 3.7 | **Build "Add from Wine Cellar" feature** | Add deferred items to current store return |

### Phase 4: Close-Out & RA (Weeks 9-12) — Debit Memos, RA Tracking & Payments

| # | Task | Details |
|---|---|---|
| 4.1 | **Build monthly close-out (Complete CEO)** | Generate all debit memos for the month |
| 4.2 | **Build Cardinal Health upload file generation** | Generate spreadsheet in Cardinal's required format |
| 4.3 | **Build RA request email system** | Send individual emails to Inmar/Colonex/PharmaLink per debit memo |
| 4.4 | **Build RA tracking dashboard** | Track: requested date, received date, RA number, status |
| 4.5 | **Build outbound shipment management** | Group baggies by destination, create FedEx shipments |
| 4.6 | **Build unpaid debit memo tracking** | Dashboard of outstanding credits from manufacturers |
| 4.7 | **Build pharmacy payment tracking** | Record payments to pharmacies (wire/check/Zell/cash) |
| 4.8 | **Build ask-vs-receive analysis** | Per manufacturer pricing differential analytics |

### Phase 5: Enhancements (Weeks 12+) — Polish & Scale

| # | Task | Details |
|---|---|---|
| 5.1 | **FedEx API integration** | Auto-generate labels, schedule pickups, track shipments |
| 5.2 | **Destruction tracking** | Non-returnable item destruction workflow with federal forms |
| 5.3 | **GPO/Buying group management** | White-label tabs, rebate tracking per GPO |
| 5.4 | **Automated wire payment system** | Bulk payment processing for hundreds of pharmacies |
| 5.5 | **Commercial NDC database integration** | $7-8K/year database with pricing + policies (Joe to research) |
| 5.6 | **Direct manufacturer returns** | Bypass Inmar for high-volume manufacturers (future play) |
| 5.7 | **DEA controlled substance handling** | Separate cage/security workflow with compliance forms |
| 5.8 | **Real-time sync** | WebSocket or SSE for field-to-warehouse data sync |

---

## 7. Data Requirements & External Integrations

### Data We Need From Client:

| Data Item | Source | Status | Action |
|---|---|---|---|
| Manufacturer return policies | Josephine's spreadsheet | ~100 done / hundreds remaining | Wait for spreadsheet, import when ready |
| Policy binders (physical) | Joe has them | Not digitized | Prioritize top 250 by $ volume |
| Cardinal Health upload file format | Josephine | Not yet received | Request example file from March close-out |
| Inmar RA email example | Josephine | To be forwarded | Request copies |
| Colonex RA email example | Josephine | To be forwarded | Request copies |
| PharmaLink RA email example | Josephine | To be forwarded | Request copies |
| Debit memo example | Joe/Josephine | Being texted/emailed | Request digital copy |
| Manifest printout example | Joe | Photographed on printer | Request high-res copy |
| QR code sample photos | Joe | Texted to Bryan | Forward to dev team |
| NDC pricing database vendor info | Joe | To research | Follow up for vendor name and pricing |
| Return Solutions reports | Arnie/Dave | Joe has copies | Request for price comparison |
| 10 NDC price samples (5 brand + 5 generic) | Josephine + Joe | To be provided | For ask-vs-receive analysis |
| March close-out recording | Josephine | To be recorded end of March | Bryan requested recording |
| Store/pharmacy database export | Legacy system | Access issue | Need Josephine to get access or export |

### External Integrations Needed:

| Integration | Purpose | Priority |
|---|---|---|
| **FedEx API** | Shipping labels, pickups, tracking | Phase 5 |
| **Cardinal Health API/Upload** | Monthly debit memo file submission | Phase 4 |
| **Inmar Portal** | RA request automation (currently email) | Phase 4 |
| **PharmaLink Portal** | RA request (same-day online) | Phase 4 |
| **Commercial NDC Database** | Pricing + potentially policy data | Phase 5 |
| **Email System (Resend)** | RA request emails, payment notifications | Phase 4 (already have Resend) |

---

## 8. Database Schema Changes Needed

### New Tables:

```sql
-- 1. Manufacturer/Labeler Policies
CREATE TABLE manufacturer_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  labeler_id VARCHAR(10) NOT NULL,        -- NDC prefix digits (e.g., '64980')
  labeler_type TEXT DEFAULT 'generic',    -- 'generic' or 'brand'
  manufacturer_name TEXT NOT NULL,
  address_1 TEXT,
  address_2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  main_contact TEXT,
  main_phone TEXT,
  fax TEXT,
  credit_request_email TEXT,              -- Email for debit memo follow-ups
  contact_2_name TEXT,
  contact_2_phone TEXT,
  contact_2_email TEXT,
  average_pay_percent DECIMAL(5,2),       -- e.g., 73.2 (what % of WAC they actually pay)
  average_days_to_pay INTEGER,            -- e.g., 297 (historical payment timeline)
  verified_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(labeler_id)
);

-- 1b. Manufacturer Return Policies (sub-records per manufacturer — can have multiple)
CREATE TABLE manufacturer_return_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES manufacturer_policies(id) ON DELETE CASCADE,
  destination TEXT NOT NULL,              -- 'inmar', 'qualanex', 'pharmalink', etc.
  auto_ra_email TEXT,                     -- e.g., 'customerservice@qualanex.com'
  policy_number INTEGER,                  -- Policy # identifier
  policy_description TEXT,                -- e.g., '6 Months Prior to 12 Months Post Drug Expiration'
  discount_rate DECIMAL(5,2),             -- e.g., 0.5 (50% reimbursement rate)
  partials_accepted BOOLEAN DEFAULT false,
  reimbursement_type TEXT DEFAULT 'batch', -- 'batch' or 'per_item'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1c. Manufacturer Policy Notes (dated entries with author)
CREATE TABLE manufacturer_policy_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES manufacturer_policies(id) ON DELETE CASCADE,
  note_date DATE NOT NULL,
  author_initials VARCHAR(5),             -- e.g., 'JV' for Josephine Velazquez
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Non-returnable product exceptions (per manufacturer)
CREATE TABLE non_returnable_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES manufacturer_policies(id) ON DELETE CASCADE,
  ndc VARCHAR(13) NOT NULL,
  product_name TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Processors (field reps)
CREATE TABLE processors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES admin_users(id),      -- Or separate auth table
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Processor-Store assignments
CREATE TABLE processor_store_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processor_id UUID REFERENCES processors(id) ON DELETE CASCADE,
  pharmacy_id UUID REFERENCES pharmacy(id) ON DELETE CASCADE,
  assigned_date TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(processor_id, pharmacy_id)
);

-- 5. Return Transactions (the core return record)
CREATE TABLE return_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_plate VARCHAR(20) NOT NULL UNIQUE,  -- e.g., '030526-23HA-5544'
  pharmacy_id UUID REFERENCES pharmacy(id),
  processor_id UUID REFERENCES processors(id),
  service_type TEXT DEFAULT 'in_store',       -- in_store, self, express
  status TEXT DEFAULT 'in_progress',          -- in_progress, paused, completed, finalized
  fedex_tracking TEXT,
  fedex_pickup_confirmation TEXT,
  total_items INTEGER DEFAULT 0,
  total_returnable_value DECIMAL(10,2) DEFAULT 0,
  total_non_returnable_value DECIMAL(10,2) DEFAULT 0,
  batch_id UUID REFERENCES return_batches(id),
  batch_month TEXT,                           -- e.g., 'Mar 2026'
  time_in TIMESTAMPTZ,                        -- When processing started
  time_out TIMESTAMPTZ,                       -- When processing completed
  received_in_warehouse_date TIMESTAMPTZ,     -- When received at HQ (Cohoes)
  close_out_user TEXT,                        -- Who performed close-out (e.g., 'Josephine Velazquez')
  close_out_date TIMESTAMPTZ,                 -- When close-out was performed
  pieces_count INTEGER,                       -- Number of physical pieces checked in
  verified_integrity BOOLEAN DEFAULT false,   -- Integrity check passed
  confirmed BOOLEAN DEFAULT false,            -- Confirmation checkbox
  notes TEXT,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Return Transaction Items (each scanned product)
CREATE TABLE return_transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES return_transactions(id) ON DELETE CASCADE,
  ndc VARCHAR(13) NOT NULL,
  ndc_10 VARCHAR(12),                         -- 10-digit NDC format
  proprietary_name TEXT,
  manufacturer TEXT,                          -- Manufacturer/labeler name
  package_description TEXT,                   -- e.g., "100 mL in 1 BOTTLE"
  dosage TEXT,                                -- Drug dosage form
  strength TEXT,                              -- Drug strength
  unit TEXT,                                  -- Unit of measure
  lot_number TEXT,
  serial_number TEXT,
  expiration_date DATE,
  standard_price DECIMAL(10,2),               -- FP Price (Full Price)
  quantity INTEGER DEFAULT 1,
  full_package_size INTEGER,                  -- FPS (Full Package Size)
  full_package_qty_returned INTEGER,          -- Full Package QTY Returned
  is_partial BOOLEAN DEFAULT false,
  partial_percentage DECIMAL(5,2),
  return_status TEXT NOT NULL,                -- 'returnable', 'non_returnable', 'tbd'
  non_returnable_reason TEXT,                 -- 'date', 'policy', 'no_data'
  return_reason TEXT,                         -- Dropdown selection (standardized)
  destination TEXT,                           -- 'inmar', 'qualanex', 'pharmalink'
  estimated_value DECIMAL(10,2),              -- Est. Value (Price x QTY)
  adjustment_percent DECIMAL(5,2),            -- Adj % (e.g., 0.5)
  store_value DECIMAL(10,2),                  -- Adjusted value for pharmacy
  co_status TEXT DEFAULT 'no',                -- CO column: 'yes' or 'no'
  bmp_status TEXT DEFAULT 'no',               -- BMP column: 'yes' or 'no'
  co_destination TEXT,                        -- Close-Out Destination
  dea_class TEXT,                             -- DEA classification
  dea_form_222 BOOLEAN DEFAULT false,         -- Whether DEA Form 222 is required (CII)
  memo TEXT,
  wine_cellar_id UUID,                        -- If sent to wine cellar
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Wine Cellar
CREATE TABLE wine_cellar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID REFERENCES pharmacy(id),
  item_id UUID REFERENCES return_transaction_items(id),
  ndc VARCHAR(13) NOT NULL,
  product_name TEXT,
  lot_number TEXT,
  serial_number TEXT,
  expiration_date DATE,
  quantity INTEGER,
  standard_price DECIMAL(10,2),
  date_shelved TIMESTAMPTZ DEFAULT NOW(),
  expected_returnable_date DATE NOT NULL,
  physical_location TEXT,                     -- Box label / shelf location
  status TEXT DEFAULT 'shelved',              -- shelved, ready_to_return, returned, destroyed
  returned_in_transaction_id UUID,
  returned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Monthly Batches
CREATE TABLE return_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_month DATE NOT NULL,                  -- First of month (e.g., 2026-03-01)
  batch_name TEXT NOT NULL,                   -- e.g., 'March 2026'
  status TEXT DEFAULT 'open',                 -- open, closed, submitted
  total_debit_memos INTEGER DEFAULT 0,
  total_value DECIMAL(12,2) DEFAULT 0,
  cardinal_file_generated BOOLEAN DEFAULT false,
  cardinal_submitted_at TIMESTAMPTZ,
  cardinal_approved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Debit Memos (one per pharmacy per batch per destination)
CREATE TABLE debit_memos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES return_batches(id),
  pharmacy_id UUID REFERENCES pharmacy(id),
  memo_number VARCHAR(30) NOT NULL UNIQUE,    -- e.g., 'DEL-0326-DCC-XXXX'
  destination TEXT NOT NULL,                  -- 'inmar', 'qualanex', 'pharmalink'
  labeler_id VARCHAR(10),                     -- Manufacturer labeler ID
  labeler_name TEXT,                          -- Manufacturer name
  total_items INTEGER DEFAULT 0,
  total_ask_value DECIMAL(10,2) DEFAULT 0,    -- WAC price (what we ask)
  total_received_value DECIMAL(10,2),         -- What manufacturer actually pays
  rfdm TEXT,                                  -- RFDM tracking code
  cmof TEXT,                                  -- CMOF tracking code
  ra_number TEXT,
  ra_requested_at TIMESTAMPTZ,
  ra_re_send_date TIMESTAMPTZ,                -- Date RA request was resent
  tickler_date DATE,                          -- Follow-up reminder date
  ra_received_at TIMESTAMPTZ,
  ra_document_url TEXT,                       -- Stored PDF of RA
  baggie_manifest TEXT,                       -- e.g., 'DEL 0126DCB00093'
  outbound_tracking TEXT,                     -- FedEx to reverse distributor
  shipped_at TIMESTAMPTZ,
  credit_received_at TIMESTAMPTZ,
  email_date TIMESTAMPTZ,                     -- When credit request email was sent
  follow_up_date DATE,                        -- Next follow-up date
  amount_requested DECIMAL(10,2),             -- $$$ Requested
  amount_received DECIMAL(10,2),              -- $$$ Received
  payment_status TEXT DEFAULT 'pending',      -- pending, partial, paid, disputed
  dm_credit_request_started BOOLEAN DEFAULT false,
  dm_request_emailed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Debit Memo Line Items
CREATE TABLE debit_memo_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debit_memo_id UUID REFERENCES debit_memos(id) ON DELETE CASCADE,
  transaction_item_id UUID REFERENCES return_transaction_items(id),
  ndc VARCHAR(13) NOT NULL,
  product_name TEXT,
  quantity INTEGER,
  ask_price DECIMAL(10,2),                    -- WAC price
  received_price DECIMAL(10,2),               -- Actual credit received
  lot_number TEXT,
  expiration_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Store Payments (to pharmacies)
CREATE TABLE pharmacy_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID REFERENCES pharmacy(id),
  batch_id UUID REFERENCES return_batches(id),
  total_credit_received DECIMAL(10,2),         -- From manufacturer
  company_fee DECIMAL(10,2),                   -- Our commission
  pharmacy_payout DECIMAL(10,2),               -- What we pay the pharmacy
  payment_method TEXT,                         -- wire, check, zell, cash
  payment_reference TEXT,                      -- Check #, wire ref, etc.
  paid_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',               -- pending, processing, paid, failed
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Destruction Records
CREATE TABLE destruction_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID REFERENCES pharmacy(id),
  item_id UUID REFERENCES return_transaction_items(id),
  ndc VARCHAR(13),
  product_name TEXT,
  quantity INTEGER,
  weight_lbs DECIMAL(8,2),
  destruction_reason TEXT,
  federal_form_number TEXT,
  destruction_company TEXT,
  picked_up_at TIMESTAMPTZ,
  form_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. NDC Price History
CREATE TABLE ndc_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ndc VARCHAR(13) NOT NULL,
  ndc_10 VARCHAR(12),                        -- 10-digit NDC format
  product_name TEXT,
  description TEXT,                          -- e.g., '100 mL in 1 BOTTLE (0093-4175-73)'
  labeler TEXT,                              -- Manufacturer name
  full_package_size INTEGER,                 -- e.g., 100
  estimated_store_price DECIMAL(10,2),       -- What pharmacy sees (~50% of current)
  current_price DECIMAL(10,2),               -- What we use internally
  last_reimbursement DECIMAL(10,2),          -- Most recent reimbursement for this NDC
  close_out_destination TEXT,                -- e.g., 'inmar', 'qualanex'
  price_source TEXT,                         -- See dropdown: avella_2016, avella_2018, good_rx_retail,
                                             -- labeler_credit_memo, price_chopper_2016, processor_added_pa,
                                             -- single_item_dm, user_add_during_close_out, westcliff_2017
  changed_by UUID,
  old_price DECIMAL(10,2),
  new_price DECIMAL(10,2),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Extend Existing Tables:

```sql
-- Extend pharmacy table
ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS primary_wholesaler TEXT;
ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS wholesaler_account_number TEXT;
ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS secondary_wholesaler TEXT;
ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS gpo_affiliation TEXT;
ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'in_store'; -- in_store, self, express
ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS assigned_processor_id UUID;
ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS assigned_sales_person_id UUID;
ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS last_visit_date DATE;
ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS next_visit_date DATE;
ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS days_between_visits INTEGER DEFAULT 120;
ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS date_added DATE;
ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS fax_number TEXT;
ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS store_number VARCHAR(10);  -- 4-digit store identifier
ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS dea_expiration_date DATE;
```

---

## 9. API Endpoints to Build

### Return Transactions API
```
POST   /api/return-transactions                    -- Create new return transaction
GET    /api/return-transactions                    -- List (filtered by pharmacy, status, date)
GET    /api/return-transactions/:id                -- Get transaction details
PATCH  /api/return-transactions/:id                -- Update (add tracking, notes)
POST   /api/return-transactions/:id/finalize       -- Lock and finalize
POST   /api/return-transactions/:id/items          -- Add scanned item
PATCH  /api/return-transactions/:id/items/:itemId  -- Update item
DELETE /api/return-transactions/:id/items/:itemId  -- Remove item
GET    /api/return-transactions/:id/manifest       -- Generate/download manifest PDF
POST   /api/return-transactions/generate-license-plate -- Generate unique license plate
```

### Manufacturer Policies API
```
GET    /api/policies                               -- List all policies (paginated, searchable)
POST   /api/policies                               -- Create policy
GET    /api/policies/:id                           -- Get single policy
PATCH  /api/policies/:id                           -- Update policy
DELETE /api/policies/:id                           -- Delete policy
POST   /api/policies/check                         -- Check policy for NDC (returns returnability)
POST   /api/policies/bulk-import                   -- Import from spreadsheet
GET    /api/policies/:id/exceptions                -- Get non-returnable products for this manufacturer
POST   /api/policies/:id/exceptions                -- Add non-returnable product exception
```

### Wine Cellar API
```
GET    /api/wine-cellar                            -- List all items (filtered by pharmacy, status, month)
POST   /api/wine-cellar                            -- Add item to wine cellar
PATCH  /api/wine-cellar/:id                        -- Update item  
POST   /api/wine-cellar/:id/return                 -- Mark item as ready to return
GET    /api/wine-cellar/due                        -- Get items due for return this month
POST   /api/wine-cellar/check-ready                -- Run monthly readiness check
```

### Warehouse Receiving API
```
POST   /api/warehouse/receive                      -- Check in a shipment (by FedEx tracking)
GET    /api/warehouse/pending                      -- List pending check-ins
GET    /api/warehouse/received                     -- List received shipments
POST   /api/warehouse/:id/verify                   -- Run verification checklist
PATCH  /api/warehouse/:id/verify-item              -- Update item verification status
POST   /api/warehouse/:id/assign-batch             -- Assign to monthly batch
POST   /api/warehouse/:id/add-wine-cellar          -- Add wine cellar items
```

### Batch & Debit Memo API
```
GET    /api/batches                                -- List all batches
POST   /api/batches                                -- Create new monthly batch
GET    /api/batches/:id                            -- Get batch details with debit memos
POST   /api/batches/:id/close-out                  -- Close out batch (Complete CEO)
GET    /api/batches/:id/cardinal-file              -- Generate Cardinal upload file
POST   /api/batches/:id/submit-cardinal            -- Mark Cardinal file as submitted

GET    /api/debit-memos                            -- List all debit memos
GET    /api/debit-memos/:id                        -- Get debit memo details
PATCH  /api/debit-memos/:id                        -- Update (RA number, payment info)
POST   /api/debit-memos/:id/request-ra             -- Send RA request email
GET    /api/debit-memos/unpaid                     -- List unpaid debit memos
POST   /api/debit-memos/:id/send-reminder          -- Send payment reminder to manufacturer
```

### Pharmacy Payments API
```
GET    /api/pharmacy-payments                      -- List all payments
POST   /api/pharmacy-payments                      -- Record a payment
GET    /api/pharmacy-payments/:id                  -- Get payment details
PATCH  /api/pharmacy-payments/:id                  -- Update payment
GET    /api/pharmacy-payments/summary              -- Payment summary by pharmacy
```

### Processors API
```
GET    /api/processors                             -- List all processors
POST   /api/processors                             -- Create processor
PATCH  /api/processors/:id                         -- Update processor
POST   /api/processors/:id/assign-stores           -- Assign stores to processor
GET    /api/processors/:id/stores                  -- Get assigned stores
```

### NDC Pricing API (extend existing)
```
GET    /api/ndc-pricing/:ndc                       -- Get pricing details for NDC
PATCH  /api/ndc-pricing/:ndc                       -- Update price
GET    /api/ndc-pricing/:ndc/history               -- Get price change history
GET    /api/ndc-pricing/compare                    -- Ask vs Receive comparison by manufacturer
```

### Destruction API
```
GET    /api/destruction                            -- List destruction records
POST   /api/destruction                            -- Create destruction record
PATCH  /api/destruction/:id                        -- Update (pickup date, form number)
GET    /api/destruction/pending                    -- Items pending destruction
```

---

## 10. Frontend Pages to Build

### Admin / Warehouse Section (New Tab)

| Page | Route | Description |
|---|---|---|
| **Warehouse Dashboard** | `/warehouse` | Overview: pending check-ins, current batch status, upcoming Wine Cellar items |
| **Return Transaction Create** | `/warehouse/returns/create` | Full scanning workflow (matches legacy processor screen) |
| **Return Transaction List** | `/warehouse/returns` | All return transactions with filters |
| **Return Transaction Detail** | `/warehouse/returns/:id` | Single transaction with item list |
| **Receiving Check-In** | `/warehouse/receiving` | Scan FedEx tracking, verify, assign batch |
| **Receiving Detail** | `/warehouse/receiving/:id` | Verification checklist per item |
| **Wine Cellar** | `/warehouse/wine-cellar` | All deferred items, status, expected dates |
| **Batch Management** | `/warehouse/batches` | Monthly batches list |
| **Batch Detail** | `/warehouse/batches/:id` | All debit memos in batch, close-out actions |
| **Debit Memos** | `/warehouse/debit-memos` | All debit memos with RA tracking |
| **Debit Memo Detail** | `/warehouse/debit-memos/:id` | Full debit memo with line items |
| **RA Tracking** | `/warehouse/ra-tracking` | RA request status dashboard |
| **Unpaid Memos** | `/warehouse/unpaid` | Outstanding credits from manufacturers |
| **Destruction Log** | `/warehouse/destruction` | Non-returnable items destruction tracking |
| **Manufacturer Policies** | `/warehouse/policies` | Policy database CRUD |
| **Policy Detail** | `/warehouse/policies/:id` | Single policy with exceptions |
| **Processors** | `/warehouse/processors` | Processor management & store assignments |
| **Pharmacy Payments** | `/warehouse/payments` | Payment tracking to pharmacies |
| **NDC Pricing** | `/warehouse/ndc-pricing` | Price lookup with edit & history |

### Self-Service Pharmacy Section (Extend Existing)

| Page | Route | Description |
|---|---|---|
| **Start Return** | `/returns/start` | Self-service QR scanning, auto-policy check |
| **Return Status** | `/returns/status` | Track return through lifecycle |
| **Credit Statement** | `/credits/statement` | Itemized credit statement from manufacturer |

---

## 11. Open Questions & Follow-ups

### Items Requested From Client (Action Required)

| Item | Who | Status |
|---|---|---|
| Cardinal Health upload file format/example | Josephine | Pending |
| Sample RA emails from Inmar (2-3 examples) | Josephine | Pending |
| Sample RA emails from Colonex | Josephine | Pending |
| PharmaLink portal access/format info | Josephine | Pending |
| Manufacturer policy spreadsheet (~100 entries) | Josephine | In progress |
| Debit memo examples (digital copies) | Joe | Being sent |
| Manifest printout example (high-res) | Joe | Photographed |
| QR code sample photos (2+ bottles) | Joe | Texted to Bryan |
| NDC pricing database vendor info + pricing | Joe | To research |
| 10 NDC price samples (5 brand + 5 generic) for comparison | Josephine + Joe | Pending |
| March close-out process recording | Josephine | End of March |
| Return Solutions report (from Dave) | Arnie → Joe | Forwarded |
| Legacy system database export (if possible) | Joe/Josephine | Access issues |

### Strategic Decisions Needed

| Question | Context |
|---|---|
| **Do we build processor as a separate role/login or use admin users?** | Processors need limited access (only assigned stores). Could be a role within admin_users or separate table. |
| **Do we replicate the exact legacy UI or modernize?** | Bryan suggested building it under admin/warehouse tab. Modern UI preferred but exact workflow must match. |
| **Do we need offline capability for field processors?** | Legacy app runs on laptops in pharmacies. Need offline scanning + sync when connected. |
| **What is the Cardinal upload file format?** | Need exact CSV/TSV format specification before building the export. |
| **FedEx API tier needed?** | Bahir has a discount contact. Need to determine API access level required. |
| **How do we handle DEA controlled substances initially?** | Joe says DEA license is national. Need to understand compliance requirements before building. |
| **Do we white-label per GPO?** | Joe mentioned having a tab per GPO. Need to understand the GPO branding/access model. |
| **What email address do RA requests go to?** | Need specific Inmar/Colonex/PharmaLink email addresses and formats. |
| **Do we need to support the legacy system during transition?** | Is there a parallel-run period? Data migration from legacy? |
| **Commercial NDC database — which vendor?** | Joe needs to research. Includes pricing; may include policies. ~$7-8K/year. |

### Technical Decisions

| Question | Recommendation |
|---|---|
| **Build warehouse as part of existing app or separate?** | Same app, new admin/warehouse route section. Shared auth, shared database. |
| **Real-time sync for field processors?** | Start with standard API calls. Add WebSocket/SSE later if needed. Service workers for offline. |
| **PDF generation for manifests/debit memos?** | Use a server-side PDF generation library (e.g., PDFKit, Puppeteer). |
| **Email sending for RA requests?** | Use existing Resend integration with new templates. |
| **Barcode/QR generation for baggy manifests?** | Use existing barcode generation capability, extend for manifest-specific formats. |

---

## Summary: What To Do Next (Immediate Actions)

1. **Wait for client data:** Cardinal file format, RA email samples, policy spreadsheet, QR code photos, NDC price comparisons
2. **Start building Phase 1 (Foundation):** Create all new database tables, extend pharmacy schema, build policy database admin UI
3. **Design the processor workflow UI:** Wireframe the scanning → classify → complete return flow based on the legacy screens shown in the meeting
4. **Build the return policy engine:** This is the most complex logic piece — determining returnable/non-returnable/TBD based on manufacturer policies, expiration dates, and product exceptions
5. **Schedule March close-out recording:** Josephine will record the process. This will inform the batch/close-out implementation details.
6. **Research FedEx API:** Determine integration requirements and API tier needed with Bahir's contact
7. **Follow up on commercial NDC database:** Joe is researching the vendor. This could significantly accelerate pricing and policy data population.

---

*This document was generated after thorough analysis of:*
- *31 backend controllers, 34 services, 30+ RPC functions, 23 database tables*
- *40 frontend pages, 15 API service integrations, full component library*
- *Complete meeting transcript (1 hour 33 minutes, March 5, 2026)*
- *16 high-resolution screenshots from legacy system (analyzed field-by-field)*
- *3 additional screenshots: Create Return dialog, Adding Products Mode form, Transaction with data + Finalize*
- *All existing documentation files and task lists*

**Screenshots Analyzed (16 total):**
1. Finalize Return Dialog (DEA Form 222, transaction locking)
2. Return Transaction Entry (Processor View — full data grid and controls)
3. FedEx Receiving (barcode scan workflow, batch receiving)
4. Warehouse Close-Out Detail (complete data grid with 16 columns)
5. Store Lookup / Add New Store (all fields including visit scheduling)
6. RA Request Detail (full per-debit-memo tracking with tickler dates)
7. Labeler Debit Memo Payment Request (manufacturer credit collection tracker)
8. Administrative Switchboard (15-button main menu layout)
9. Delete A Return (safety constraints for return deletion)
10. Pay a Store (pharmacy payment with store number system)
11. NDC Pricing Information — Empty (all fields and dropdowns)
12. Master Labeler Information (manufacturer policies, pay metrics, return info)
13. NDC Pricing Information — Filled (Cephalexin sample with all values)
14. NDC Pricing Information — Edit Mode (full Price Source dropdown list)
15. Create Return Transaction — Create Return ID confirmation dialog with exact messaging
16. Adding Products Mode — Individual item entry form (barcode scan, Manual NDC Entry, DEA Class, View Policy, Add Price, Dosage/Strength/Unit, Return Reason dropdown, classification radio buttons)
17. Return Transaction with Data — Grid with sample Doxycycline row, Finalize Return sub-button, state changes after transaction creation
