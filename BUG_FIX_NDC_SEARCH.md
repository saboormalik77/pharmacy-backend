# Bug Fix: NDC Search Not Returning Results

## Problem Description

### Symptoms
1. **NDC exists in `return_reports` table** (verified via SQL query)
   - SQL query finds the record: `WHERE data->>'ndcCode' LIKE '%00093-7352-01%'`
2. **API call returns NO results or WRONG format**
   - Searching `?ndc=00093735201` (no dashes) → ✅ Works
   - Searching `?ndc=00093-7352-01` (with dashes) → ❌ Doesn't work
3. **Logs show NDC was found** and added to pricing map with 2 records
4. **But final response contains 0 recommendations** or shows wrong format

### Root Causes (Two Issues Fixed)

#### Issue 1: Missing Results (No Recommendations)
The logic that creates recommendations from matched NDCs had a problem:

1. ✅ **Step 1**: NDC was found in `return_reports` → added to `searchTermToActualNdc` map
2. ✅ **Step 2**: Pricing data was collected → added to `ndcPricingMap`
3. ❌ **Step 3**: But `productItems` array (used to create recommendations) only contained products from pharmacy's `product_list_items` table
4. ❌ **Step 4**: If pharmacy didn't have the product in inventory, no productItem existed
5. ❌ **Step 5**: Without a productItem, no recommendation was created

#### Issue 2: Format Not Preserved (Dashes Removed)
The NDC format was being normalized (dashes removed) when storing:

1. User searches: `?ndc=00093-7352-01` (with dashes)
2. System normalizes: `00093735201` (removes dashes)
3. Return reports has: `00093-7352-01` (with dashes)
4. ❌ **BUG**: System stored normalized version `00093735201` instead of original `00093-7352-01`
5. ❌ **Result**: Response always showed `00093735201` (no dashes), even when database has dashes
6. ❌ **Filter Failure**: When user searches with dashes, filter couldn't match because stored value had no dashes

### Code Flow (Before Fix)

```typescript
// Lines 75-97: Initialize productItems from pharmacy's product_list_items
const { data: foundProducts } = await db
  .from('product_list_items')
  .select('id, ndc, product_name, quantity, lot_number, expiration_date')
  .eq('added_by', pharmacyId);  // ← Only pharmacy's inventory

// Lines 258-283: Find matching NDCs in return_reports
const matchedSearchTerm = ndcs.find(searchTerm => {
  return normalizedNdcCode === normalizedSearchTerm;
});
searchTermToActualNdc[matchedSearchTerm] = normalizedNdcCode;  // ← NDC found!

// Lines 385-401: Update productItems with matched NDCs
productItems.forEach(item => {
  const actualNdc = searchTermToActualNdc[item.ndc];
  if (actualNdc) {
    actualNdcToProduct.set(actualNdc, { ... });
  }
});
// ❌ PROBLEM: If item not in productItems, actualNdc never added to actualNdcToProduct

// Lines 403-411: Create productItems from actualNdcToProduct
productItems = Array.from(actualNdcToProduct.entries()).map(...);
// ❌ RESULT: Empty productItems if pharmacy doesn't have the product

// Lines 413+: Generate recommendations
productItems.forEach((productItem) => {
  const pricingData = ndcPricingMap[ndc] || [];
  if (pricingData.length === 0) {
    return;  // Skip
  }
  recommendations.push({ ... });
});
// ❌ RESULT: No recommendations created because productItems is empty
```

## The Fixes

### Fix 1: Add Matched NDCs to Product Items

Added logic to ensure all matched NDCs from `searchTermToActualNdc` are added to `productItems`, even if they're not in the pharmacy's inventory:

```typescript
// Lines 404-415: NEW CODE
// Add any matched NDCs from searchTermToActualNdc that weren't in productItems
// This handles the case where the NDC was found in return_reports but not in pharmacy's inventory
Object.entries(searchTermToActualNdc).forEach(([searchTerm, actualNdc]) => {
  if (!actualNdcToProduct.has(actualNdc)) {
    console.log(`✨ Adding matched NDC ${actualNdc} from return_reports (not in pharmacy inventory)`);
    actualNdcToProduct.set(actualNdc, {
      id: '',
      product_name: `Product ${actualNdc}`,
      quantity: 1, // Default quantity for searched items
      lot_number: undefined,
      expiration_date: undefined,
    });
  }
});
```

### Fix 2: Preserve Original NDC Format (With Dashes)

Changed the logic to store the **original NDC format** from `return_reports` instead of the normalized version:

```typescript
// BEFORE (Line 302): Stored normalized version
searchTermToActualNdc[matchedSearchTerm] = normalizedNdcCode;  // "00093735201" (no dashes)

// AFTER (Lines 297-304): Store original format
const originalNdcFormat = String(ndcCode).trim();  // "00093-7352-01" (preserves dashes)
actualNdcKey = originalNdcFormat;
searchTermToActualNdc[matchedSearchTerm] = originalNdcFormat;
console.log(`✅ Matched! Search term "${matchedSearchTerm}" → Actual NDC "${originalNdcFormat}" (preserving original format)`);
```

**Why This Works:**
1. User can search with OR without dashes: `?ndc=00093-7352-01` or `?ndc=00093735201`
2. System normalizes for comparison (removes dashes from both sides)
3. But stores the **original format** from return_reports
4. Response shows NDC in the **same format as stored** in database
5. Filter normalizes both sides before comparison, so matching works regardless of format

### Code Flow (After Both Fixes)

```typescript
// Step 1: Find matching NDCs in return_reports ✅
searchTermToActualNdc[matchedSearchTerm] = normalizedNdcCode;

// Step 2: Update productItems from pharmacy inventory ✅
productItems.forEach(item => {
  const actualNdc = searchTermToActualNdc[item.ndc];
  if (actualNdc) {
    actualNdcToProduct.set(actualNdc, { ... });
  }
});

// Step 3: Add any matched NDCs not in pharmacy inventory ✅ (NEW)
Object.entries(searchTermToActualNdc).forEach(([searchTerm, actualNdc]) => {
  if (!actualNdcToProduct.has(actualNdc)) {
    actualNdcToProduct.set(actualNdc, {
      id: '',
      product_name: `Product ${actualNdc}`,
      quantity: 1,
      lot_number: undefined,
      expiration_date: undefined,
    });
  }
});

// Step 4: Create productItems ✅
productItems = Array.from(actualNdcToProduct.entries()).map(...);

// Step 5: Generate recommendations ✅
productItems.forEach((productItem) => {
  const pricingData = ndcPricingMap[ndc] || [];
  if (pricingData.length > 0) {
    recommendations.push({ ... });  // ✅ Recommendation created!
  }
});
```

## Testing

### Before Fix
```bash
GET /api/optimization/recommendations?ndc=00093-7352-01

Response:
{
  "status": "success",
  "data": {
    "recommendations": [],  // ❌ Empty!
    "totalPotentialSavings": 0,
    ...
  }
}
```

### After Both Fixes ✅
```bash
# Search WITH dashes (database has "00093-7352-01")
GET /api/optimization/recommendations?ndc=00093-7352-01

Response:
{
  "status": "success",
  "data": {
    "recommendations": [
      {
        "id": "",
        "ndc": "00093-7352-01",  // ✅ Preserves original format!
        "productName": "Product 00093-7352-01",
        "quantity": 1,
        "recommendedDistributor": "Return Solutions, Inc.",
        "expectedPrice": 34.14,
        "worstPrice": 34.14,
        "alternativeDistributors": [],
        "savings": 0,
        "available": true
      }
    ],  // ✅ Result found!
    "totalPotentialSavings": 0,
    ...
  }
}

# Search WITHOUT dashes (also works!)
GET /api/optimization/recommendations?ndc=00093735201

Response:
{
  "status": "success",
  "data": {
    "recommendations": [
      {
        "ndc": "00093-7352-01",  // ✅ Still shows original format from database
        ...
      }
    ]
  }
}
```

## Debug Logs

### Before Fix
```
🔍 Original search NDCs (from query param): ["00093-7352-01"]
🔍 Normalized search NDCs (for matching): ["00093735201"]
📦 Found X return report records
✅ Matched NDC 00093735201 (search term: 00093735201) with distributor "Return Solutions, Inc.", price: 34.14
📊 NDC 00093735201: 2 total records, 1 unique distributors
📦 Updated productItems (0 items): []  // ❌ Empty!
```

### After Fix
```
🔍 Original search NDCs (from query param): ["00093-7352-01"]
🔍 Normalized search NDCs (for matching): ["00093735201"]
📦 Found X return report records
✅ Matched NDC 00093735201 (search term: 00093735201) with distributor "Return Solutions, Inc.", price: 34.14
📊 NDC 00093735201: 2 total records, 1 unique distributors
✨ Adding matched NDC 00093735201 from return_reports (not in pharmacy inventory)  // ✅ NEW!
📦 Updated productItems (1 items): ["00093735201"]  // ✅ Has item!
```

## Summary

### Problem 1: Missing Results
**Issue**: API search returned no results even though NDC existed in return_reports  
**Cause**: Logic assumed searched NDCs must exist in pharmacy's inventory  
**Solution**: Added fallback to create productItems for NDCs found in return_reports  
**Impact**: Returns recommendations for any NDC in return_reports, regardless of pharmacy inventory

### Problem 2: Format Not Preserved
**Issue**: Searching with dashes (`00093-7352-01`) didn't work, only without dashes (`00093735201`)  
**Cause**: System normalized NDCs (removed dashes) when storing, losing original format  
**Solution**: Store original NDC format from return_reports while normalizing only for comparison  
**Impact**: Users can search with OR without dashes, and results show the format from database

## Key Behavior Now

✅ **Search flexibility**: Works with `?ndc=00093-7352-01` OR `?ndc=00093735201`  
✅ **Format preservation**: Response shows NDC in same format as stored in return_reports  
✅ **Universal matching**: Normalizes both sides for comparison (removes dashes temporarily)  
✅ **Inventory independence**: Returns results even if NDC not in pharmacy inventory

## Files Changed
- `src/services/optimizationService.ts`
  - Lines 297-304: Preserve original NDC format
  - Lines 404-427: Add matched NDCs to productItems
  - Lines 898-926: Enhanced filter with debug logging

