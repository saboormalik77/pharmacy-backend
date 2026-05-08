# First Class Returns (FCR) — System Overview

**What is this system?**

This is a pharmaceutical returns processing system. It digitizes the entire lifecycle of returning unused or expired medications from pharmacies back to manufacturers for credit. The system replaces a legacy desktop application and handles everything from the moment a pharmacy decides to return products, all the way through to receiving credit payments.

There are three types of users who interact with this system: **Admins**, **Processors**, and **Pharmacies**. Each sees a different part of the system based on their role.

---

## Who Uses the System?

### Admin (Super Admin, Manager, Reviewer, Support)
Admins are the internal staff at headquarters. They manage the entire operation — pharmacies, processors, warehouse activities, batches, payments, and reporting. They have access to the full admin panel.

### Processor
Processors are field representatives who physically visit pharmacies. They log in to the same admin panel but see a limited, processor-specific view. They can only see the stores assigned to them and can create returns, scan products, and manage items for those stores.

### Pharmacy
Pharmacies are the clients — the drugstores whose products are being returned. They log in to their own separate portal where they can view their returns, track credits, see analytics, and manage their store settings. Some pharmacies do self-service returns without a processor visiting them.

---

## The Complete Workflow (Module by Module)

---

### Module 1: Store Setup & Master Data

Before any return can happen, the pharmacy (store) must exist in the system with all its details properly filled in.

**What happens:**
- An admin registers a pharmacy in the system with its business name, address, and contact info.
- Additional store-level details are set up: store number, primary wholesaler, wholesaler account number, secondary wholesaler, GPO (Group Purchasing Organization) affiliation, and DEA (Drug Enforcement Administration) number with its expiration date.
- The system tracks the service type for each pharmacy — whether a processor visits in person ("full service"), the pharmacy handles returns themselves ("self service"), or they ship a box directly ("express").
- Processors are created as staff members with their own login credentials. They are then assigned to specific pharmacies they are responsible for.

**Who does what:**
- **Admin** creates and manages pharmacies and processors. Admin assigns which processors handle which stores.
- **Pharmacy** can view and update their own store settings (wholesaler info, DEA expiration, GPO, service type) from their portal.
- **Processor** sees only the stores assigned to them after logging in.

**Important details:**
- The system warns when a pharmacy's DEA license is expired or expiring soon.
- Each processor gets a login (email and password) that lets them access the admin panel with a restricted view.

---

### Module 2: User Access & Role-Based Entry

Different users enter the system through different doors and see different things.

**What happens:**
- When a processor logs in, they land on a processor-specific dashboard. They see only the sidebar options relevant to their work: Dashboard, Returns, Create Return, Wine Cellar, and Settings. They cannot see admin features like managing other pharmacies, distributors, or other admin users.
- When a pharmacy user logs in to the pharmacy portal, they see only their own store's data — their returns, credits, analytics, and settings.
- Admins see the full admin panel with access to everything.

**Who does what:**
- **Admin** has full access to all features: pharmacies, processors, warehouse operations, batches, payments, analytics, and settings.
- **Processor** sees a limited admin panel — only their assigned stores and the ability to create/manage returns for those stores.
- **Pharmacy** uses a completely separate portal and can only see their own store's information.

**Important details:**
- A processor cannot access data for stores they are not assigned to.
- A pharmacy cannot see another pharmacy's data.

---

### Module 3: Return Transaction Creation

This is when the actual return process begins for a pharmacy.

**What happens:**
- A processor (or admin) selects a pharmacy and starts a new return. The system automatically generates a unique identifier called a "license plate" — a code in the format `MMDDYY-23HA-XXXX` where the date, an internal code, and the store number are combined (for example: `031026-23HA-5544`).
- If the pharmacy already has an active (in-progress or paused) return, the system warns about the duplicate. The user can choose to force-create a second return or resume the existing one.
- A return goes through a lifecycle: it starts as **In Progress**, can be **Paused** and then **Resumed**, eventually marked as **Completed**, and finally **Finalized** (which permanently locks it).

**Who does what:**
- **Processor** selects one of their assigned stores, chooses a service type (In-Store, Self-Service, or Express), optionally adds notes, and creates the return.
- **Admin** can also create returns on behalf of any pharmacy, and can view/manage all returns across all stores.
- **Pharmacy** can see their return status in their portal.

**Important details:**
- The license plate is the primary way everyone refers to a specific return throughout the entire process.
- Once a return is finalized, it cannot be edited or deleted.
- Returns can be searched by license plate, store name, status, or date range.

---

### Module 4: Product Scanning & Entry

This is the core data capture step — scanning or entering each product (bottle/package) that the pharmacy wants to return.

**What happens:**
- The processor (or pharmacy user in self-service) scans the QR code or 2D barcode on each product bottle. The system reads the barcode and automatically extracts: NDC (National Drug Code), lot number, serial number, and expiration date.
- The system then looks up the product information from external databases (openFDA, RxNav) to auto-fill: product name (brand and generic), manufacturer, package description, dosage form, strength, and route.
- All of this information auto-populates the form. The user reviews it, adds the quantity and price, and saves the item.
- If the barcode cannot be scanned, the user can manually type the NDC and look up the product.
- The system warns if the same product (same NDC + lot number) has already been scanned in this return.
- After saving, the form clears and is ready for the next scan — a rapid "scan, review, save, next" workflow.

**Who does what:**
- **Processor** scans products at the pharmacy using a USB or Bluetooth barcode scanner connected to their device.
- **Admin** can also add items to any return manually.
- **Pharmacy** (in self-service mode) can scan and enter their own products.

**Important details:**
- Over 90% of bottles now have QR codes, making scanning the primary method.
- Each scanned item shows up in a product grid on the return detail page, where it can be edited or deleted.
- The summary automatically updates: total items, returnable value, non-returnable value, and total value.

---

### Module 5: Policy Engine

This is the most important business-rule step. It determines whether each scanned product can actually be returned.

**What happens:**
- Every manufacturer has a return policy stored in the system. This policy defines:
  - The **return window** — typically products can be returned from 6 months before expiration to 6 months after expiration (varies by manufacturer).
  - The **destination** — where the product gets sent (Inmar, Qualanex, or PharmaLink).
  - Whether **partial bottles** are accepted (and for which dosage forms).
  - The **discount rate** applied to the return value.
- When a product is scanned, the system automatically checks its NDC against the policy engine and classifies it:
  - **Returnable** — the product is within the return window and meets all policy requirements.
  - **Non-Returnable** — the product is outside the window, is a policy exception, or partials are not accepted.
  - **TBD (To Be Determined)** — no policy exists for this manufacturer, so a human needs to research it.
- Some specific products are exceptions — even if the manufacturer generally accepts returns, certain NDCs may be permanently non-returnable.

**Who does what:**
- **Admin** manages all manufacturer policies: creating, editing, and maintaining them. Admin adds return policy records (destination, timing windows, partial rules), non-returnable product exceptions, and policy notes.
- **Processor** sees the classification result immediately after scanning each product (green for returnable, red for non-returnable, yellow for TBD).
- **Pharmacy** does not directly interact with policies but sees the classification on their returned items.

**Important details:**
- Policies are organized by manufacturer (identified by labeler ID — the first 5 digits of an NDC).
- The average manufacturer pays about 73% of the ask price, and the average payment time is about 297 days.
- Admins can seed policy data in bulk via import.

---

### Module 6: Item Routing & Disposition

Once the policy engine classifies each item, it gets routed to the appropriate next step.

**What happens:**
- **Returnable items** stay in the current return and will be included on the shipping manifest when the return is finalized.
- **Non-returnable items (permanent)** go into a destruction workflow — they are scheduled for proper disposal.
- **Non-returnable items (timing)** — products that are too early to return but will become eligible in the future — are automatically moved to the **Wine Cellar** (aging inventory) for storage until they become returnable.
- **TBD items** go into a research queue where an admin can review them, look up the manufacturer's policy, and manually resolve them as either returnable or non-returnable.

**Who does what:**
- **Admin** resolves TBD items from a dedicated TBD Items page. They review each item, research the policy, and assign it as returnable (with a destination) or non-returnable (with a reason).
- **Admin** manages destruction records — scheduling and tracking the proper disposal of permanently non-returnable products.
- **Processor** sees classification results in real time during scanning. If an item is auto-moved to the Wine Cellar, they see a purple banner with the expected returnable date.

**Important details:**
- TBD items are grouped by return transaction for easy batch review.
- Items automatically sent to the Wine Cellar include the expected date when they will become returnable.
- Destruction records track the full lifecycle: pending, scheduled, completed, with FDA form numbers and witness information.

---

### Module 7: Wine Cellar System

The "Wine Cellar" is the storage system for products that are not yet eligible for return but will be in the future. Think of it like an aging room for medications that need to wait.

**What happens:**
- When a product's expiration timing means it's too early to return right now, the system stores it in the Wine Cellar with its expected returnable date.
- Products are physically bagged by store, labeled with barcodes, and placed on shelves. The system tracks: which shelf/location, the baggie barcode, the pharmacy it belongs to, and the expected date it can be returned.
- Every day at 2:00 AM, the system automatically checks all shelved items. Any item whose expected returnable date has passed gets its status changed from "Shelved" to "Ready to Return" — surfacing it for the next return cycle.
- When creating a new return for a pharmacy, the admin or processor can pull in Wine Cellar items that are ready, adding them directly to the return.

**Who does what:**
- **Admin** manages the Wine Cellar: viewing all items, filtering by status (shelved, ready to return, returned, destroyed), searching by product or pharmacy, and updating physical locations.
- **Admin** can manually trigger the "Check Ready Items" scan at any time (not just the daily 2 AM run).
- **Processor** can see Wine Cellar items for their assigned stores and pull ready items into new returns.
- **Pharmacy** does not directly interact with the Wine Cellar.

**Important details:**
- Items can arrive in the Wine Cellar automatically (from the policy engine during scanning) or be manually moved by an admin.
- The system tracks aging buckets: under 30 days, 30–90 days, 91–180 days, and over 180 days.
- Each item's physical location (shelf, barcode) is recorded so warehouse staff can find the actual product.

---

### Module 8: Return Finalization & Shipping

Once all products have been scanned and classified, the return is finalized and prepared for shipment.

**What happens:**
- The admin or processor first marks the return as "Completed" (meaning all scanning is done).
- Then they go through the finalization flow:
  1. The system shows a summary of returnable and non-returnable items with their values.
  2. If any items are still classified as TBD, the system blocks finalization with a red warning — all TBD items must be resolved first.
  3. The user enters the FedEx tracking number (required) and box count.
  4. The user prints the **manifest** — a PDF document listing all items, pharmacy info, processor info, and a summary of what's in the shipment.
  5. If there are Schedule II controlled substances (CII items), the user also prints a **DEA Form 222** — a required government form for controlled substance transfers.
  6. The user confirms via checkboxes that: the manifest is printed and included, the DEA form is printed (if applicable), and all items are verified.
  7. After clicking "Finalize Return," the return is permanently locked and ready for pickup.

**Who does what:**
- **Processor** or **Admin** completes the return, prints documents, enters tracking info, and finalizes.
- **Pharmacy** can see that their return has been finalized and shipped.

**Important details:**
- Finalization is permanent — once finalized, the return cannot be edited or deleted.
- The manifest and DEA forms are generated as PDF documents that can be viewed, printed, or downloaded.
- After finalization, the return detail page shows a "Documents" section for re-downloading the manifest and DEA form.

---

### Module 9: Warehouse Receiving

When the pharmacy's shipment arrives at the warehouse (headquarters), it needs to be checked in and verified.

**What happens:**
- Warehouse staff scans the FedEx tracking number on the incoming package. The system looks up the associated return and marks it as "Received" with a timestamp.
- The return then moves to a verification process:
  1. Staff opens the box and counts the pieces received (compared against the expected box count).
  2. Each individual item is verified — staff checks if it matches what the manifest says (correct product, quantity, condition).
  3. If something is wrong (missing items, extra items, damaged products, items from the wrong store), staff reports a discrepancy.
  4. Once all items are checked, staff confirms the overall integrity of the return and completes verification.

**Who does what:**
- **Admin / Warehouse Staff** receives packages by scanning tracking numbers, verifies contents item by item, and reports any discrepancies.
- **Processor** does not interact with this step.
- **Pharmacy** does not interact with this step but can see their return status updated to "Received."

**Important details:**
- The receiving page has three tabs: Scan & Receive (for incoming packages), Pending (finalized returns not yet received), and Received (returns awaiting verification).
- Discrepancies are categorized by type: missing, extra, damaged, wrong store, or other.
- The system tracks which items have been verified and which are still pending.

---

### Module 10: Monthly Batch & Close-Out

After returns are received and verified, they are grouped into monthly batches for processing with manufacturers.

**What happens:**
- An admin creates a monthly batch (e.g., "March 2026"). Each month typically has one batch.
- Received returns are assigned to the appropriate monthly batch. The system prevents assigning returns that haven't been received yet.
- When ready, the admin "closes" the batch. Closing triggers the system to automatically generate **debit memos** — grouped documents sent to manufacturers requesting credit. Debit memos are grouped by: pharmacy + destination + manufacturer (labeler). So if a pharmacy has returns going to both Inmar and Qualanex, they get separate memos.
- The system validates before closing: all items must have a destination assigned, and no TBD items should remain.
- After closing, the batch can be marked as "Submitted to Cardinal" (the distributor that facilitates the credit process).

**Who does what:**
- **Admin** creates monthly batches, assigns returns to them, closes batches (triggering debit memo generation), and tracks Cardinal submission status.
- **Processor** does not interact with batches.
- **Pharmacy** does not directly interact with batches but receives the results (credits and payments) later.

**Important details:**
- Each debit memo has a unique memo number, lists all items with their NDC, quantity, and ask price, and tracks the total value being requested from the manufacturer.
- The batch detail page shows all returns assigned to it and all debit memos generated from it.
- Debit memos can be viewed in an expandable accordion format showing full details: RA info, shipping info, payment status, and individual line items.

---

### Module 11: RA Request & Tracking

After debit memos are generated, Return Authorizations (RAs) must be requested from manufacturers before products can be shipped to them.

**What happens:**
- For each debit memo, the admin sends an RA request to the manufacturer's designated email address. The system generates the email content automatically, including: the debit memo number, pharmacy info, a list of all items (NDC, product name, quantity, ask price), and contact information.
- The system sets a "tickler date" — a follow-up reminder typically 14 days after the request is sent.
- The admin tracks the status of each RA: **Pending** (not yet requested), **Requested** (email sent, waiting for response), **Received** (manufacturer responded with an RA number), **Shipped** (product has been sent to the destination), and **Overdue** (past the tickler date with no response).
- If no response comes, the admin can resend a reminder email. Each reminder bumps the tickler date forward by 7 days.
- Once an RA number is received from the manufacturer, the admin records it in the system.
- After recording the RA, the admin can then record the outbound shipment — entering the tracking number for the package being sent to the manufacturer/destination.

**Who does what:**
- **Admin** manages the entire RA workflow: sending requests, tracking responses, recording RA numbers, resending reminders, and logging outbound shipments.
- **Processor** does not interact with RA tracking.
- **Pharmacy** does not interact with RA tracking.

**Important details:**
- The RA tracking page shows summary counts: how many are pending, requested, received, shipped, and overdue.
- Overdue rows are highlighted in red for visibility.
- Each debit memo's action buttons change based on its current status (e.g., "Request RA" when pending, "Resend" when requested, "Record RA" when waiting, "Ship" when RA is received).
- The email content is previewed before sending, and an alternative email address can be used if needed.

---

### Module 12: Manufacturer Payment Tracking

After products are shipped to manufacturers, the system tracks whether credits (payments) are actually received back.

**What happens:**
- The system maintains a view of all unpaid debit memos — showing how much was asked, how much has been received so far, and the outstanding balance.
- When a payment arrives from a manufacturer, the admin records it: the amount received, payment date, reference number, and any notes. The system automatically determines whether the payment is partial or full.
- The system provides "Ask vs Received" analytics — comparing what was originally requested to what was actually paid, broken down by manufacturer or by month. This reveals which manufacturers consistently underpay or take too long.
- A manufacturer summary view shows each manufacturer's overall performance: total memos, paid/unpaid counts, total amounts, average pay percentage, and average days to pay (compared against the policy-defined benchmarks).
- If a manufacturer hasn't paid, the admin can send a payment reminder email.

**Who does what:**
- **Admin** tracks payments, records received credits, sends reminders, and reviews analytics.
- **Processor** does not interact with payment tracking.
- **Pharmacy** does not directly interact with manufacturer payments (they receive their share in the next module).

**Important details:**
- The unpaid memos page has three tabs: Unpaid Memos (the queue), Ask vs Received (analytics), and Manufacturer Summary (performance overview).
- Payment status progresses from Pending → Partial → Paid.
- The average payment time across manufacturers is roughly 297 days (about 10 months), so this is a long-running tracking process.

---

### Module 13: Pharmacy & GPO Payout

Once credits are collected from manufacturers, the pharmacy needs to be paid its share.

**What happens:**
- The system calculates the pharmacy's payout based on:
  - **Total credit received** from manufacturers for that pharmacy's returned products
  - **Company fee** — a percentage retained by the returns processing company (configurable per calculation)
  - **GPO share** — if the pharmacy belongs to a GPO (Group Purchasing Organization), a share goes to the GPO
  - **Pharmacy payout** = Total Credit − Company Fee − GPO Share
- An admin creates a payment record for the pharmacy, selecting the payment method (wire transfer, check, Zelle, or cash) and entering a reference number.
- The payment goes through statuses: Pending → Processing → Paid (or Failed/Disputed if there's an issue).
- The system tracks all payments by pharmacy, with summary dashboards showing total credits, total fees, total payouts, and counts of paid vs pending payments.

**Who does what:**
- **Admin** calculates payouts, creates payment records, updates payment statuses, and tracks all pharmacy payments.
- **Pharmacy** sees their own payment history in their portal — a credit statement showing each payment with: date, batch month, credit received, company fee, GPO share, final payout amount, payment method, reference number, and status. They can also download their statement as a CSV file and filter by date range.
- **Processor** does not interact with payouts.

**Important details:**
- The pharmacy portal shows a summary: total credits received, total fees paid, total payouts, and a payout rate percentage.
- Pharmacies can see both the estimated value (what was originally expected) and the actual received amount.
- The payment summary page groups data by pharmacy for an admin overview.

---

### Module 14: Reporting & Analytics

The system provides comprehensive reporting and analytics dashboards for both admins and pharmacies.

**Admin Analytics Dashboard shows:**
- **Returns Summary** — total returns, total returnable value, total non-returnable value, total items, average return value, number of unique pharmacies. This can be viewed by month, by week, by status, or by service type.
- **Ask vs Received** — compares what was requested from manufacturers to what was actually paid. Can be broken down by manufacturer, by individual NDC, or by destination.
- **Aging Inventory (Wine Cellar)** — how many items are shelved, their total value, and aging buckets (under 30 days, 30–90 days, 91–180 days, over 180 days).
- **Outstanding RA** — how many RA requests are still waiting for responses, with aging buckets showing how long they've been waiting.
- **Unpaid Memos** — outstanding debit memos broken down by age, showing how much money is still owed.
- **Price Audit Trail** — tracks NDC price changes over time, showing old price, new price, source, and who changed it.
- **Pharmacy Performance** — per-pharmacy metrics: total returns, total value, average return value, total payout, sortable and searchable.
- **GPO Summary** — performance grouped by GPO affiliation: pharmacy count, total returns, total value, payout amounts.

**Pharmacy Analytics Dashboard shows:**
- **Overview** — total returns, total items, returnable vs non-returnable value, in-progress vs completed returns.
- **Financial** — credits received, company fees, GPO shares, payout amounts, estimated vs actual recovery with a recovery percentage.
- **Performance** — return trends over time (monthly chart).
- **Products** — top returned products by value.
- **Recent Returns** — the last 5 returns with quick status view.
- **Date Range Filter** — view data for the last 30 days, 90 days, 6 months, 12 months, or all time.

**Who does what:**
- **Admin** uses the admin analytics dashboard to monitor the overall business: returns volume, manufacturer payment performance, aging inventory, outstanding items, and per-pharmacy or per-GPO performance.
- **Pharmacy** uses their own analytics page to understand their return history, credit performance, and product trends — all scoped to only their own data.
- **Processor** does not have a dedicated analytics view.

---

## Summary: The End-to-End Flow

Here's what happens from start to finish:

1. **Store is set up** — Pharmacy is registered with all required details (Module 1)
2. **Users log in** — Each user type sees their appropriate view (Module 2)
3. **Return is created** — A unique license plate is generated for the return (Module 3)
4. **Products are scanned** — Each bottle is scanned, identified, and added to the return (Module 4)
5. **Policy engine classifies items** — Each product is checked against manufacturer policies (Module 5)
6. **Items are routed** — Returnable items stay, non-returnable items go to destruction or Wine Cellar, TBDs go to research (Module 6)
7. **Wine Cellar stores early items** — Products not yet eligible wait until their time comes (Module 7)
8. **Return is finalized and shipped** — Documents are printed, tracking is entered, return is locked (Module 8)
9. **Warehouse receives the shipment** — Package is checked in and contents are verified (Module 9)
10. **Returns are batched monthly** — Verified returns are grouped and debit memos are generated (Module 10)
11. **RA requests are sent** — Manufacturers are contacted for return authorization (Module 11)
12. **Manufacturer payments are tracked** — Credits are recorded as they come in (Module 12)
13. **Pharmacies get paid** — Their share is calculated and disbursed (Module 13)
14. **Everyone sees analytics** — Admins monitor the business, pharmacies see their performance (Module 14)
