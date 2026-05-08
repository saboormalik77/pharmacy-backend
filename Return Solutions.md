# UX Comparison: Return Solutions vs Our Pharmacy Frontend

> **Goal:** Replicate the UX experience of Return Solutions — not the visual design, but how users navigate, what they can do, and what information they see at each step.

---

## How to Read This Document

- **They have it, we don't** = something Return Solutions does that we need to build
- **We have it, they don't** = something we do that they don't (keep it, don't remove)
- **We do it differently** = same concept, different approach — worth reviewing which is better UX

---

## 1. Overall Navigation (What's in the Sidebar)

The sidebar is the primary way users navigate. Here's what each app offers:

| Page / Section | Return Solutions | Our Frontend | Notes |
|---|---|---|---|
| Dashboard | ✅ | ✅ | Different content (see Section 3) |
| Create Returns | ✅ | ✅ | Different flow (see Section 4) |
| Submitted Returns | ✅ | ❌ | They have it as a dedicated page |
| Return History | ✅ | ❌ | They have it as a dedicated page |
| Reports | ✅ | ✅ (Analytics & Reports) | Similar concept |
| View Checks | ✅ | ❌ | Missing entirely |
| View Deductions | ✅ | ❌ | Missing entirely |
| Add Credits | ✅ | ❌ | They let pharmacy users submit credits manually |
| Request On-Site Service | ✅ | ❌ | Missing entirely |
| Invoices | ✅ | ❌ | Missing entirely |
| My Profile | ✅ (sidebar) | ⚠️ (hidden in top-right dropdown) | They make it more visible |
| TBD Items | ❌ | ✅ | Only we have this |
| Destruction | ❌ | ✅ | Only we have this |
| Wine Cellar | ❌ | ✅ | Only we have this |
| Branches | ❌ | ✅ | Only we have this |
| Roles & Permissions | ❌ | ✅ | Only we have this |

**Key takeaway:** Return Solutions has 5 pages we're completely missing — View Checks, View Deductions, Add Credits, Request On-Site Service, and Invoices. These are all part of the credit/payment workflow after a return is submitted.

---

## 2. Dashboard — What the User Sees First

This is the most important UX difference. The two dashboards have completely different purposes.

### Return Solutions Dashboard UX
The dashboard is **return-centric**. The user picks a specific return from a dropdown at the top and the entire page updates to show data for that return.

**Step-by-step experience:**
1. User lands on dashboard
2. A dropdown shows all their past returns (formatted as: `Date | Reference Number | Total Amount`, e.g. `2026-03-24 | 3S38J | $590.28`)
3. User selects a return → page loads credit summary for that return
4. They see a **Credit Summary** broken down by credit type:
   - **RSI OneCheck** → Expected amount (progress bar) vs Received amount
   - **Manufacturer Direct Credit** → Expected vs Received
   - **RSI Pay-On-Receipt** → Expected vs Received
5. Three action buttons appear: **View Check**, **View Details**, **Add Credit**
6. Below that: charts showing **Returnable vs Non-Returnable Product Values** (donut chart), **Non-Returnable Product Reasons** (donut chart), and a **line chart over time by service date**
7. At the very bottom: two large banners showing **All Time Total Returnable Value** and **All Time Total Non-Returnable Value**

### Our Dashboard UX
The dashboard is **analytics-centric**. It shows aggregate stats and trend charts, not per-return data.

**What the user sees:**
1. Summary metric cards (total products, total returns, etc.)
2. Earnings History bar chart (monthly/yearly toggle)
3. Earnings Estimation line chart

### What We're Missing on the Dashboard
| UX Element | Return Solutions | Us |
|---|---|---|
| Return selector dropdown (pick a return to focus on) | ✅ | ❌ |
| Per-return credit breakdown (Expected vs Received per credit type) | ✅ | ❌ |
| View Check / View Details / Add Credit action buttons per return | ✅ | ❌ |
| Returnable vs Non-Returnable donut charts | ✅ (on dashboard) | ⚠️ (only in analytics) |
| Non-Returnable reasons donut chart | ✅ | ❌ |
| Time-series line chart by service date (returnable vs non-returnable) | ✅ | ❌ |
| All-time totals banner (returnable + non-returnable) | ✅ | ❌ |
| Earnings history / estimation charts | ❌ | ✅ |

---

## 3. Create Returns — How Users Start a Return

### Return Solutions UX
The Create Returns flow starts with a **Terms & Conditions + Electronic Signature** step before the user can proceed.

**What the user sees on Create Returns:**
1. Full Terms & Conditions page with three sections:
   - **RSI Pedigree Policy** — explains what products are eligible
   - **Pay-On-Receipt (POR) Program** — explains the 20% fee for non-eligible products
   - **Return Eligibility** — highlights reimbursement timeframes of **10, 30, and 90 days** (shown in red text as a warning)
2. **Electronic Signature field** — user types their name to agree
3. **Auto-filled date** field (read-only, shows today's date)
4. **Cancel** and **Submit** buttons

Only after signing do they proceed to add products to the return.

### Our UX
- User clicks "Create Return" → a confirmation modal appears → return is created immediately
- No terms & conditions step
- No electronic signature
- No reimbursement timeframe selection (10 / 30 / 90 days)

### What We're Missing in Create Returns
| UX Element | Return Solutions | Us |
|---|---|---|
| Terms & Conditions step before creating | ✅ | ❌ |
| Electronic signature (type name + date) | ✅ | ❌ |
| Reimbursement timeframe selection (10 / 30 / 90 days) | ✅ | ❌ |
| RSI Pedigree Policy disclosure | ✅ | ❌ |

---

## 4. Submitted Returns — Tracking What Was Sent

### Return Solutions UX
"Submitted Returns" is a dedicated page showing items that have been **sent to the processor but not yet finalized**.

**What the user sees:**
1. A dropdown at the top to select which submission (by date and reference number, e.g. `03/17/2026 - 3S38J`)
2. Two action buttons: **Print Labels** and **Print RA Forms**
3. A table of all items in that submission with columns:
   - NDC, Label Name, Package, **Cases**, **Full**, **Partials**, DEA, Lot Number, Exp Date
4. Pagination (e.g., "Showing 1 to 10 of 57 entries")
5. "Show X entries" dropdown to control rows per page

### Our UX
We don't have a "Submitted Returns" page. Returns that have been submitted appear in the main Returns list filtered by status (`completed`, `finalized`, `received`). There's no dedicated view for items within a submitted return batch.

### What We're Missing in Submitted Returns
| UX Element | Return Solutions | Us |
|---|---|---|
| Dedicated "Submitted Returns" page | ✅ | ❌ |
| Select submission by date/reference dropdown | ✅ | ❌ |
| Print Labels button | ✅ | ⚠️ (available in return detail, not this view) |
| Print RA Forms button | ✅ | ❌ |
| Item-level table: Cases, Full packs, Partials columns | ✅ | ❌ |

---

## 5. Return History — Viewing Past Completed Returns

### Return Solutions UX
"Return History" (`/customer/allReturns`) is a simple, clean list of all **finalized/completed** returns.

**What the user sees:**
1. A table with 4 columns: **Date**, **Reference Number**, **Amount**, **Action**
2. Each row has a **VIEW DETAILS** button
3. "Show X entries" dropdown (10, 25, 50 per page)
4. A search box to filter by any field
5. Clicking VIEW DETAILS goes to a detailed breakdown of that return

### Return Details Page (`/customer/return-history?refnumdashboard=3S38J`) UX
When the user clicks VIEW DETAILS on a return:
1. Header shows: Date, Reference Number, Amount
2. Two toggle tabs: **Returnable Products** / **Non-Returnable Products**
3. A filter dropdown ("All") to filter by credit type
4. A search box
5. A product table with columns: **NDC, Product, Package, Quantity, LotNumber, ExpDate, DEA, Value, Manufacturer, Credit Type, Details**
6. Credit Type column shows: **RSI OneCheck** or **Manufacturer** (with different styling — Manufacturer is shown as a blue link)
7. A details icon button on each row

### Our UX
- We have a Returns list page but it mixes all statuses (in_progress, completed, finalized, received, etc.) together — the user must use a status filter dropdown to find completed returns
- Our return detail page shows similar product data but does not show **Credit Type per product**
- No toggle between Returnable and Non-Returnable products within a return detail

### What We're Missing in Return History & Details
| UX Element | Return Solutions | Us |
|---|---|---|
| Separate "Return History" page (completed only) | ✅ | ❌ (mixed with active returns) |
| Clean 4-column history list (Date, Ref#, Amount, Action) | ✅ | ❌ |
| Toggle between Returnable / Non-Returnable within a return | ✅ | ❌ |
| Credit Type column per product (RSI OneCheck / Manufacturer) | ✅ | ❌ |
| Filter by credit type within a return | ✅ | ❌ |
| "Show X entries" rows-per-page control | ✅ | ❌ |

---

## 6. Add Credits — Tracking Credit Received Per Manufacturer

This is one of the most detailed and unique pages in Return Solutions. It's not just a list — it's an active reconciliation tool.

### Return Solutions UX — Step by step

**Step 1 — Search for Credits (`/customer/add-credit`)**
1. User lands on page titled **"ADD CREDITS"** with a sub-heading **"SEARCH FOR CREDITS"**
2. A **Select Return** dropdown (same format: `Date | Reference# | Amount`) lets the user pick which return to look at
3. Two search fields: **Search by Debit Memo Number** and **Search by Manufacturer** — each with its own SEARCH button
4. An instructional paragraph explains: "Please add any checks or manufacturer credits that you have received here in order to keep track of outstanding credit due for each return. If you have not received credit 90 days after your return, you can click the **Request Research** button to have our customer service department begin researching the credit."
5. A **color-coded legend** at the bottom of the instructions:
   - ⬜ No Information
   - 🟧 Customer must call for details
   - 🟥 Credit issued to wholesaler
   - 🟩 Credit complete

**Step 2 — The Credits Table**
Below the search, a table appears with one row per manufacturer for that return:
- **Manufacturer** (colored based on legend status — e.g., grey = no info, orange = call required)
- **Processor** (e.g., INMAR-Texas, QUALANEX, NONE)
- **Debit Memo** (e.g., TCX3S38J14511)
- **RSI Estimate** (what RSI estimated the credit to be)
- **Credit Received** (what was actually received — starts at $0.00)
- **Action** → **CREDIT INFO** button per row

**Step 3 — Credit Info Modal**
When the user clicks CREDIT INFO, a modal opens titled **"Add Credit"** (or **"Credit Information"** if credits already exist).

The modal shows:
- A summary header row: Processor, RSI Estimate, RA Number, Debit Memo, Phone Number, Tracking Number
- A form to add a new credit entry:
  - **Received Amount** (number input)
  - **Credit Type** (dropdown: Select Credit Type)
  - **Credit Memo** (text input)
  - **Date Issued** (date picker)
  - **Notes** (text input)
- A table of all previously added credits for this manufacturer: Amount, Credit Type, Credit Memo, Date Issued, Notes, Actions
- Three buttons at the bottom:
  - **REQUEST RESEARCH** (blue) — escalates to RSI customer service if credit hasn't arrived
  - **SAVE** (dark navy)
  - **CLOSE** (red)

### Our UX
- We have a Credits page that shows a **read-only payments list** with statuses (paid, processing, pending, failed)
- No per-manufacturer credit tracking
- No ability to record what was actually received vs what was estimated
- No Request Research escalation button
- No color-coded status legend
- No Debit Memo / RA Number / Processor info tied to credits

### What We're Missing in Add Credits
| UX Element | Return Solutions | Us |
|---|---|---|
| Per-return credit search (select return first) | ✅ | ❌ |
| Search by Debit Memo Number | ✅ | ❌ |
| Search by Manufacturer | ✅ | ❌ |
| Per-manufacturer credit table (RSI Estimate vs Credit Received) | ✅ | ❌ |
| Color-coded row status (no info / call required / issued to wholesaler / complete) | ✅ | ❌ |
| CREDIT INFO button per manufacturer row | ✅ | ❌ |
| Add Credit modal (Received Amount, Credit Type, Credit Memo, Date Issued, Notes) | ✅ | ❌ |
| Processor info in modal (RA Number, Debit Memo, Phone, Tracking) | ✅ | ❌ |
| REQUEST RESEARCH button to escalate to support | ✅ | ❌ |
| List of already-added credit records in modal | ✅ | ❌ |

---

## 7. View Checks — Full Check History

### Return Solutions UX (`/customer/viewChecks`)

1. Page title: **"VIEW CHECKS"**
2. Section: **"RSI Check History"**
3. Legend at top: **OCS = One-Check-Select**, **POR = Pay-On-Receipt** (these are the two credit program types)
4. A **date filter dropdown** ("All Dates") + **Submit** button to filter by time period
5. A search box
6. A table with these columns:
   - **Return Date** — date of the original return
   - **Reference Number** — the return's reference code (e.g., 3S15L, 3RC56)
   - **Date Paid** — when the check was actually paid
   - **Check Number** — shown as a **clickable blue link** (e.g., 216461, 214327) — clicking it likely opens the check document
   - **Check Amount** — the amount of the check issued
   - **Credit Included** — total credit that was included
   - **RSI Credit Fee** — fee charged by RSI
   - **Manufacturer Direct Credit Fee** — separate fee for manufacturer-direct credits
   - **Credit Type** — OCS or POR

**Example data:**
- 1/23/2026 | 3S15L | 2/17/2026 | Check #216461 | $2,889.06 | Credit $3,410.89 | RSI Fee $508.22 | Mfr Fee $13.61 | OCS
- 12/10/2025 | 3RC56 | 1/6/2026 | Check #214327 | $5,465.08 | Credit $6,333.05 | RSI Fee $848.62 | Mfr Fee $19.35 | OCS

### Our UX
- No View Checks page exists
- Our Credits page shows payment status but not the fee breakdown (RSI fee vs Manufacturer fee)
- No check number as a clickable document link
- No OCS vs POR credit type distinction

### What We're Missing in View Checks
| UX Element | Return Solutions | Us |
|---|---|---|
| Dedicated View Checks page | ✅ | ❌ |
| Date filter to narrow check history | ✅ | ❌ |
| Clickable check number (opens check document) | ✅ | ❌ |
| Check Amount vs Credit Included (shows fee deducted) | ✅ | ❌ |
| RSI Credit Fee column | ✅ | ❌ |
| Manufacturer Direct Credit Fee column | ✅ | ❌ |
| OCS vs POR credit type per check | ✅ | ❌ |

---

## 8. View Deductions — Deductions Against Credits

### Return Solutions UX (`/customer/deductions`)

Simple, focused page:
1. Title: **"VIEW DEDUCTIONS"**
2. A table with 3 columns: **Date of Deduction**, **Check Number**, **Deduction Amount**
3. Currently shows empty state: "No Deductions found"

This page is where the pharmacy can see if RSI ever deducted money from a check (e.g., for product issues, pedigree problems, or disputes).

### Our UX
- No deductions page or concept exists in our frontend

### What We're Missing in View Deductions
| UX Element | Return Solutions | Us |
|---|---|---|
| Dedicated View Deductions page | ✅ | ❌ |
| Deduction tied to a specific check number | ✅ | ❌ |
| Date and amount of each deduction | ✅ | ❌ |

---

## 9. Reports — Per-Return Document Downloads

### Return Solutions UX (`/customer/get-reports`)

1. Title: **"REPORTS"**
2. A **Select Return** dropdown at the top (same `Date | Reference# | Amount` format) — the user picks which return they want reports for
3. Two report cards in the first group:
   - **Return Reports** → VIEW button
   - **Controlled Substance Report** → VIEW button
4. A separate section titled **"PROOF OF DESTRUCTION"** with two cards:
   - **Controls** → VIEW button
   - **Non Controls** → VIEW button

Each VIEW button likely opens or downloads a PDF report for the selected return.

### Our UX
- We have an Analytics & Reports page but it shows charts and data tables
- No per-return document downloads
- No Controlled Substance Report
- No Proof of Destruction report (Controls / Non Controls)

### What We're Missing in Reports
| UX Element | Return Solutions | Us |
|---|---|---|
| Select a specific return to generate reports for | ✅ | ❌ |
| Return Reports download (per return) | ✅ | ❌ |
| Controlled Substance Report (per return) | ✅ | ❌ |
| Proof of Destruction — Controls (per return) | ✅ | ❌ |
| Proof of Destruction — Non Controls (per return) | ✅ | ❌ |

---

## 10. Request On-Site Service — Appointment Request UX

### Return Solutions UX (`/customer/request-onsite`)

This page is a focused form to request an RSI representative visit.

1. Page title: **"REQUEST ON-SITE SERVICE"**
2. A warning note at the top: selecting a date does not guarantee rep availability, and scheduler will confirm actual appointment
3. **Select Date** field with calendar picker
4. Large **Special Instructions** text area for context/details
5. **SUBMIT REQUEST** button

### Our UX
- No dedicated on-site request workflow page in pharmacy frontend
- No date-based appointment request flow for rep visit
- No special-instructions capture tied to service appointment

### What We're Missing in Request On-Site Service
| UX Element | Return Solutions | Us |
|---|---|---|
| Dedicated request form page | ✅ | ❌ |
| Date picker for requested appointment date | ✅ | ❌ |
| Special instructions text area | ✅ | ❌ |
| Explicit appointment expectation note (not guaranteed date) | ✅ | ❌ |

---

## 11. Invoices — Open vs Paid Invoice Tracking

### Return Solutions UX (`/customer/invoices`)

This page separates billing into two tables so pharmacies can quickly see what is due vs what has been paid.

1. Title: **"INVOICES"**
2. Table 1 for open/current invoices:
   - Columns: checkbox selector, Date, RefNum, Invoice Type, Amount, Action
   - Includes Show entries dropdown, search box, pagination
3. Table 2 for paid invoices, labeled **"PAID INVOICES"**:
   - Columns: S.No., Date, RefNum, Amount, Payment Date, Action
   - Also includes Show entries dropdown, search box, pagination

### Our UX
- No invoice tracking page in pharmacy frontend
- No split between open invoices and paid invoices
- No invoice list searchable by RefNum/date/type

### What We're Missing in Invoices
| UX Element | Return Solutions | Us |
|---|---|---|
| Dedicated invoices page | ✅ | ❌ |
| Separate open invoices table | ✅ | ❌ |
| Separate paid invoices table | ✅ | ❌ |
| Search and pagination on invoice tables | ✅ | ❌ |
| Payment date shown for paid invoices | ✅ | ❌ |

---

## 12. My Profile — Compliance + Account Verification UX

### Return Solutions UX (`/customer/my-profile`)

This is a complete profile verification flow, not just basic settings.

1. Header: **"MY PROFILE"** and guidance text to verify account information so RA/shipping labels are sent correctly
2. **License Info** section:
   - DEA Number (locked/read-only)
   - DEA Expiration
   - State Pharmacy License Number (locked/read-only)
   - State Pharmacy License Expiration
3. **Pharmacy / Facility Information** section:
   - Pharmacy name
   - Pharmacy physical address
   - City / State / Zip
   - Corporate name (if different)
   - Mailing address (if different)
   - Wholesaler
   - Wholesale account number
   - Buying group dropdown
   - Store hours
4. **Contact Information** section:
   - Contact 1 / Contact 2
   - Email
   - Phone number
   - Fax
5. **My Documents** section:
   - Upload DEA document
   - Upload State Pharmacy License document
6. **SAVE** button

### Our UX
- We have a settings page with profile details and some DEA/store fields
- We do not currently provide the same structured compliance workflow in a dedicated "My Profile" page
- No explicit document upload section for DEA and State License files in this user-facing profile flow
- No clear split between license compliance data, facility data, contact data, and required documents

### What We're Missing in My Profile
| UX Element | Return Solutions | Us |
|---|---|---|
| Dedicated My Profile verification workflow | ✅ | ❌ |
| License info block with expiration tracking visible to user | ✅ | ⚠️ partial |
| Pharmacy/facility verification form (corporate + mailing + wholesaler + buying group + store hours) | ✅ | ⚠️ partial |
| Contact block in same verification workflow | ✅ | ⚠️ partial |
| Document uploads for DEA + State License in profile | ✅ | ❌ |
| Explicit "verify profile for RA/shipping accuracy" guidance | ✅ | ❌ |

---

## 13. What We Have That They Don't (Keep These)

These are features we've built that Return Solutions does NOT have. Don't remove them.

| Feature | Why We Have It |
|---|---|
| **TBD Items** | Items that need a decision (return vs destroy vs hold) |
| **Destruction** | Track items sent for destruction |
| **Wine Cellar** | Controlled substances hold area |
| **Branches** | Multi-location pharmacy management |
| **Roles & Permissions** | Different access levels per staff member |
| **Earnings History & Estimation charts** | Forward-looking financial planning |
| **Scan-based return creation** | Faster product entry via barcode scanner |
| **Analytics & Reports page** | Deeper data analysis |

---

## Summary — What to Build Next (Priority Order)

These are the UX gaps that matter most for replicating the Return Solutions experience:

### High Priority

1. **Dashboard: Per-return credit summary**
   - Add a return selector dropdown (Date | Ref# | Amount format)
   - Show Expected vs Received breakdown per credit type: RSI OneCheck, Manufacturer Direct, Pay-On-Receipt
   - Add three action buttons per return: View Check, View Details, Add Credit
   - Add Returnable vs Non-Returnable donut charts, Non-Returnable reasons chart, time-series line chart, and all-time total banners

2. **Add Credits page** (full reconciliation tool — this is the most complex missing page)
   - Select Return dropdown → shows all manufacturers for that return in a table
   - Per-manufacturer: RSI Estimate vs Credit Received, color-coded status (no info / call required / issued to wholesaler / complete)
   - CREDIT INFO button per row → opens modal to log received amount, credit type, memo, date, notes
   - Modal also shows: Processor, RA Number, Debit Memo, Phone Number, Tracking Number
   - REQUEST RESEARCH button to escalate to support if credit hasn't arrived after 90 days

3. **View Checks page**
   - Table: Return Date, Reference#, Date Paid, Check Number (clickable PDF link), Check Amount, Credit Included, RSI Fee, Manufacturer Direct Fee, Credit Type (OCS/POR)
   - Date filter dropdown + search

4. **Reports page** (per-return document downloads)
   - Select Return dropdown
   - Return Reports PDF, Controlled Substance Report PDF
   - Proof of Destruction: Controls PDF, Non Controls PDF

### Medium Priority

5. **Return History page** — Clean separate page listing only completed/finalized returns (Date | Reference# | Amount | VIEW DETAILS). Currently buried in our Returns list with active returns.

6. **Return Details: Returnable / Non-Returnable toggle + Credit Type per product** — Within a return detail, let users toggle between returnable and non-returnable product lists. Show which credit type applies to each product (RSI OneCheck vs Manufacturer).

7. **Submitted Returns page** — Dedicated page showing items in a submitted return batch with Print Labels and Print RA Forms buttons.

8. **View Deductions page** — Simple table: Date of Deduction, Check Number, Deduction Amount.

9. **Request On-Site Service page** — Date picker + special instructions + submit flow.

10. **Invoices page** — Two-list layout: open invoices and paid invoices with search/pagination.

11. **My Profile verification workflow** — license compliance, facility data, contact info, and DEA/State license document uploads in a single guided page.

### Lower Priority

12. **Create Return: T&C + E-Signature step** — Show Terms & Conditions (RSI Pedigree Policy, POR Program, Return Eligibility) and collect typed name + date as electronic signature before proceeding.

