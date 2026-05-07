# PharmAnalytics - UI Modules Documentation

## Overview

PharmAnalytics is a data analytics platform designed to help pharmacies maximize their returns by identifying which reverse distributor pays the best price for each medication (NDC code). This document provides a comprehensive overview of each UI module, its purpose, and functionality.

---

## Table of Contents

1. [Authentication Modules](#authentication-modules)
2. [Dashboard Module](#dashboard-module)
3. [Upload Documents Module](#upload-documents-module)
4. [My Products Module](#my-products-module)
5. [Analytics & Reports Module](#analytics--reports-module)
6. [Optimization Module](#optimization-module)
7. [Documents Module](#documents-module)
8. [Subscription Module](#subscription-module)
9. [Layout Components](#layout-components)
10. [Data Models](#data-models)

---

## Authentication Modules

### Login Page (`app/(auth)/login/page.tsx`)

**Purpose:**
- Provides secure authentication for pharmacy users
- First point of entry for accessing the analytics platform

**Features:**
- Email and password login form
- Professional medical-themed design
- Responsive layout for mobile and desktop
- Redirects to dashboard upon successful login

**How it Works:**
- User enters email and password
- Form validates input fields
- On submit, authenticates user (currently using mock authentication)
- Stores user session in localStorage
- Redirects to `/dashboard` upon success

**UI Elements:**
- Centered card layout with gradient background
- PharmAnalytics branding
- "Maximize your returns with data-driven insights" tagline
- Link to registration page

---

### Register Page (`app/(auth)/register/page.tsx`)

**Purpose:**
- Multi-step registration process for new pharmacy accounts
- Collects essential pharmacy information for account setup

**Features:**
- 3-step registration wizard:
  1. **Step 1: Basic Information**
     - Pharmacy Name
     - NPI Number (10 digits)
     - DEA Number (9 characters)
  2. **Step 2: Contact Details**
     - Contact Name
     - Email Address
     - Phone Number
  3. **Step 3: Account Setup**
     - Password creation
     - Terms and conditions acceptance
     - Review of entered information

**How it Works:**
- Progress indicator shows current step (1 of 3)
- Form validation at each step
- "Back" button to navigate to previous step
- "Next" button to proceed to next step
- Final step creates account and redirects to dashboard

**UI Elements:**
- Visual progress bar showing 3 steps
- Step-by-step form fields
- Review section in final step
- Terms and conditions checkbox

---

## Dashboard Module

### Analytics Dashboard (`app/(dashboard)/dashboard/page.tsx`)

**Purpose:**
- Central hub displaying key metrics and insights
- Quick overview of platform activity and potential savings
- Entry point for accessing all major features

**Key Metrics Displayed:**
1. **Documents** - Total number of uploaded credit reports
2. **Distributors** - Number of reverse distributors tracked
3. **NDC Codes** - Total unique product codes analyzed
4. **Data Points** - Total pricing data points collected
5. **Potential Savings** - Estimated savings from optimization
6. **This Month** - Documents uploaded in current month

**Main Sections:**

#### Top Recommendations Widget
- Shows top 3 product recommendations
- Displays best distributor for each product
- Shows potential savings per unit
- Quick link to full optimization page

#### Recent Documents Widget
- Lists 5 most recently uploaded documents
- Shows document status (Completed, Processing, Failed, Needs Review)
- Displays extracted items count and credit amounts
- Quick access to full documents page

#### Analytics Summary Cards
1. **Document Activity**
   - Total documents
   - Documents this month
   - Last upload date

2. **Data Insights**
   - Total NDC codes
   - Total data points
   - Average price variance percentage

3. **Optimization**
   - Potential savings amount
   - Distributors tracked
   - Link to recommendations

**How it Works:**
- Fetches summary data from mock analytics
- Displays real-time metrics
- All metric cards are clickable and link to relevant pages
- Responsive grid layout adapts to screen size

**UI Design:**
- Color-coded metric cards (teal, cyan, emerald, amber, purple, slate)
- Gradient backgrounds for visual appeal
- Hover effects on interactive elements
- Professional medical theme

---

## Upload Documents Module

### Upload Documents Page (`app/(dashboard)/upload/page.tsx`)

**Purpose:**
- Primary interface for uploading credit reports from reverse distributors
- Supports multiple upload methods for flexibility
- Processes PDF documents to extract pricing data

**Upload Methods:**

#### 1. Manual Upload
- **Drag & Drop Interface**
  - Visual drop zone for PDF files
  - Supports multiple file selection
  - Shows file preview with name and size
  - Remove individual files before upload
  
- **Distributor Selection**
  - Dropdown menu with all tracked reverse distributors
  - Required field before upload
  - Helps categorize documents by source

- **File Management**
  - List of selected files with details
  - File size display
  - Remove files individually
  - Upload all files at once

#### 2. Email Integration
- **Purpose:** Automated document processing via email forwarding
- **How it Works:**
  - User forwards credit report emails to system
  - Documents are automatically processed
  - Requires email configuration in settings
- **UI:** Information card with setup instructions and link to settings

#### 3. Portal Auto-Fetch
- **Purpose:** Automatically fetch documents from distributor portals
- **How it Works:**
  - System logs into distributor portals using stored credentials
  - Automatically downloads credit reports
  - Processes documents without manual intervention
- **UI:** Information card with link to credential management

**Processing Status:**
- **Uploading** - Files being uploaded to server
- **Processing** - Documents being parsed and data extracted
- **Completed** - Successfully processed, data available
- **Needs Review** - Some items couldn't be automatically extracted
- **Failed** - Processing error, requires attention

**How it Works:**
1. User selects upload method
2. For manual upload: Select distributor and files
3. Drag and drop or click to select PDF files
4. Files are validated (PDF format only)
5. Upload button processes all files
6. Progress indicator shows upload status
7. Documents appear in Documents page for tracking

**UI Features:**
- Large, accessible drag-and-drop area
- Visual feedback during drag operations
- File list with remove functionality
- Status badges for each upload method
- Information sidebar with supported formats

---

## My Products Module

### Products Page (`app/(dashboard)/products/page.tsx`)

**Purpose:**
- Manage products (NDC codes) for return optimization
- Create product lists for batch processing
- Multiple input methods for flexibility

**Tabs:**

#### 1. Scan Barcode Tab
- **Purpose:** Quick product entry via barcode scanning
- **Features:**
  - Camera interface simulation
  - Start/Stop scanning button
  - Automatic NDC code detection
  - Preview of scanned code
  - Add to list functionality

**How it Works:**
- User clicks "Start Scanning"
- Camera preview appears (simulated)
- Barcode is scanned and NDC code extracted
- Scanned code appears in preview box
- User can add product to current list

#### 2. Manual Entry Tab
- **Purpose:** Enter products manually with full details
- **Fields:**
  - NDC Code (required) - Format: XXXXX-XXXX-XX
  - Quantity (default: 1)
  - Lot Number (optional)
  - Expiration Date (optional)
  - Notes (optional)

**How it Works:**
- User enters NDC code (with or without dashes)
- System validates NDC format
- Additional details can be added
- Product is added to current list

#### 3. Bulk Upload Tab
- **Purpose:** Upload multiple products via CSV/Excel file
- **Supported Formats:**
  - CSV (.csv)
  - Excel (.xlsx, .xls)

**Expected CSV Format:**
```
NDC,Product Name,Quantity,Lot Number,Expiration Date
00093-2263-01,Amoxicillin 500mg,100,LOT-001,2025-06-30
```

**How it Works:**
- User uploads CSV/Excel file
- System parses file and extracts product data
- Products are added to current list
- Validation ensures data integrity

#### 4. Product Lists Tab
- **Purpose:** View and manage saved product lists
- **Features:**
  - List of all saved product lists
  - Product count per list
  - Last updated date
  - Quick preview of products
  - View details button

**Product List Display:**
- Shows all products in current session
- Search functionality to filter products
- Product details: NDC, name, quantity, lot, expiration
- Remove products individually
- Statistics sidebar showing totals

**How it Works:**
- Products added via any method appear in current list
- User can search/filter products
- Products can be removed individually
- Lists can be saved for future use
- Statistics update in real-time

**Sidebar Features:**
- Quick actions (Create List, Export, Search NDC Database)
- Statistics (Total Products, Product Lists count)

---

## Analytics & Reports Module

### Reports Page (`app/(dashboard)/reports/page.tsx`)

**Purpose:**
- Comprehensive price comparison analysis
- View pricing data across multiple reverse distributors
- Identify best prices for each NDC code

**Main Features:**

#### Price Comparison Cards
Each product displays:
- **Product Information**
  - Product name
  - NDC code
  - Manufacturer

- **Distributor Price Comparison**
  - Average price per unit for each distributor
  - Price range (min-max)
  - Number of data points
  - Last updated timestamp
  - Visual indicator for best price

- **Best Distributor Highlight**
  - Clearly marked best price option
  - Savings calculation per unit
  - Recommendation text

**Filtering & Search:**
- Search by NDC code or product name
- Filter by distributor
- Additional filters (status, date range, etc.)

**How it Works:**
1. System aggregates pricing data from all uploaded documents
2. Calculates average prices per distributor per NDC
3. Identifies best price for each product
4. Displays comparison cards with recommendations
5. Updates in real-time as new data is added

**Summary Statistics:**
- Products Analyzed count
- Distributors tracked
- Average Price Variance percentage
- Total Potential Savings

**UI Design:**
- Color-coded distributor cards
- Best price highlighted in green
- Price differences shown with trend indicators
- Responsive grid layout

---

## Optimization Module

### Optimization Page (`app/(dashboard)/optimization/page.tsx`)

**Purpose:**
- Generate actionable recommendations for maximum returns
- Show potential savings from using optimal distributors
- Provide detailed product-by-product guidance

**Key Features:**

#### Summary Card
- **Total Potential Savings**
  - Large, prominent display
  - Based on all recommendations
  - Number of products included

#### Product Recommendations
Each recommendation includes:

1. **Recommended Distributor**
   - Best price option highlighted
   - Expected price per unit
   - Potential savings amount

2. **Alternative Options**
   - Other distributors with prices
   - Price difference calculation
   - Comparison to recommended option

3. **Savings Calculation**
   - Per-product savings
   - Total potential savings
   - Visual savings indicator

**How it Works:**
1. User can generate new recommendations
2. System analyzes all product lists and pricing data
3. Compares prices across all distributors
4. Identifies optimal distributor for each product
5. Calculates potential savings
6. Generates detailed recommendations

**Actions:**
- **Generate New** - Create fresh recommendations
- **Export Report** - Download recommendations as PDF/CSV
- **View Full Analysis** - Detailed breakdown per product

**How It Works Section:**
- Explains the optimization process
- Product Analysis → Price Comparison → Recommendations
- Educational content for users

**UI Design:**
- Prominent savings display
- Color-coded recommendation cards
- Clear visual hierarchy
- Action buttons for next steps

---

## Documents Module

### Documents Page (`app/(dashboard)/documents/page.tsx`)

**Purpose:**
- View and manage all uploaded documents
- Track processing status
- Access document details and extracted data

**Features:**

#### Status Filtering
- **All** - View all documents
- **Completed** - Successfully processed
- **Processing** - Currently being processed
- **Needs Review** - Requires manual review
- **Failed** - Processing errors

#### Document List
Each document card shows:
- **File Information**
  - File name
  - File size
  - Upload date
  - Source (Manual, Email, Portal)

- **Status Indicator**
  - Color-coded status badge
  - Processing progress bar (if applicable)
  - Error messages (if failed)

- **Extracted Data**
  - Number of items extracted
  - Total credit amount (if available)
  - Reverse distributor name

- **Actions**
  - View document details
  - Download processed data
  - Retry processing (if failed)

**Processing Progress:**
- Real-time progress bar for processing documents
- Percentage complete
- Estimated time remaining

**How it Works:**
1. Documents appear in list after upload
2. Status updates automatically as processing progresses
3. Completed documents show extracted data
4. Failed documents show error messages
5. User can view details or retry failed documents

**Search & Filter:**
- Search by file name or distributor
- Filter by status
- Sort by date, status, or size

**UI Design:**
- Status color coding (green=completed, blue=processing, red=failed, yellow=needs review)
- Progress indicators for active processing
- Hover effects for better UX
- Responsive table/card layout

---

## Subscription Module

### Subscription Page (`app/(dashboard)/subscription/page.tsx`)

**Purpose:**
- Manage subscription plan and billing
- View current plan features and limits
- Update payment methods
- Configure integrations

**Main Sections:**

#### Current Plan Display
- **Plan Information**
  - Plan name and icon
  - Monthly/yearly pricing
  - Current status (Active, Trial, Expired, etc.)
  - Next billing date

- **Plan Features**
  - List of included features
  - Feature limits (documents, distributors)
  - Support level

- **Payment Method**
  - Card brand and last 4 digits
  - Expiration date
  - Update payment button

#### Available Plans
Four subscription tiers:

1. **Free Plan**
   - $0/month
   - 5 documents/month
   - 3 distributors
   - Basic analytics
   - Email support

2. **Basic Plan**
   - $49/month
   - 25 documents/month
   - 5 distributors
   - Advanced analytics
   - Priority email support
   - Optimization recommendations

3. **Premium Plan** (Recommended)
   - $99/month
   - Unlimited documents
   - Unlimited distributors
   - Full analytics suite
   - Email integration
   - Portal auto-fetch
   - API access
   - Priority support

4. **Enterprise Plan**
   - $299/month
   - Everything in Premium
   - Dedicated account manager
   - Custom integrations
   - White-label options
   - SLA guarantees

**Plan Comparison:**
- Side-by-side feature comparison
- Current plan highlighted
- Easy plan selection
- Upgrade/downgrade options

#### Integration Settings
- **Email Integration**
  - Configure email forwarding
  - Set up automatic processing
  - Link to email setup

- **Portal Auto-Fetch**
  - Manage distributor portal credentials
  - Enable/disable auto-fetch
  - View sync status

**How it Works:**
1. User views current plan and features
2. Can update payment method
3. Can change subscription plan
4. Can cancel subscription (with confirmation)
5. Can configure integrations for automation

**Actions:**
- **Change Plan** - Upgrade or downgrade subscription
- **Cancel Subscription** - End subscription at period end
- **Reactivate** - Restore cancelled subscription
- **Update Payment** - Change credit card information

**UI Design:**
- Plan cards with clear pricing
- Feature checkmarks
- Current plan highlighted
- Professional billing interface

---

## Layout Components

### Dashboard Layout (`components/layout/DashboardLayout.tsx`)

**Purpose:**
- Main application wrapper
- Provides consistent layout structure
- Manages sidebar and main content area

**Features:**
- Responsive sidebar (collapsible on mobile)
- Mobile menu overlay
- Main content area
- Integrated chatbot

**How it Works:**
- Wraps all dashboard pages
- Manages sidebar open/close state
- Handles mobile responsiveness
- Provides consistent navigation

---

### Sidebar (`components/layout/Sidebar.tsx`)

**Purpose:**
- Primary navigation menu
- Quick access to all major features
- User context and branding

**Navigation Items:**
1. Dashboard
2. Upload Documents
3. My Products
4. Analytics & Reports
5. Optimization
6. Documents
7. Notifications

**Footer Links:**
- Settings
- Subscription
- Support

**Features:**
- Active route highlighting
- Icon-based navigation
- Collapsible on mobile
- PharmAnalytics branding

---

### Top Bar (`components/layout/TopBar.tsx`)

**Purpose:**
- Header bar with user information
- Mobile menu toggle
- Notification access
- User profile

**Features:**
- Mobile hamburger menu
- Notification dropdown
- User name and pharmacy name
- Profile avatar

---

## Data Models

### Type Definitions (`types/index.ts`)

**Core Types:**

#### Pharmacy & User Types
- `Pharmacy` - Pharmacy account information
- `User` - User account details
- `Address` - Address structure

#### Reverse Distributor Types
- `ReverseDistributor` - Distributor information
  - Name, code, contact info
  - Portal URL
  - Supported file formats

#### Document Types
- `UploadedDocument` - Document metadata
  - File information
  - Processing status
  - Extracted data counts
  - Source (manual, email, portal)

#### Pricing Data Types
- `PricingData` - Individual pricing record
  - NDC code
  - Distributor
  - Price per unit
  - Credit amount
  - Payment date

- `PriceComparison` - Aggregated comparison
  - Product information
  - Distributor prices
  - Best distributor
  - Recommendations

#### Product Types
- `Product` - Product information
- `ProductList` - Collection of products
- `ProductListItem` - Individual product in list

#### Analytics Types
- `AnalyticsSummary` - Dashboard summary data
- `OptimizationRecommendation` - Optimization results

#### Subscription Types
- `Subscription` - Current subscription details
- `SubscriptionPlanDetails` - Plan information

---

## Mock Data Files

### Purpose
All mock data files provide sample data for UI development and testing without backend integration.

### Files:
1. **mockDistributors.ts** - Reverse distributor data
2. **mockDocuments.ts** - Uploaded document samples
3. **mockPricing.ts** - Pricing data and comparisons
4. **mockProducts.ts** - Product lists and items
5. **mockAnalytics.ts** - Analytics summaries and recommendations
6. **mockSubscription.ts** - Subscription plans and current subscription

---

## UI Design System

### Color Scheme
- **Primary:** Teal/Cyan (Professional medical theme)
- **Success:** Emerald/Green
- **Warning:** Amber/Yellow
- **Error:** Red
- **Info:** Cyan/Blue

### Components
- **Cards** - Rounded corners, subtle shadows
- **Buttons** - Multiple variants (primary, outline, ghost)
- **Badges** - Status indicators with colors
- **Inputs** - Clean, accessible form fields

### Responsive Design
- Mobile-first approach
- Breakpoints: sm, md, lg
- Collapsible sidebar on mobile
- Adaptive grid layouts

---

## Key Features Summary

### Data Collection
- Multiple upload methods (Manual, Email, Portal)
- PDF document processing
- Automatic data extraction

### Analytics
- Price comparison across distributors
- Best price identification
- Savings calculations
- Historical data tracking

### Optimization
- Product-specific recommendations
- Distributor selection guidance
- Potential savings estimates
- Batch processing support

### User Experience
- Intuitive navigation
- Real-time status updates
- Comprehensive search and filtering
- Mobile-responsive design

---

## Future Integration Points

### Backend API Endpoints Needed:
1. `/api/documents/upload` - Document upload
2. `/api/documents/process` - Document processing status
3. `/api/pricing/comparison` - Price comparison data
4. `/api/products` - Product management
5. `/api/optimization/generate` - Generate recommendations
6. `/api/subscription` - Subscription management
7. `/api/auth` - Authentication

### External Integrations:
1. PDF parsing service
2. Email forwarding service
3. Portal scraping service
4. Payment processing (Stripe, etc.)
5. Barcode scanning library

---

## Conclusion

This documentation provides a comprehensive overview of all UI modules in the PharmAnalytics platform. Each module is designed to work independently while contributing to the overall goal of helping pharmacies maximize their returns through data-driven insights.

All modules are currently UI-only with mock data, ready for backend integration when the API endpoints are available.

