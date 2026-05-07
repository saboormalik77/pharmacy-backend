# Feature: Fetch Product Name from Return Reports or Products Table

## Overview

When searching for an NDC that is **not in the pharmacy's inventory**, the system now fetches the actual product name instead of showing "Product {NDC}".

## Problem Before

**Scenario**: Search for NDC `00093-7352-01` which is NOT in pharmacy's inventory

**Before**:
```json
{
  "ndc": "00093-7352-01",
  "productName": "Product 00093-7352-01",  // ❌ Generic default name
  "quantity": 1,
  ...
}
```

**User sees**: Generic "Product 00093-7352-01" instead of actual product name like "Rosuvastatin 20mg"

## Solution

The system now fetches the product name from three sources (in order of priority):

1. **Return Reports Data** (highest priority - most accurate)
2. **Products Table** (fallback if not in return reports)
3. **Default** (only if not found anywhere)

## How It Works

### Step 1: Extract Product Names from Return Reports

When processing return_reports, the system extracts product names:

```typescript
// Lines 327-334
// Priority: itemName (most common in return_reports) > productName > product_name > product > description > drugName > name
const productName = item.itemName || item.productName || item.product_name || 
                   item.product || item.description || item.drugName || item.name;

if (productName && !ndcToProductNameMap[originalNdcFormat]) {
  ndcToProductNameMap[originalNdcFormat] = String(productName).trim();
  console.log(`✅ Product name from return_reports: "${productName}"`);
}
```

**Tries multiple field names (in priority order)**:
1. `item.itemName` ⭐ (Most common in return_reports - e.g., "Cefdinir 125mg/5ml Pwd Susp")
2. `item.productName`
3. `item.product_name`
4. `item.product`
5. `item.description`
6. `item.drugName`
7. `item.name`

### Step 2: Use Product Name When Creating Recommendation

When NDC is not in pharmacy inventory (lines 443-478):

```typescript
// Priority 1: Try return_reports data
let productName = ndcToProductNameMap[actualNdc];

// Priority 2: If not found, query products table
if (!productName) {
  const { data: productData } = await db
    .from('products')
    .select('product_name')
    .eq('ndc', actualNdc)
    .limit(1)
    .maybeSingle();
  
  if (productData?.product_name) {
    productName = productData.product_name;
  } else {
    // Also try normalized NDC (without dashes)
    const normalizedNdc = actualNdc.replace(/-/g, '').trim();
    const { data: productData2 } = await db
      .from('products')
      .select('product_name')
      .eq('ndc', normalizedNdc)
      .maybeSingle();
    
    if (productData2?.product_name) {
      productName = productData2.product_name;
    }
  }
}

// Priority 3: Fallback to default
if (!productName) {
  productName = `Product ${actualNdc}`;
}
```

## Examples

### Example 1: Product Name in Return Reports (itemName field)

**Return Reports Data**:
```json
{
  "ndcCode": "65862-0218-60",
  "itemName": "Cefdinir 125mg/5ml Pwd Susp",
  "quantity": 1,
  "creditAmount": 7.63,
  "pricePerUnit": 7.63,
  ...
}
```

**API Response**:
```json
{
  "ndc": "65862-0218-60",
  "productName": "Cefdinir 125mg/5ml Pwd Susp",  // ✅ From return_reports itemName field!
  "quantity": 1,
  ...
}
```

### Example 1b: Product Name in Return Reports (productName field)

**Return Reports Data**:
```json
{
  "ndcCode": "00093-7352-01",
  "productName": "Rosuvastatin Calcium 20mg Tablets",
  "pricePerUnit": 34.14,
  ...
}
```

**API Response**:
```json
{
  "ndc": "00093-7352-01",
  "productName": "Rosuvastatin Calcium 20mg Tablets",  // ✅ From return_reports!
  "quantity": 1,
  ...
}
```

### Example 2: Product Name in Products Table

**Products Table**:
```sql
SELECT * FROM products WHERE ndc = '00093-7352-01';
-- Returns: { ndc: '00093-7352-01', product_name: 'Rosuvastatin 20mg' }
```

**API Response**:
```json
{
  "ndc": "00093-7352-01",
  "productName": "Rosuvastatin 20mg",  // ✅ From products table!
  "quantity": 1,
  ...
}
```

### Example 3: Not Found Anywhere

**API Response**:
```json
{
  "ndc": "12345-678-90",
  "productName": "Product 12345-678-90",  // ✅ Fallback default
  "quantity": 1,
  ...
}
```

## Debug Logs

When searching for NDC not in pharmacy inventory, you'll see:

```
✨ Adding matched NDC 00093-7352-01 from return_reports (not in pharmacy inventory)
   ✅ Using product name from return_reports: "Rosuvastatin Calcium 20mg Tablets"
```

Or if not in return_reports:

```
✨ Adding matched NDC 00093-7352-01 from return_reports (not in pharmacy inventory)
   Fetching product name from products table for NDC 00093-7352-01...
   ✅ Found product name in products table: "Rosuvastatin 20mg"
```

Or if not found anywhere:

```
✨ Adding matched NDC 00093-7352-01 from return_reports (not in pharmacy inventory)
   Fetching product name from products table for NDC 00093-7352-01...
   ⚠️ Product name not found, using default: "Product 00093-7352-01"
```

## Benefits

✅ **Better User Experience**: Shows actual product names instead of generic "Product {NDC}"

✅ **Multiple Data Sources**: Tries return_reports first (most reliable), then products table

✅ **Handles Different NDC Formats**: Tries both with and without dashes when querying products table

✅ **Non-Breaking**: Falls back to default format if product name not found

## Technical Details

### Field Names Checked in Return Reports

The system checks for product names in the following order (first match wins):
1. `item.itemName` ⭐ (Most common - e.g., "Cefdinir 125mg/5ml Pwd Susp")
2. `item.productName`
3. `item.product_name`
4. `item.product`
5. `item.description`
6. `item.drugName`
7. `item.name`

### Database Queries

Two queries to products table (if needed):
1. Exact match: `WHERE ndc = '{actualNdc}'`
2. Normalized match: `WHERE ndc = '{normalizedNdc}'` (without dashes)

### Performance

- Product names from return_reports: No additional queries (already loaded)
- Products table lookup: Only when NDC not in pharmacy inventory and not in return_reports
- Async/await: Doesn't block other operations

## Files Changed

- `src/services/optimizationService.ts`
  - Lines 221-224: Added `ndcToProductNameMap`
  - Lines 325-332: Extract product name from return_reports
  - Lines 443-478: Fetch product name with fallback logic

## Testing

```bash
# Search for NDC not in pharmacy inventory
GET /api/optimization/recommendations?ndc=00093-7352-01

# Expected: Shows actual product name from return_reports or products table
# Instead of: "Product 00093-7352-01"
```

