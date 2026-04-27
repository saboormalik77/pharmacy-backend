# Warehouse Dashboard Update

## Summary
Added **Destruction**, **TBD Items**, and **Wine Cellar** as main cards on the warehouse dashboard page, replacing sidebar navigation for these key functions that were moved from pharmacy/processor portals.

## Changes Made

### ✅ **1. Added New Icons**
```typescript
import {
    // ... existing icons
    Archive,    // Wine Cellar
    Ban,        // Destruction  
    Clock,      // TBD Items
} from 'lucide-react';
```

### ✅ **2. Added Three New Dashboard Cards**

#### **Wine Cellar** 
- **Route**: `/warehouse/wine-cellar`
- **Icon**: Archive (Purple)
- **Description**: "Products stored for future return processing. Monitor shelved items and ready-to-return inventory."

#### **TBD Items**
- **Route**: `/warehouse/tbd-items` 
- **Icon**: Clock (Yellow)
- **Description**: "Items pending disposition decisions. Review and resolve items awaiting classification."

#### **Destruction**
- **Route**: `/warehouse/destruction`
- **Icon**: Ban (Red) 
- **Description**: "Items scheduled for destruction. Track destruction records and compliance documentation."

### ✅ **3. Updated Grid Layout**
- Changed from `lg:grid-cols-3` to `lg:grid-cols-3 xl:grid-cols-4`
- Better responsive layout for 8 total cards

## New Dashboard Structure

The warehouse dashboard now shows **8 main sections**:

1. **Receiving** (Blue) - Scan and receive packages
2. **Verification** (Teal) - Verify items and conditions  
3. **Batches** (Purple) - Create monthly batches
4. **Debit Memos** (Orange) - Track payments
5. **RA Tracking** (Green) - Manage return authorizations
6. **🆕 Wine Cellar** (Purple) - Shelved items for future return
7. **🆕 TBD Items** (Yellow) - Items pending classification  
8. **🆕 Destruction** (Red) - Items scheduled for destruction

## Benefits

- **Centralized Access**: All key warehouse functions visible on main dashboard
- **Better UX**: No need to hunt through sidebar navigation 
- **Logical Flow**: Matches the actual warehouse workflow
- **Complete Coverage**: All functionality moved from pharmacy/processor now accessible

## Existing Pages Confirmed

All three new dashboard links point to existing, fully functional pages:
- ✅ `MainAdmin/app/warehouse/wine-cellar/page.tsx` - Full wine cellar management
- ✅ `MainAdmin/app/warehouse/tbd-items/page.tsx` - TBD item resolution 
- ✅ `MainAdmin/app/warehouse/destruction/page.tsx` - Destruction tracking

## Visual Result

The warehouse dashboard now provides a comprehensive overview of all warehouse operations with easy one-click access to each major function, including the three key areas that were moved from the pharmacy/processor portals as part of the refactoring initiative.