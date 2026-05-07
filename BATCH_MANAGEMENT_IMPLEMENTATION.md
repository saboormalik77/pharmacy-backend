# Batch Management Implementation (FCR-32)

## Overview

This implementation adds comprehensive batch management functionality to resolve the issue where staff had no way to delete erroneous batches or unassign returns from incorrect batch assignments.

## Problem Statement

Previously, the system lacked:
- **Delete Batch**: No way to delete a batch created by mistake
- **Unassign Returns**: No way to remove returns from wrong batch assignments
- **Batch Permissions**: No clear indication of what operations are allowed on a batch

This left mistaken assignments stuck in the system and risked incorrect batching and reconciliation.

## Solution Components

### 1. Database Functions (`scripts/fcr_32_batch_management.sql`)

#### New RPC Functions:

**`delete_batch(p_batch_id UUID)`**
- Deletes a batch if it's safe to do so
- **Safety Checks**:
  - Only allows deletion of `open` batches
  - Prevents deletion if debit memos exist
  - Automatically unassigns all returns before deletion
- **Returns**: Confirmation message, deleted batch details, and count of unassigned returns

**`unassign_returns_from_batch(p_batch_id UUID, p_transaction_ids UUID[])`**
- Removes multiple returns from a batch assignment
- **Safety Checks**:
  - Only allows unassigning from `open` batches
  - Skips returns not assigned to the specified batch
  - Recalculates batch totals after unassignment
- **Returns**: Updated batch, counts of unassigned/skipped returns

**`unassign_single_return(p_transaction_id UUID)`**
- Removes one return from its current batch (convenience function)
- **Safety Checks**:
  - Validates return exists and is assigned to a batch
  - Only allows unassigning from `open` batches
  - Recalculates batch totals
- **Returns**: Updated batch and return details

**`get_batch_permissions(p_batch_id UUID)`**
- Checks what operations are allowed on a batch
- **Returns**: Comprehensive permissions object including:
  - `canDelete`: Can delete the batch
  - `canUnassignReturns`: Can remove returns from batch
  - `canAssignReturns`: Can add returns to batch
  - `canClose`: Can close the batch
  - `canSubmitCardinal`: Can mark as submitted to Cardinal

### 2. Backend Services (`src/services/batchService.ts`)

#### New Service Methods:

```typescript
// Delete a batch
deleteBatch(batchId: string): Promise<{
  message: string;
  deletedBatch: ReturnBatch;
  unassignedReturns: number;
}>

// Unassign multiple returns from batch
unassignReturnsFromBatch(batchId: string, transactionIds: string[]): Promise<{
  message: string;
  batch: ReturnBatch;
  unassignedCount: number;
  skippedCount: number;
}>

// Unassign single return
unassignSingleReturn(transactionId: string): Promise<{
  message: string;
  batch: ReturnBatch;
  return: ReturnTransaction;
}>

// Get batch permissions
getBatchPermissions(batchId: string): Promise<BatchPermissions>
```

### 3. API Routes

#### New Endpoints:

- **`DELETE /api/admin/batches/:id`** - Delete batch
- **`POST /api/admin/batches/:id/unassign`** - Unassign returns from batch
- **`GET /api/admin/batches/:id/permissions`** - Get batch permissions
- **`POST /api/return-transactions/:id/unassign`** - Unassign single return

### 4. Frontend Implementation

#### Redux Store (`admin/lib/store/batchSlice.ts`)
- All thunks already implemented and working
- Proper error handling and state management
- Automatic UI updates after operations

#### Batch Detail Page (`admin/app/warehouse/batches/[id]/page.tsx`)
- **Delete Batch Button**: Shows only when `canDelete` permission is true
- **Unassign Returns Button**: Bulk unassign with multi-select interface
- **Permission-Based UI**: All actions conditionally rendered based on batch status
- **Confirmation Modals**: Safety confirmations for destructive operations

#### Return Detail Page (`admin/app/warehouse/returns/[id]/page.tsx`)
- **Batch Assignment Display**: Shows current batch assignment status
- **Unassign Button**: Quick removal from batch (when assigned)
- **Real-time Updates**: UI refreshes after unassignment

## Safety Features

### Database Level
1. **Status Validation**: Only `open` batches can be modified
2. **Debit Memo Protection**: Cannot delete batches with generated debit memos
3. **Automatic Cleanup**: Batch deletion automatically unassigns all returns
4. **Totals Recalculation**: Batch totals automatically updated after changes

### Frontend Level
1. **Permission Checks**: All buttons conditionally rendered
2. **Confirmation Dialogs**: Destructive actions require confirmation
3. **Loading States**: Proper loading indicators during operations
4. **Error Handling**: Clear error messages for failed operations

### Backend Level
1. **Validation**: Comprehensive input validation
2. **Transaction Safety**: Database operations wrapped in transactions
3. **Error Responses**: Detailed error messages for troubleshooting

## Usage Scenarios

### Scenario 1: Delete Mistaken Batch
1. Admin creates batch for wrong month
2. Admin navigates to batch detail page
3. "Delete Batch" button visible (batch is open, no debit memos)
4. Admin clicks delete → confirmation modal
5. Admin confirms → batch deleted, all returns unassigned

### Scenario 2: Fix Wrong Batch Assignment
1. Returns assigned to wrong batch during bulk assignment
2. Admin navigates to batch detail page
3. Admin clicks "Unassign Returns"
4. Admin selects specific returns to remove
5. Admin confirms → returns unassigned, batch totals updated

### Scenario 3: Quick Single Return Fix
1. Individual return assigned to wrong batch
2. Admin navigates to return detail page
3. Admin sees "Assigned to Batch" with "Remove" button
4. Admin clicks remove → return unassigned immediately

## Error Prevention

### Cannot Delete Batch When:
- Batch status is `closed` or `submitted`
- Batch has generated debit memos
- Batch doesn't exist

### Cannot Unassign Returns When:
- Batch status is not `open`
- Return is not assigned to the specified batch
- Return doesn't exist

### UI Feedback:
- Buttons hidden when operations not allowed
- Clear error messages when operations fail
- Success confirmations when operations succeed

## Testing Checklist

### Database Functions:
- [ ] `delete_batch` works for open batches
- [ ] `delete_batch` fails for closed batches
- [ ] `unassign_returns_from_batch` updates totals correctly
- [ ] `unassign_single_return` works for assigned returns
- [ ] `get_batch_permissions` returns correct permissions

### API Endpoints:
- [ ] DELETE `/api/admin/batches/:id` works
- [ ] POST `/api/admin/batches/:id/unassign` works
- [ ] POST `/api/return-transactions/:id/unassign` works
- [ ] All endpoints return proper error codes

### Frontend:
- [ ] Delete button shows/hides based on permissions
- [ ] Unassign modal works correctly
- [ ] Single return unassign works
- [ ] UI updates after operations
- [ ] Error messages display properly

## Migration Instructions

1. **Run SQL Script**: Execute `scripts/fcr_32_batch_management.sql` in Supabase SQL Editor
2. **Deploy Backend**: Backend services and routes are ready
3. **Deploy Frontend**: Admin interface includes all new functionality
4. **Test Operations**: Verify all scenarios work as expected

## Files Modified/Created

### Created:
- `scripts/fcr_32_batch_management.sql`
- `BATCH_MANAGEMENT_IMPLEMENTATION.md`

### Modified:
- `src/services/batchService.ts` - Added new service methods
- `src/controllers/batchController.ts` - Added new handlers
- `src/routes/batchRoutes.ts` - Added new routes
- `src/routes/returnTransactionRoutes.ts` - Added unassign route
- `admin/app/warehouse/returns/[id]/page.tsx` - Added batch unassign functionality
- `admin/lib/store/batchSlice.ts` - Already had all required thunks

This implementation provides a complete solution for batch management with proper safety checks, user-friendly interface, and comprehensive error handling.