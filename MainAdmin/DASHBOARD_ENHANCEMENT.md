# MainAdmin Dashboard Enhancement

## What Was Added

The MainAdmin dashboard now shows comprehensive warehouse statistics in addition to buying groups data:

### New Statistics Cards
1. **Total Buying Groups** - Shows count of all super_admin role records
2. **Active Groups** - Shows count of active buying groups  
3. **Total Returns** - Shows total count of warehouse returns
4. **Total Batches** - Shows total count of batches

### Current Active Batch Display
- Shows the current active (open) batch in a prominent card
- Formats batch month as "Month YYYY" (e.g., "August 2026", "June 2026")
- Shows "No active batch" when no batch is currently open

### Enhanced Quick Actions
- **Buying Groups** - Navigate to buying groups management
- **Warehouse** - Navigate to warehouse hub
- **Batches** - Navigate directly to batches management

### Error Handling
- Shows error message if warehouse statistics fail to load
- Graceful loading states for all stats

## Technical Implementation

### Files Added/Modified:

1. **`hooks/useWarehouseStats.ts`** (NEW)
   - Custom hook to fetch warehouse statistics
   - Calls existing `/admin/warehouse/received` and `/admin/batches` APIs
   - Returns total returns, total batches, and current active batch

2. **`lib/store/dashboardSlice.ts`** (COPIED from admin)
   - Dashboard state management slice
   - Registered in the Redux store

3. **`app/page.tsx`** (ENHANCED)
   - Updated to show warehouse stats alongside buying groups stats
   - Added active batch display
   - Enhanced quick actions with warehouse navigation
   - Improved error handling and loading states

4. **`lib/store/store.ts`** (UPDATED)
   - Added dashboard reducer to the store

## Data Sources

- **Buying Groups Stats**: From existing `buyingGroupsSlice` (shows only super_admin role records)
- **Warehouse Stats**: From `/admin/warehouse/received` API (total returns count)
- **Batch Stats**: From `/admin/batches` API (total batches and current active batch)

## Benefits

1. **Comprehensive Overview**: Main admin gets full visibility into both buying groups and warehouse operations
2. **Real-time Data**: All statistics are fetched fresh on page load
3. **Current Batch Visibility**: Easy to see which batch is currently active for operations
4. **Quick Navigation**: Direct access to key management areas
5. **Professional UI**: Clean, modern dashboard with proper loading and error states

The dashboard now provides exactly what was requested: Total returns, Total batches, and current active batch information, all integrated seamlessly with the existing buying groups data.