# Checks Implementation Plan

**Goal**: Enhance the existing `/credits` page to include a "Checks" tab alongside the current Credits tab, matching the reference portal's functionality without creating a separate page.

## Target Portal & Implementation Location

### **Primary Portal**: Pharmacy Portal (Frontend)
- **Route**: `/credits` (`Frontend/app/(dashboard)/credits/page.tsx`) - EXISTING PAGE
- **Implementation**: Add "Checks" tab to existing page alongside "Credits" tab
- **Sidebar Location**: Keep under "Credits" menu item (no change needed)
- **User Access**: Pharmacy users with `credits:view` permission (existing)
- **Reference**: Based on `new portal/view_checks.html`

### **Supporting Backend APIs**
- **Main API**: `/api/pharmacy-payments/my-payments` (existing endpoint - extend functionality)
- **PDF API**: `/api/pharmacy-payments/check-pdf/:checkNumber` (new endpoint for PDF generation)
- **Database**: Enhanced `pharmacy_payments` table + new `payment_manufacturer_credits` table
- **Service**: `src/services/pharmacyPaymentService.ts` (extend existing)

### **Admin Portal Integration** (Optional Phase 2)
- **Admin Route**: `MainAdmin/app/(dashboard)/pharmacy-payments/page.tsx` (existing, enhance)
- **Admin PDF Access**: Admin can generate/view any pharmacy's check PDFs
- **Check Management**: Admin tools for check number generation and PDF regeneration

## Current State Analysis

### ✅ What We Already Have
- **Backend**: `pharmacy_payments` table with payment tracking
- **API**: `/api/pharmacy-payments/my-payments` endpoint working
- **Frontend**: `/credits` page showing payment history with tabs capability
- **Data Fields**: Basic payment amounts, fees, dates, status
- **UI Components**: Tabs, tables, filters, pagination, status badges
- **Existing Tab Structure**: Page already has "Payments" and "Credits" tabs - can add "Checks" tab

### ❌ What's Missing for Reference Portal Compliance

#### Database Schema Gaps
1. **Payment Type Classification**: No `payment_type` field (`'ocs'` | `'por'`)
2. **Check Numbers**: `payment_reference` exists but not formatted as 6-digit check numbers (e.g., 216461)
3. **Return Reference Linking**: Payments link to `batch_id` but no individual return RefNum (e.g., 3S15L)
4. **Manufacturer Breakdown Storage**: No detailed per-manufacturer credit amounts
5. **Direct Credit Tracking**: No separation of RSI-paid vs manufacturer-direct credits
6. **POR Credit Tracking**: No Pay-On-Receipt items with pedigree policy flags
7. **Account Numbers**: Missing pharmacy account numbers for check PDFs
8. **Check PDF Storage**: No PDF document storage/generation system

#### API Endpoint Gaps
1. **Check PDF Generation**: No endpoint for generating check PDFs
2. **OCS vs POR Data**: API doesn't return payment type classification
3. **Return Reference Data**: Missing RefNum in payment response
4. **Date Range Filtering**: No date range filter in existing API

#### Frontend Feature Gaps
1. **Checks Tab**: Missing third tab on `/credits` page
2. **Reference Portal Table Structure**: Missing specific columns from reference
3. **Date Range Picker**: No custom date range selection (existing filter doesn't match reference)
4. **Check Number Links**: No clickable check numbers opening PDFs
5. **OCS/POR Explanations**: Missing tooltips explaining OCS vs POR
6. **Totals Footer**: No dynamic totals row calculation matching reference portal

## Implementation Tasks

### Phase 1: Database Schema Updates
**Priority**: High | **Estimated Time**: 2-3 days

#### Task 1.1: Enhanced Payment Schema
- [ ] Add `payment_type` enum field: `'ocs'` | `'por'` | `'direct'`
- [ ] Add `check_number` field (6-digit format like 216461)
- [ ] Add `return_reference_number` field (format like 3S15L)
- [ ] Add `pharmacy_account_number` field
- [ ] Add `service_date` and `check_date` fields
- [ ] Create migration script for existing data classification

#### Task 1.2: Manufacturer Credit Breakdown Table
- [ ] Create `payment_manufacturer_credits` table:
  - `payment_id` (FK to pharmacy_payments)
  - `manufacturer_name` (e.g., "PFIZER", "SANOFI WINTHROP")
  - `credit_amount` (e.g., 1679.56)
  - `credit_type` (`'included'` | `'direct'` | `'por'`)
  - `is_controlled_substance` (boolean for CIII-CV notation)
- [ ] Create indexes for efficient querying
- [ ] Add validation and constraints

#### Task 1.3: Payment Summary Fields
- [ ] Add calculated fields to payments table:
  - `gross_credit_amount`
  - `included_credit_amount`
  - `direct_credit_amount`
  - `por_credit_amount`
  - `rsi_fee_included_percent`
  - `rsi_fee_direct_percent`
- [ ] Update helper functions to include new fields

### Phase 2: Backend API Enhancements
**Priority**: High | **Estimated Time**: 4-5 days

#### Task 2.1: Enhanced Payment API Response
- [ ] Include all new fields from schema update:
  - `checkNumber` (6-digit format)
  - `returnReferenceNumber` (e.g., "3S15L")
  - `paymentType` (`ocs`/`por`/`direct`)
  - `pharmacyAccountNumber`
  - `serviceDate` and `checkDate`
- [ ] Include manufacturer breakdown array:
  - `manufacturerCredits` with name, amount, type
  - Separate arrays for included/direct/por credits
- [ ] Include credit summary calculations:
  - `grossCredit`, `includedCredit`, `directCredit`, `porCredit`
  - RSI fee percentages and amounts

#### Task 2.2: Date Range Filtering
- [ ] Add date range parameters to `pharmacy_payment_my_payments` RPC
- [ ] Support preset ranges (this month, last month, this quarter, etc.)
- [ ] Support custom date range selection
- [ ] Maintain compatibility with existing pagination

#### Task 2.3: Check PDF Generation Service
**Location**: New endpoint `/api/pharmacy-payments/check-pdf/:checkNumber`

##### Check PDF Template Requirements (Based on RSICheck.pdf Analysis)

**✅ IMPLEMENTATION APPROACH: Puppeteer + HTML/CSS Template**

**Document Structure**:
1. **Header Section**:
   - RSI Company address (10635 Dutchtown Road, Carteret, NJ 07008)
   - Check number (e.g., 216461)
   - Check date (e.g., February 17, 2026)

2. **Check Format Section**:
   - "PAY TO THE ORDER OF:" with pharmacy name
   - Check amount in dollars (e.g., $2,889.06)
   - Amount written in words (TWO THOUSAND EIGHT HUNDRED EIGHTY-NINE & 06/100 DOLLARS)
   - Pharmacy address block
   - RSI signature line with check number

3. **Credit Breakdown Section**:
   - Return reference number (e.g., Ref # 3S15L)
   - Account number and service/check dates
   - **Manufacturers Included in Check**: List with individual amounts
   - **Direct Crediting Manufacturers**: List with expected amounts + explanation
   - **Pay-On-Receipt Items**: Separate section with pedigree policy explanation

4. **Credit Summary Section**:
   - Included in this check: $X,XXX.XX
   - Direct from manufacturer: $XXX.XX  
   - Gross Credit: $X,XXX.XX
   - RSI Fee calculations with percentages
   - TOTAL FOR CHECK: $X,XXX.XX

5. **Footer**: Page number (-- 1 of 1 --)

**Technical PDF Requirements**:
- [ ] Create HTML template matching RSICheck.pdf layout exactly
- [ ] Implement number-to-words conversion for check amounts
- [ ] Query manufacturer breakdowns from `payment_manufacturer_credits` table
- [ ] Calculate RSI fees with configurable percentages
- [ ] Separate manufacturer lists by credit type (included/direct/por)
- [ ] Include controlled substance (CIII-CV) notation where applicable
- [ ] Add pedigree policy explanations for POR items
- [ ] Format currency consistently throughout document
- [ ] Generate sequential 6-digit check numbers
- [ ] Include pharmacy address formatting from pharmacy table
- [ ] Implement Redis caching for generated PDFs (30-day expiry)
- [ ] Add PDF security/watermarking if required

### Phase 3: Frontend Page Enhancement
**Priority**: High | **Estimated Time**: 3-4 days

#### Task 3.1: Checks Tab Addition
**Location**: `Frontend/app/(dashboard)/credits/page.tsx` (MODIFY EXISTING)
- [ ] Add third tab button: "Checks" alongside existing "Payments" and "Credits" tabs
- [ ] Tab styling to match existing tab design
- [ ] Tab state management (activeTab = 'checks')
- [ ] Toggle between Credits tab logic and Checks tab logic

#### Task 3.2: Reference Portal Table Implementation
**Location**: `Frontend/app/(dashboard)/credits/page.tsx` - Checks tab section
**Reference**: Exact match to `new portal/view_checks.html` table
- [ ] Create conditional rendering for Checks tab table
- [ ] Implement table with exact columns:
  - Return Date, Reference Number, Date Paid, Check Number (clickable)
  - Check Amount, Credit Included, RSI Credit Fee
  - Manufacturer Direct Credit Fee, Credit Type (OCS/POR)
- [ ] Add dynamic totals footer with live calculations (matches reference)
- [ ] Implement sorting and pagination
- [ ] Add search functionality in table header

#### Task 3.3: Date Range Filter Component
**Location**: `Frontend/components/checks/DateRangeFilter.tsx` (new component, used in `/credits` page)
**Reference**: Exact match to `new portal/view_checks.html` filter section
- [ ] Create reusable date range component matching reference portal
- [ ] Implement dropdown with options: All Dates, This Month, Last Month, This Quarter, Last Quarter, This Year, Last 12 Months, Custom
- [ ] Add custom date picker inputs (start/end dates) with flatpickr
- [ ] Include submit button with loading spinner
- [ ] Handle date range validation and error states
- [ ] Integrate with existing `/credits` page filter section

#### Task 3.4: Check Details & PDFs
**Location**: Check number links in Checks tab table
**Reference**: Matches behavior from `new portal/view_checks.html` (opens PDF in new window)
- [ ] Make check numbers clickable with `cursor-pointer` styling
- [ ] Implement PDF opening in new browser tab (matches reference portal)
- [ ] Add loading state during PDF generation
- [ ] Handle PDF generation errors gracefully
- [ ] Ensure PDF displays correctly on mobile browsers
- [ ] Add PDF download option from opened tab

### Phase 4: UX Enhancements
**Priority**: Medium | **Estimated Time**: 2 days

#### Task 4.1: OCS vs POR Education
**Location**: Checks tab header section in `/credits` page
**Reference**: Exact match to tooltips in `new portal/view_checks.html`
- [ ] Add OCS tooltip: "You select the time-frame in which you want your credit due from RSI to be issued in a single check. We offer time-frames of 10, 30, 60, and 90 days. Typically 80-90% of your credit will be included in this check with the remainder being issued directly from certain manufacturers. RSI fees are deducted from the check."
- [ ] Add POR tooltip: "Certain characteristics of a return may cause drug manufacturers to require proof of where and for what price a product was purchased. If no invoices are provided product may be processed under our Pay-On-Receipt program whereby our customer is paid upon us receiving credit from the manufacturer. These checks are issued in addition to OCS checks, and fees for these credits are deducted from POR checks. An additional processing fee of 2-20% may apply."
- [ ] Style tooltips to match reference portal appearance

#### Task 4.2: Reference Portal Visual Matching
**Location**: `/credits` page styling and Checks tab layout
**Reference**: `new portal/view_checks.html` exact visual match
- [ ] Match header section with "RSI Check History" title and OCS/POR explanations
- [ ] Use same card layout with padding and styling
- [ ] Implement DataTables styling for table (bordered, striped rows)
- [ ] Match button styling (primary-btn class equivalent)
- [ ] Add search box in table header (DataTables style)
- [ ] Include pagination controls matching reference
- [ ] Ensure responsive design collapses appropriately on mobile

#### Task 4.3: Error States & Loading
- [ ] Add proper loading skeletons during data fetch
- [ ] Implement error states for failed PDF generation
- [ ] Add "no data found" states with helpful messaging
- [ ] Handle network timeouts gracefully
- [ ] Show appropriate messages when checks data is loading

### Phase 5: Testing & Polish
**Priority**: Low | **Estimated Time**: 1-2 days

#### Task 5.1: Data Migration Testing
- [ ] Test existing payment data classification
- [ ] Verify RefNum linking accuracy
- [ ] Validate check number uniqueness

#### Task 5.2: Integration Testing
- [ ] Test date range filtering with large datasets
- [ ] Verify PDF generation performance
- [ ] Test mobile responsiveness
- [ ] Cross-browser compatibility testing
- [ ] Test tab switching between Credits and Checks

#### Task 5.3: Performance Optimization
- [ ] Optimize payment queries with proper indexing
- [ ] Implement pagination for large result sets
- [ ] Add caching for frequently accessed check PDFs
- [ ] Monitor API response times

## Technical Decisions & Recommendations

### Decision 1: Page Architecture ✅ **REVISED: Keep Existing /credits Page**
**Question**: Should Checks be a separate page or part of Credits?
**Decision**: **Add Checks tab to existing `/credits` page**
**Rationale**: 
- Eliminates need for separate page routing and navigation changes
- Consolidates all financial data in one location
- Reduces sidebar clutter
- Reuses existing permission structure (`credits:view`)
- Matches reference portal's tab-based approach (implicit in design)
- Simpler implementation and deployment
- Users already familiar with `/credits` URL

### Decision 2: Check PDF Generation ✅ **RECOMMENDED: On-Demand**
**Question**: Generate PDFs on-demand or pre-generate?
**Decision**: **On-demand generation with caching**
**Rationale**:
- Check PDFs are complex documents that may need real-time data (manufacturer breakdowns)
- Storage costs would be significant for pre-generated PDFs
- On-demand allows for corrections/updates without regenerating entire archives
- Can implement Redis caching for frequently accessed checks
- 5-second target is achievable with proper optimization

### Decision 3: Data Migration Strategy ✅ **RECOMMENDED: Business Rule-Based**
**Question**: How to classify existing payments as OCS vs POR?
**Decision**: **Analyze debit_memo data to determine payment types**
**Rationale**:
- `debit_memos` table likely contains manufacturer and processing information
- Can create classification rules based on existing patterns:
  - If `pedigree_required` = true → POR
  - If manufacturer in "direct credit" list → Direct
  - Default to OCS for standard processing
- More accurate than defaulting all to OCS
- Can be validated and corrected by admin review

### Decision 4: Manufacturer Credit Data Source ✅ **RECOMMENDED: Reverse Engineer + Legacy Flag**
**Question**: Where to get detailed manufacturer breakdown for existing payments?
**Decision**: **Reverse engineer from debit_memos with legacy payment flag**
**Rationale**:
- Historical accuracy is important for financial records
- `debit_memos` table should contain manufacturer-level data
- For payments where data reconstruction isn't possible:
  - Add `is_legacy` flag to payments table
  - Show simplified PDF for legacy payments
  - Display message: "Detailed breakdown available for payments after [date]"
- Maintains data integrity while being transparent about limitations

### Decision 5: Check PDF Library Choice ✅ **RECOMMENDED: Puppeteer + HTML/CSS**
**Question**: Which PDF generation library to use?
**Decision**: **Puppeteer with HTML/CSS templates**
**Rationale**:
- Check format requires complex layouts (bank check style + tables + multiple sections)
- HTML/CSS provides exact control over typography and spacing
- Easier to maintain and modify templates
- Better support for responsive layouts
- Team likely more familiar with HTML/CSS than programmatic PDF libraries
- Can reuse existing UI components and styles
- Performance acceptable for 5-second target with proper optimization

## Success Metrics & Acceptance Criteria

### Functional Requirements
- [ ] **Exact Visual Match**: Checks tab table matches reference `view_checks.html` exactly (columns, styling, tooltips)
- [ ] **Tab Switching**: Seamless tab switching between Payments, Credits, and Checks tabs
- [ ] **Date Range Filtering**: Custom date ranges + presets load results under 2 seconds
- [ ] **Check PDF Generation**: Full check PDFs generate and display under 5 seconds
- [ ] **Check PDF Accuracy**: PDFs match RSICheck.pdf format with all sections and calculations
- [ ] **Mobile Responsiveness**: Lighthouse mobile score > 90%, tabs usable on mobile
- [ ] **Data Migration Success**: Zero errors in payment type classification and manufacturer data reconstruction

### Performance Benchmarks
- [ ] **Page Load**: Initial `/credits` page loads under 1.5 seconds
- [ ] **Table Sorting**: Column sorting completes under 500ms for 1000+ records
- [ ] **PDF Download**: Check PDF download initiates within 2 seconds of click
- [ ] **Search Functionality**: Table search results update in real-time under 300ms
- [ ] **Tab Switching**: Tab content loads without page reload under 500ms

### User Experience Validation
- [ ] **OCS vs POR Understanding**: User testing shows 80%+ can explain difference after using tooltips
- [ ] **Check PDF Usability**: Users can successfully locate and understand all sections in check PDF
- [ ] **Mobile Check Viewing**: Check PDFs readable and navigable on mobile devices
- [ ] **Error Handling**: Graceful error states for failed PDF generation, network issues
- [ ] **Data Transparency**: Users express increased confidence in payment tracking (survey feedback)

## Dependencies & File Locations

### **Frontend Files to Create/Modify**
- `Frontend/app/(dashboard)/credits/page.tsx` (MODIFY - add Checks tab and logic)
- `Frontend/components/checks/DateRangeFilter.tsx` (new - date filter component)
- `Frontend/components/checks/ChecksTable.tsx` (new - checks table component)
- `Frontend/lib/api/services/pharmacyPaymentService.ts` (MODIFY - add check-related methods)
- `Frontend/types/check.ts` (new - TypeScript types)

### **Backend Files to Create/Modify**
- `src/routes/pharmacyPaymentRoutes.ts` (MODIFY - add check PDF endpoint)
- `src/controllers/pharmacyPaymentController.ts` (MODIFY - add check PDF handler)
- `src/services/pharmacyPaymentService.ts` (MODIFY - extend for checks)
- `src/services/checkPdfService.ts` (new - PDF generation service)
- `scripts/fcr_xx_pharmacy_checks.sql` (new - database schema updates)
- `src/server.ts` (no change needed - routes already registered)

### **External Dependencies**
- **Database Access**: Required for schema changes in Supabase
- **PDF Generation Library**: Puppeteer (`npm install puppeteer`)
- **Redis Caching**: For PDF caching (`npm install redis`)
- **Number-to-Words Library**: For check amount conversion (`npm install number-to-words`)
- **Reference Portal Access**: For exact visual/functional matching

## Risk Factors
- **Data Migration Complexity**: Existing payments lack manufacturer breakdown data
- **PDF Generation Performance**: Complex check PDFs with manufacturer lists may be slow
- **Historical Data Accuracy**: May not have detailed manufacturer data for old payments
- **Check PDF Complexity**: RSI check format is very detailed with multiple sections
- **Mobile PDF Viewing**: Complex check PDF may not render well on mobile
- **Tab Switching Logic**: Need to maintain separate state for Payments vs Credits vs Checks filters
- **Manufacturer Name Consistency**: Need to ensure manufacturer names match across systems

## Timeline Summary

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Database Schema | 2-3 days | Design phase |
| Phase 2: Backend APIs | 4-5 days | Implementation pending |
| Phase 3: Frontend Enhancement | 3-4 days | Implementation pending |
| Phase 4: UX Enhancements | 2 days | Polish phase |
| Phase 5: Testing & Optimization | 1-2 days | Final phase |
| **Total Estimated Time** | **12-16 days** | - |

## Conclusion

By adding a Checks tab to the existing `/credits` page rather than creating a separate page, we:
- ✅ Reduce implementation complexity
- ✅ Keep navigation simpler for users
- ✅ Reuse existing infrastructure and permissions
- ✅ Maintain URL consistency
- ✅ Still deliver the exact reference portal functionality
- ✅ Provide consolidated financial data view