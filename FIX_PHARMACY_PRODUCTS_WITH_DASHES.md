# Fix: Pharmacy Products with Dashes Not Being Recognized

## Problem

**Scenario**: Pharmacy has product `00093-7352-01` (with dashes) in their `product_list_items`

**Issue**: When searching `?ndc=00093-7352-01`, the product is found but shows as:
- ❌ Quantity: 1 (default, not from pharmacy inventory)
- ❌ Product name: Generic/default name (not from pharmacy)
- ❌ Missing lot number, expiration date from pharmacy

**Expected**: Should use pharmacy's actual product details (quantity, name, lot, expiration)

## Root Cause

When merging pharmacy products with return_reports matches (lines 406-422):

```typescript
// BEFORE (Line 407)
productItems.forEach(item => {
  const actualNdc = searchTermToActualNdc[item.ndc];  // ❌ LOOKUP FAILS
  // item.ndc = "00093-7352-01" (with dashes from pharmacy)
  // But searchTermToActualNdc keys are normalized: "00093735201" (no dashes)
  // Result: actualNdc = undefined
});
```

**The Mismatch**:
- `item.ndc` = `"00093-7352-01"` (original format from pharmacy)
- `searchTermToActualNdc` keys = `"00093735201"` (normalized search terms)
- Lookup failed because formats didn't match!

## The Flow (Before Fix)

1. User searches: `?ndc=00093-7352-01`
2. System normalizes: `"00093735201"`
3. Gets pharmacy products: finds `{ ndc: "00093-7352-01", quantity: 50, ... }`
4. Creates productMap with key `"00093735201"` → product ✅
5. Initializes productItems with pharmacy product ✅
6. Processes return_reports: finds match
7. Stores: `searchTermToActualNdc["00093735201"] = "00093-7352-01"` ✅
8. **MERGE STEP**: Loop through productItems
   - item.ndc = `"00093-7352-01"`
   - Lookup: `searchTermToActualNdc["00093-7352-01"]` ❌ NOT FOUND!
   - Result: Pharmacy product info lost!

## The Fix

Normalize `item.ndc` before lookup (Line 408-410):

```typescript
// AFTER
productItems.forEach(item => {
  // Normalize item.ndc to match against searchTermToActualNdc keys
  const normalizedItemNdc = String(item.ndc).replace(/-/g, '').trim();
  const actualNdc = searchTermToActualNdc[normalizedItemNdc];  // ✅ LOOKUP SUCCEEDS
  
  if (actualNdc) {
    // Use actual NDC from return_reports, keep product info from pharmacy
    actualNdcToProduct.set(actualNdc, {
      id: item.id,
      product_name: item.product_name,
      quantity: item.quantity,  // ✅ From pharmacy!
      lot_number: item.lot_number,
      expiration_date: item.expiration_date,
    });
  }
});
```

## The Flow (After Fix)

1. User searches: `?ndc=00093-7352-01`
2. System normalizes: `"00093735201"`
3. Gets pharmacy products: finds `{ ndc: "00093-7352-01", quantity: 50, ... }`
4. Creates productMap with key `"00093735201"` → product ✅
5. Initializes productItems with pharmacy product ✅
6. Processes return_reports: finds match
7. Stores: `searchTermToActualNdc["00093735201"] = "00093-7352-01"` ✅
8. **MERGE STEP**: Loop through productItems
   - item.ndc = `"00093-7352-01"`
   - **Normalize**: `"00093735201"` ✅
   - Lookup: `searchTermToActualNdc["00093735201"]` ✅ FOUND!
   - actualNdc = `"00093-7352-01"`
   - Result: Keeps pharmacy product info (quantity, name, etc.) ✅

## Testing

### Before Fix
```bash
GET /api/optimization/recommendations?ndc=00093-7352-01

# Pharmacy has: { ndc: "00093-7352-01", quantity: 50, product_name: "Rosuvastatin", lot: "ABC123" }

Response:
{
  "recommendations": [
    {
      "ndc": "00093-7352-01",
      "quantity": 1,  // ❌ Default, not from pharmacy
      "productName": "Product 00093-7352-01",  // ❌ Generic
      "lotNumber": undefined,  // ❌ Lost from pharmacy
      ...
    }
  ]
}
```

### After Fix
```bash
GET /api/optimization/recommendations?ndc=00093-7352-01

# Pharmacy has: { ndc: "00093-7352-01", quantity: 50, product_name: "Rosuvastatin", lot: "ABC123" }

Response:
{
  "recommendations": [
    {
      "ndc": "00093-7352-01",
      "quantity": 50,  // ✅ From pharmacy!
      "productName": "Rosuvastatin",  // ✅ From pharmacy!
      "lotNumber": "ABC123",  // ✅ From pharmacy!
      "expirationDate": "2025-12-31",  // ✅ From pharmacy!
      ...
    }
  ]
}
```

## Debug Logs

With the fix, you'll now see:

```
=== MERGING PHARMACY PRODUCTS WITH RETURN REPORTS ===
searchTermToActualNdc map: { '00093735201': '00093-7352-01' }
productItems from pharmacy: [ { ndc: '00093-7352-01', name: 'Rosuvastatin' } ]
  Checking item.ndc="00093-7352-01" (normalized="00093735201") → actualNdc="00093-7352-01"
  ✅ Adding actualNdc="00093-7352-01" with pharmacy product info
📦 Final productItems (1 items): [ { ndc: '00093-7352-01', name: 'Rosuvastatin', qty: 50 } ]
=== END MERGING ===
```

## Summary

**Problem**: Pharmacy products with dashes weren't being recognized during merge

**Cause**: Lookup key format mismatch (original vs normalized)

**Solution**: Normalize both sides before comparison

**Impact**: Recommendations now correctly show pharmacy's actual quantity, product name, lot number, and expiration date

## Files Changed
- `src/services/optimizationService.ts`
  - Lines 86-110: Enhanced logging when loading pharmacy products
  - Lines 395-468: Fixed lookup to normalize item.ndc before comparison

