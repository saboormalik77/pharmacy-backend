# Return Transaction Locking Implementation

**Date:** March 24, 2026  
**Issue:** Return transactions could be modified after finalization, causing data discrepancies  
**Solution:** Comprehensive locking system preventing edits after finalization

---

## Problem Analysis

### Original Issue
After a processor finalizes a return (enters FedEx tracking, prints job sheets, etc.), the return should be locked and no further changes allowed. However, the system still allowed edits through:

1. **Inconsistent Backend Validation:**
   - `update_return_transaction()` only blocked `finalized` and `closed_out` but not `received`, `verified`, or `closed`
   - `update_finalize_steps()` had NO status validation
   - `update_return_transaction_item()` missed some warehouse states

2. **Missing Frontend Protection:**
   - No UI indication when returns are locked
   - Edit buttons and forms remained enabled for locked returns
   - No validation before attempting modifications

3. **Database-Level Gaps:**
   - No triggers to prevent direct SQL modifications
   - Inconsistent definition of "locked" states

### Status Flow
```
in_progress → completed → finalized → scanning → received → verified → closed
                          ^--- LOCK POINT: No edits allowed after this
```

---

## Solution Implementation

### 1. Database Layer (`scripts/fcr_29_return_transaction_locking.sql`)

#### Core Helper Function
```sql
CREATE OR REPLACE FUNCTION is_return_transaction_locked(p_status TEXT)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p_status IN ('finalized', 'scanning', 'received', 'verified', 'closed', 'closed_out');
$$;
```

#### Updated RPC Functions
- **`update_return_transaction()`** - Now blocks ALL locked states
- **`update_finalize_steps()`** - Only allows updates for `completed` status
- **`update_return_transaction_item()`** - Blocks ALL locked states

#### New RPC Functions
- **`add_return_transaction_item_with_validation()`** - Validates lock status before adding items
- **`delete_return_transaction_item_with_validation()`** - Validates lock status before deleting items
- **`check_return_transaction_lock_status()`** - Returns lock status for frontend

#### Database Triggers
- **`prevent_locked_return_updates_trigger`** - Prevents direct SQL updates on locked returns
- **`prevent_locked_return_item_updates_trigger`** - Prevents direct SQL item modifications

### 2. Backend Services

#### Updated Services
- **`returnTransactionItemsService.ts`**
  - `addItem()` now uses `add_return_transaction_item_with_validation`
  - `deleteItem()` now uses `delete_return_transaction_item_with_validation`
  - Added `checkReturnLockStatus()` function

- **`returnTransactionService.ts`**
  - Added `checkReturnLockStatus()` function

#### New API Endpoints
- **`GET /api/return-transactions/:id/lock-status`** - Check if return is locked
- **`GET /api/return-transactions/:id/items/lock-status`** - Check lock status (items route)

### 3. Frontend Protection

#### New React Hook (`admin/hooks/useReturnLockStatus.ts`)
```typescript
export const useReturnLockStatus = (transactionId: string | null): UseReturnLockStatusResult
export const useReturnEditProtection = (transactionId: string | null)
```

**Features:**
- Real-time lock status checking
- Helper functions for disabling UI elements
- Action validation with user feedback

#### Updated Components

**Return Detail Page (`admin/app/warehouse/returns/[id]/page.tsx`)**
- Edit/Delete buttons show "Locked" state when return is finalized
- Form inputs disabled with visual indication
- Action validation before API calls

**Add Items Page (`admin/app/warehouse/returns/[id]/add-items/page.tsx`)**
- Lock status warning banner
- Disabled scan inputs and buttons
- Protected save functionality
- Visual feedback for locked state

---

## Protection Levels

### Level 1: Frontend UI Protection
- Buttons disabled/hidden for locked returns
- Form inputs disabled with visual feedback
- Lock status warnings displayed
- Action validation before API calls

### Level 2: Backend API Protection
- All modification endpoints validate lock status
- Consistent error messages for locked returns
- New validation functions for item operations

### Level 3: Database Protection
- RPC functions block modifications on locked returns
- Database triggers prevent direct SQL modifications
- Comprehensive status checking across all operations

---

## Files Modified

### Database
- `scripts/fcr_29_return_transaction_locking.sql` *(NEW)*

### Backend
- `src/services/returnTransactionItemsService.ts`
- `src/services/returnTransactionService.ts`
- `src/routes/returnTransactionItemsRoutes.ts`
- `src/routes/returnTransactionRoutes.ts`

### Frontend
- `admin/hooks/useReturnLockStatus.ts` *(NEW)*
- `admin/app/warehouse/returns/[id]/page.tsx`
- `admin/app/warehouse/returns/[id]/add-items/page.tsx`

---

## Protected Operations

### Return Transaction Level
- ❌ Edit return details (FedEx tracking, notes, etc.)
- ❌ Delete return transaction
- ❌ Update finalize steps (after finalization)
- ❌ Status transitions (except warehouse operations)

### Item Level
- ❌ Add new items to return
- ❌ Edit existing items (quantity, price, status, etc.)
- ❌ Delete items from return
- ❌ Move items to wine cellar

### Allowed Operations
- ✅ View return and item details
- ✅ Generate reports and manifests
- ✅ Print job sheets and labels
- ✅ Warehouse receiving operations (by warehouse staff)
- ✅ Verification and batch assignment (by warehouse staff)

---

## Testing Checklist

### Database Level
- [ ] Run migration: `scripts/fcr_29_return_transaction_locking.sql`
- [ ] Test RPC functions with locked return IDs
- [ ] Verify triggers prevent direct SQL modifications

### Backend API
- [ ] Test all modification endpoints with finalized returns
- [ ] Verify consistent error responses
- [ ] Test new lock status endpoints

### Frontend
- [ ] Test return detail page with finalized returns
- [ ] Test add items page with finalized returns
- [ ] Verify visual feedback for locked states
- [ ] Test action validation and error handling

### End-to-End
- [ ] Create return → add items → complete → finalize
- [ ] Verify all edit operations are blocked after finalization
- [ ] Test warehouse operations still work for authorized users

---

## Error Messages

**Consistent error message format:**
```
"Cannot [action] return with status '[status]'. Return is locked after finalization."
```

**Examples:**
- "Cannot update return with status 'finalized'. Return is locked after finalization."
- "Cannot add items to return with status 'received'. Return is locked after finalization."
- "Cannot delete items from return with status 'verified'. Return is locked after finalization."

---

## Migration Instructions

1. **Apply Database Migration:**
   ```sql
   -- Run in Supabase SQL Editor
   -- File: scripts/fcr_29_return_transaction_locking.sql
   ```

2. **Deploy Backend Changes:**
   ```bash
   npm run build
   npm start
   ```

3. **Deploy Frontend Changes:**
   ```bash
   cd admin
   npm run build
   ```

4. **Verify Implementation:**
   - Test with existing finalized returns
   - Verify all edit paths are blocked
   - Check error handling and user feedback

---

## Benefits

1. **Data Integrity:** Prevents accidental modifications after finalization
2. **Audit Compliance:** Maintains immutable records for completed transactions
3. **User Experience:** Clear visual feedback about locked states
4. **System Reliability:** Consistent behavior across all interfaces
5. **Warehouse Efficiency:** Prevents reconciliation issues from late changes

---

## Future Considerations

1. **Role-Based Overrides:** Admin users might need emergency edit capabilities
2. **Audit Logging:** Track attempted modifications on locked returns
3. **Bulk Operations:** Extend protection to bulk modification endpoints
4. **Mobile App:** Apply same protections to mobile interfaces
5. **API Documentation:** Update Swagger docs with lock status information