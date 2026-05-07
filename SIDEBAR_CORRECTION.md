# Sidebar Correction - What Users Actually See

**IMPORTANT CORRECTION:** The main UX analysis document incorrectly referenced some features as "missing from sidebar" when they are actually **commented out in code** and not intended to be visible.

## Actual Current Sidebar (what users see today)

**Main Navigation Section:**
1. **Returns** → `/returns`
2. **Create Return** → `/returns/create` 
3. **TBD Items** → `/returns/tbd-items`
4. **Destruction** → `/returns/destruction`
5. **Wine Cellar** → `/wine-cellar`
6. **Credits** → `/credits`
7. **Analytics & Reports** → `/analytics`

**Bottom Section:**
8. **Branches** → `/branches` (parent orgs only)
9. **Roles & Permissions** → `/roles` (parent orgs only) 
10. **Settings** → `/settings`

**Total visible items:** 7-10 items (depending on permissions)

## Routes That Exist But Are NOT In Sidebar

These routes exist in the app but are **intentionally commented out** of the sidebar:

- My Products (`/products`) - commented out, lines 112-116
- Search/Optimization (`/optimization`) - commented out, lines 118-122
- Marketplace (`/marketplace`) - commented out, lines 124-128
- Orders (`/orders`) - commented out, lines 130-134
- Inventory Analysis (`/inventory-analysis`) - commented out, lines 136-140
- Upload Documents (`/upload`) - commented out, lines 154-158
- Verification (`/warehouse/verification`) - commented out, lines 160-164
- Surplus Inventory (`/warehouse/surplus`) - commented out, lines 166-170
- Subscription (`/subscription`) - commented out, lines 193-197

## Routes That Exist But Have No Sidebar Entry At All

These exist in the app structure but were never added to the sidebar:

- Dashboard (`/dashboard`)
- Support (`/support`)  
- Notifications (`/notifications`)
- Documents (`/documents`)
- Shipments (`/shipments`)
- Payments (`/payments`) - separate from Credits
- Reports (`/reports`) - separate from Analytics
- Inventory (`/inventory`)
- Packages (`/packages`)
- Warehouse (`/warehouse`)
- Barcode Generator (`/barcode-generator`)

## Updated Gap Analysis

**The real navigation issue is:**
1. Some routes are **intentionally commented out** (marketplace, orders, inventory analysis, etc.) - decision needed: ship them or remove them entirely
2. Some routes **exist but were never added** to sidebar (dashboard, support, reports, etc.) - decision needed: add to sidebar or remove routes
3. The current 7-10 visible items may be the **intended scope** - but then unused routes should be cleaned up

**Corrected Task T-N1:** 
Build a sidebar that matches the intended product scope - either:
- Add missing routes that should be discoverable (Dashboard, Support, separate Reports)
- OR remove/archive routes that shouldn't exist (commented out + unused ones)
- Make it clear what the product actually includes

This correction confirms that the **core comparison between reference portal (11-12 screens) and current visible sidebar (7-10 items) is accurate**, but the analysis incorrectly assumed some commented-out features were "hidden" rather than "intentionally disabled."