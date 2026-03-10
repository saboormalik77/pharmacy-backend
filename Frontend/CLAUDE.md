# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A comprehensive web-based SaaS platform for pharmacy reverse distributors to manage pharmaceutical returns, credits, and an integrated B2B marketplace. This is currently in the **mock UI development phase** - focus is on building the frontend interfaces with mock data before backend integration.

## Tech Stack

- **Frontend**: Next.js 14+ with App Router and TypeScript
- **Styling**: TailwindCSS
- **State Management**: React Query + Zustand
- **UI Components**: Headless UI / shadcn/ui
- **Icons**: Lucide React

## Development Commands

Since the project structure is not yet initialized, typical commands will be:

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Type checking
npx tsc --noEmit
```

## Project Architecture

### File Structure (Target)

```
/app
  /api                    # API routes (mock data responses)
  /(auth)                 # Authentication pages
    /login
    /register
    /forgot-password
  /(dashboard)            # Main application pages
    /dashboard
    /returns              # Returns management
    /shipments            # Shipment tracking
    /credits              # Credit management
    /marketplace          # B2B marketplace
    /analytics            # Reports and analytics
    /documents            # Document library
    /settings             # User settings
    /support              # Support tickets
  /(admin)                # Admin portal
    /admin
      /clients
      /processing
      /manufacturers
      /disputes
      /settings

/components
  /ui                     # Base UI components (buttons, inputs, etc.)
  /forms                  # Form components
  /layout                 # Layout components (sidebar, topbar, etc.)
  /charts                 # Chart components (wrappers around charting library)
  /marketplace            # Marketplace-specific components
  /returns                # Returns-specific components
  /admin                  # Admin-specific components

/lib
  /utils                  # Utility functions
  /hooks                  # Custom React hooks
  /constants              # Constants and enums
  /validation             # Form validation schemas (Zod)

/types                    # TypeScript type definitions

/data                     # Mock data for UI development
  mockClients.ts
  mockReturns.ts
  mockShipments.ts
  mockCredits.ts
  mockMarketplaceListings.ts
  mockTransactions.ts
  mockUsers.ts
```

### Core Domain Concepts

**Returns Management**: Pharmacies submit pharmaceutical returns via barcode scanning, manual entry, CSV upload, or photo OCR. Each return contains multiple line items (NDC, lot, expiration, quantity) and progresses through states: Draft → Ready to Ship → In Transit → Processing → Completed.

**Credit Processing**: After physical receipt, items are verified and classified. Credits are calculated based on manufacturer return policies. The system tracks expected vs actual credits with aging reports and payment timelines. Each manufacturer has a unique "lag schedule" defining payment milestones.

**Shipments & Chain of Custody**: Integrated label generation (UPS/FedEx/USPS), tracking, and digital chain of custody signatures. Real-time tracking updates via WebSocket.

**Marketplace**: B2B pharmaceutical marketplace where pharmacies can buy/sell excess inventory. Supports public and private listings, bulk pricing, seller ratings, and a multi-step checkout flow (request → seller approval → shipment → receipt confirmation).

**Admin Portal**: Staff interface for processing queue management, client approval, manufacturer configuration, dispute resolution, and system settings.

### Multi-Step Flows

**Registration Wizard** (5 steps): Basic Info → Address Info → Document Upload → Additional Details → Review & Submit

**Create Return Flow** (4 input methods): Barcode Scan | Manual Entry | CSV Upload | Photo OCR. All methods populate a batch that can be saved as draft or submitted.

**Marketplace Checkout**: Browse → Add to Cart → Review Order → Submit Purchase Request → Await Seller Approval → Shipment → Confirm Receipt → Rate Seller

**Processing Flow** (Admin): Scan shipment QR → Verify expected items → Scan each item → Flag discrepancies → Assess condition → Submit batch → Generate credits

## Development Approach

### Component Development Principles

1. **TypeScript First**: All components must have proper TypeScript types
2. **Accessibility**: Include ARIA attributes, keyboard navigation, focus management
3. **Loading States**: Always show skeleton loaders or spinners during async operations
4. **Error States**: Friendly error messages with recovery options
5. **Responsive Design**: Mobile-first approach, test on multiple breakpoints
6. **Server Components**: Use Next.js server components by default unless client interactivity is needed

### Data Validation

Important field validations to implement:

- **NPI Number**: 10 digits, numeric only
- **DEA Number**: 2 letters followed by 7 digits (e.g., AB1234563)
- **NDC**: Multiple formats (10 or 11 digits with dashes), normalize to consistent format
- **Expiration Date**: MM/YYYY format, must be future date for listings, can be past for returns
- **Lot Numbers**: Alphanumeric, varies by manufacturer

### Mock Data Strategy

During UI development, create realistic mock data that represents edge cases:

- Returns with varying item counts (1 item vs 50+ items)
- Different return statuses and state transitions
- Credits with variance (expected vs actual)
- Marketplace listings with different expiration dates, pricing
- Users with different roles (pharmacy admin, staff, processor, admin)
- Manufacturers with different payment schedules

Use `/data` directory for mock data and `/lib/mockApi.ts` for simulated API calls with realistic latency.

### Key UI Patterns

**Status Timelines**: Used throughout the app (returns, shipments, orders). Show visual progress with timestamps and user actions.

**Batch Operations**: Many tables support multi-select with bulk actions (returns, listings, documents). Include selection counter and progress feedback.

**Filter Panels**: Complex filter interfaces collapse on mobile into modals. Always include "Clear all" and show active filter count.

**Form Wizards**: Multi-step forms show progress, allow navigation between steps, validate each step before proceeding, and provide edit capability in review step.

**Real-time Updates**: WebSocket integration for shipment tracking, new messages, credit alerts, and marketplace activity. Show connection status indicator.

## Critical Business Rules

- **DEA License Verification**: Required for marketplace transactions. Both buyer and seller must have valid DEA licenses on file.
- **Storage Conditions**: Track temperature requirements (room temp, refrigerated, frozen) throughout shipment and in marketplace listings.
- **Expiration Windows**: Marketplace buyers often filter by minimum time to expiration (e.g., 6+ months). Show clear expiration badges.
- **Commission Structure**: Platform takes commission on marketplace sales. Display clearly during listing creation.
- **Return Eligibility**: Not all items are returnable. Some go to destruction. Classification affects credit calculation.

## Component Examples

When building new components, reference the detailed component specifications in `cluade.readme` which includes:

- Exact form fields and validation rules
- Table columns and actions
- Modal content and flow
- Status badge variants
- Filter options

## Testing Considerations

- Test barcode scanning with both hardware scanners (enter key submission) and mobile camera
- Verify responsive layouts on mobile, tablet, and desktop
- Test form validation for all edge cases
- Ensure accessibility with keyboard navigation and screen readers
- Test file upload with various file types and sizes

## Design System

Follow these conventions for consistency:

- **Status Colors**: Pending (gray), In Progress (blue), Success (green), Error (red), Warning (yellow)
- **Button Hierarchy**: Primary action (solid), secondary (outline), tertiary (ghost), destructive (red)
- **Spacing**: Use Tailwind spacing scale consistently (4px base unit)
- **Typography**: Clear hierarchy with consistent font sizes
- **Touch Targets**: Minimum 44px for mobile interaction
