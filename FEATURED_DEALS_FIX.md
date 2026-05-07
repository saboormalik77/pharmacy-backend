# Featured Deals API Fix

## Problem
The `/api/marketplace/featured-deals` API was showing deals even after unsetting them because the original implementation had automatic fallback logic that would always select a deal based on criteria (best savings, etc.).

## Root Cause
The `get_featured_deal` and `get_all_featured_deals` functions had automatic selection logic:
- When you unset a manual deal, it would automatically select another deal
- This meant featured deals were never truly "empty"

## Solution
Created new functions that only return manually set featured deals:

### New SQL Functions:
1. `get_manual_featured_deal(p_type)` - Returns only manually set deals, null if none
2. `get_all_manual_featured_deals()` - Returns all manually set deals

### Updated Code:
- Updated `pharmacyMarketplaceService.ts` to use the new manual-only functions
- Now when you unset a deal, the API will return `null` instead of automatically selecting another deal

## Deployment Steps

### Step 1: Deploy New SQL Functions
Run this in Supabase SQL Editor:
```sql
-- Copy and paste contents of scripts/rpcFunctions/manual_featured_deals_only.sql
```

### Step 2: Test the Fix
1. Unset a featured deal: `DELETE /api/admin/marketplace/deal-of-the-day?type=day`
2. Check featured deals: `GET /api/marketplace/featured-deals`
3. Should now return `null` for unset deals instead of automatically selecting others

## API Behavior After Fix

### Before Fix:
```json
{
  "status": "success",
  "data": {
    "dealOfTheDay": { "id": "auto-selected-deal", "selectionType": "automatic" },
    "dealOfTheWeek": null,
    "dealOfTheMonth": null
  }
}
```

### After Fix:
```json
{
  "status": "success", 
  "data": {
    "dealOfTheDay": null,  // Properly null when unset
    "dealOfTheWeek": null,
    "dealOfTheMonth": null
  }
}
```

## Backward Compatibility
- Admin APIs remain unchanged
- Only the pharmacy-facing APIs (`/api/marketplace/featured-deals` and `/api/marketplace/deal-of-the-day`) now use manual-only logic
- The original functions with automatic fallback are still available if needed for other use cases
