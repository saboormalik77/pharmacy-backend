# Client Requirements & Configuration

## Required Client Information

### 1. RA Email Format
**Current Implementation:**
- System sends RA requests/reminders via email templates
- Recipients: `reverse_distributors.contact_email` matched by destination name
- Templates include: memo number, pharmacy name, item count, total ask value
- Multiple email services supported (Supabase Edge Function, Resend, Nodemailer)

**Required from Client:**
- [ ] **Reverse Distributor Contact Details**: Complete `reverse_distributors` table with:
  - Distributor names (Inmar, PharmaLink, etc.)
  - Contact email addresses for each distributor
  - Phone numbers
  - Active status
- [ ] **Email Template Preferences**: Confirm current RA email format meets requirements
- [ ] **SMTP Configuration**: Email service credentials for production

**Question for Client:** *Is the current RA email format acceptable, or do you need specific template modifications?*

---

### 2. Cardinal Invoice Format
**Current Implementation:**
- Placeholder CSV export with columns: `License Plate,Pharmacy,Items,Returnable Value,Non-Returnable Value,Status`
- Generated from batch data in browser
- Workflow tracking: `cardinal_file_generated`, `cardinal_submitted_at`, `cardinal_approved_at`

**Required from Client:**
- [ ] **Official Cardinal File Specification**: Complete format requirements
- [ ] **Column Mapping**: Which data fields Cardinal expects
- [ ] **File Delivery Method**: How files should be transmitted to Cardinal
- [ ] **Approval Workflow**: Cardinal's response/confirmation process

**Note:** Current CSV is a placeholder - real Cardinal format needed for production.

---

### 3. FedEx Paid Account Keys
**Current Implementation:**
- OAuth integration with FedEx Ship API
- Supports shipment creation, pickup scheduling, label generation
- Charges sender account (your FedEx account)

**Required from Client:**
- [ ] **Production FedEx Credentials:**
  - `FEDEX_API_KEY`
  - `FEDEX_SECRET_KEY` 
  - `FEDEX_ACCOUNT_NUMBER`
- [ ] **Warehouse Address**: Complete shipping address in Admin Settings
- [ ] **Warehouse Phone**: 10-digit phone number for FedEx
- [ ] **Service Preferences**: Default FedEx service type (Ground, Express, etc.)

**Current Status:** System uses sandbox environment - production keys needed for live shipping.

---

### 4. Credit Memo Format
**Current Implementation:**
- PDF upload required when recording manufacturer payments
- Stored in Supabase Storage bucket `documents`
- URL saved to `debit_memos.credit_memo_url`
- Payment recording blocked until memo is shipped

**Required from Client:**
- [ ] **Credit Memo Standards**: Required PDF format/content
- [ ] **File Storage Preferences**: Confirm Supabase Storage is acceptable
- [ ] **Validation Rules**: Any specific requirements for credit memo content

**Question for Client:** *Are there specific format requirements for credit memo PDFs, or is any manufacturer-provided PDF acceptable?*

---

## Implementation Questions

### Current Payment Flow
**How it works:**
1. **Manufacturer Payments**: System tracks payments received from manufacturers on debit memos
   - Records: amount received, payment date, reference, credit memo PDF
   - Status: pending → partial → paid
   - Requires memo to be shipped before payment recording

2. **Pharmacy Payouts**: Separate calculation of money owed to pharmacies
   - Formula: (Total manufacturer payments - Company fee %) - GPO share %
   - Default: 27% company fee, 0% GPO share
   - Manual payout methods: wire, check, Zelle, cash

**Question for Client:** *Is this payment flow structure correct for your business model?*

---

### Multiple Outlets for Distributors
**Current Implementation:**
- Single `reverse_distributors` entry per destination name
- Routing by exact name match: `debit_memos.destination` → `reverse_distributors.name`
- One contact email and address per distributor

**Question for Client:** *If Inmar/PharmaLink have multiple facilities, how should we determine routing? Do you need:*
- [ ] Geographic routing based on pharmacy location?
- [ ] Product-type based routing?
- [ ] Manual selection per shipment?
- [ ] Multiple distributor entries (e.g., "Inmar East", "Inmar West")?

---

### GPO Payment Structure
**Current Implementation:**
- GPO affiliation stored on pharmacy record
- GPO receives percentage of total manufacturer payments
- No automated GPO payment processing - manual tracking only
- GPO name copied to payout records for reporting

**Questions for Client:**
- [ ] **GPO Payment Method**: How are GPO payments actually processed?
- [ ] **GPO Percentage**: Is this fixed per GPO or varies by pharmacy?
- [ ] **GPO Reporting**: What reports do GPOs need?
- [ ] **GPO Bank Details**: Do you need automated GPO payment processing?

---

## Next Steps
1. **Review current implementations** - confirm they meet your requirements
2. **Provide missing configuration data** - especially FedEx credentials and distributor contacts
3. **Clarify routing logic** - for multiple distributor outlets
4. **Define Cardinal format** - replace placeholder with real specification
5. **GPO payment process** - determine automation needs

**Priority Items:**
- [ ] FedEx production credentials (for live shipping)
- [ ] Reverse distributor contact database
- [ ] Cardinal file specification
- [ ] Multi-outlet routing decisions