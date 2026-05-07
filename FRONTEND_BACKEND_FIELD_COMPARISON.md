# Frontend vs Backend Field Comparison

## Analysis Complete ✅

After thoroughly reviewing your frontend code and backend database schema, here's what I found:

## 🔍 Field Mismatch Found

### Return Items Table Issue

**Frontend sends:**
```typescript
{
  ndc: string,
  product_name: string,  ← Frontend uses this
  lot_number: string,
  expiration_date: string,
  quantity: number,
  unit: string,
  reason?: string
}
```

**Backend expects (returnsService.ts line 77):**
```typescript
{
  ndc: string,
  drug_name: string,  ← Backend expects this
  lot_number: string,
  expiration_date: string,
  quantity: number,
  unit: string,
  reason?: string
}
```

**Database has (return_items table):**
```sql
drug_name VARCHAR(500) NOT NULL  ← DB column name
```

## ✅ All Other Fields Match Perfectly

### Inventory Items - ✅ PERFECT MATCH
Frontend sends:
- ndc ✅
- product_name ✅
- lot_number ✅
- expiration_date ✅
- quantity ✅
- unit ✅
- location ✅
- boxes ✅
- tablets_per_box ✅

DB has all these fields ✅

### Product List Items - ✅ PERFECT MATCH
Frontend sends:
- ndc ✅
- product_name ✅
- quantity ✅
- lot_number ✅
- expiration_date ✅
- notes ✅
- added_by ✅

DB has all these fields ✅

## 🔧 Required Fix

You have TWO options:

### Option 1: Update Backend to Accept `product_name` (RECOMMENDED)
Update `src/services/returnsService.ts` to map `product_name` to `drug_name`:

```typescript
const returnItems = input.items.map((item) => ({
  return_id: returnData.id,
  inventory_item_id: item.inventory_item_id,
  ndc: item.ndc,
  drug_name: item.drug_name || (item as any).product_name,  // Accept both
  // ... rest of fields
}));
```

### Option 2: Update Frontend to Send `drug_name`
Change frontend to match backend naming:
```typescript
const returnRequest = {
  items: returnItems.map(item => ({
    ndc: item.ndc,
    drug_name: item.productName,  // Changed from product_name
    // ... rest
  })),
};
```

## ✅ Recommendation

**Option 1 is better** because:
1. Less changes required (one file vs potentially multiple frontend files)
2. "product_name" is more consistent with your database naming
3. Backend should be flexible to accept common field names

The database schema itself is PERFECT and doesn't need changes - it already has all the required fields!

