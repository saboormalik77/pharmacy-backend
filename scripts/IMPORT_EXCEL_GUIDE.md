# Excel to Supabase Import Script Guide

This guide explains how to use the JavaScript script to directly import Excel data into Supabase tables.

## Prerequisites

1. **Tables Created**: Make sure you've already run `products_packages_tables.sql` in Supabase to create the `ndc_products` and `ndc_packages` tables.

2. **Environment Variables**: Ensure your `.env.local` file has:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

3. **Excel Files**: Make sure the Excel files are in the `files/` directory:
   - `files/product.xls`
   - `files/package.xls`

## Usage

### Option 1: Using npm script (Recommended)

```bash
npm run import-excel
```

### Option 2: Direct node command

```bash
node scripts/import_excel_to_supabase.js
```

## What the Script Does

1. **Reads Excel Files**: Reads `product.xls` and `package.xls` from the `files/` directory
2. **Transforms Data**: 
   - Converts date formats from YYYYMMDD to YYYY-MM-DD
   - Maps Excel column names to database column names
   - Skips ID columns as requested
3. **Inserts in Batches**: Inserts data in batches of 1000 records to avoid overwhelming the database
4. **Progress Tracking**: Shows real-time progress and summary statistics

## Features

- ✅ **Batch Processing**: Inserts 1000 records at a time for optimal performance
- ✅ **Progress Tracking**: Real-time progress updates
- ✅ **Error Handling**: Continues processing even if some batches fail
- ✅ **Summary Report**: Shows success/error counts at the end
- ✅ **5-Second Delay**: Gives you time to cancel before starting (Ctrl+C)

## Expected Output

```
🚀 Starting Excel to Supabase Import...

📖 Reading Excel files...
   Reading product.xls...
   ✅ Found 114334 product records
   Reading package.xls...
   ✅ Found 214784 package records

🔄 Transforming data...
   ✅ Data transformation complete

⚠️  Ready to import:
   - 114334 products → ndc_products table
   - 214784 packages → ndc_packages table

💡 This will insert data directly into Supabase. Make sure tables are created first!
   Press Ctrl+C to cancel, or wait 5 seconds to continue...

📦 Inserting 114334 records into ndc_products in 115 batches...
✅ Progress: 115/115 batches (100.0%) - 114334 records inserted

📊 ndc_products Import Summary:
   ✅ Success: 114334 records
   ❌ Errors: 0 records

📦 Inserting 214784 records into ndc_packages in 215 batches...
✅ Progress: 215/215 batches (100.0%) - 214784 records inserted

📊 ndc_packages Import Summary:
   ✅ Success: 214784 records
   ❌ Errors: 0 records

============================================================
📈 FINAL IMPORT SUMMARY
============================================================
Products:  114334 inserted, 0 errors
Packages:  214784 inserted, 0 errors
Total:     329118 records inserted
============================================================

✅ Import complete!
```

## Troubleshooting

### Error: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
- Make sure your `.env.local` file exists and has the correct values
- The script looks for `.env.local` in the project root

### Error: "relation 'ndc_products' does not exist"
- Run `scripts/products_packages_tables.sql` in Supabase first to create the tables

### Import is slow
- This is normal for large datasets (329K+ records)
- The script processes in batches with small delays to avoid overwhelming the database
- Total time: approximately 5-15 minutes depending on your Supabase plan

### Some batches fail
- The script will continue processing even if some batches fail
- Check the error messages to identify problematic records
- You can re-run the script - it will attempt to insert all records again (may create duplicates if not handled)

## Data Mapping

### Products (product.xls → ndc_products)
- `PRODUCTNDC` → `product_ndc`
- `PRODUCTTYPENAME` → `product_type_name`
- `PROPRIETARYNAME` → `proprietary_name`
- `NONPROPRIETARYNAME` → `non_proprietary_name`
- `DOSAGEFORMNAME` → `dosage_form_name`
- `ROUTENAME` → `route_name`
- `STARTMARKETINGDATE` → `start_marketing_date` (date converted)
- `MARKETINGCATEGORYNAME` → `marketing_category_name`
- `APPLICATIONNUMBER` → `application_number`
- `LABELERNAME` → `labeler_name`
- `SUBSTANCENAME` → `substance_name`
- `ACTIVE_NUMERATOR_STRENGTH` → `active_numerator_strength`
- `ACTIVE_INGRED_UNIT` → `active_ingred_unit`
- `PHARM_CLASSES` → `pharm_classes`
- `NDC_EXCLUDE_FLAG` → `ndc_exclude_flag`
- `LISTING_RECORD_CERTIFIED_THROUGH` → `listing_record_certified_through` (date converted)
- `PRODUCTID` → **SKIPPED** (as requested)

### Packages (package.xls → ndc_packages)
- `PRODUCTNDC` → `product_ndc`
- `NDCPACKAGECODE` → `ndc_package_code`
- `PACKAGEDESCRIPTION` → `package_description`
- `STARTMARKETINGDATE` → `start_marketing_date` (date converted)
- `NDC_EXCLUDE_FLAG` → `ndc_exclude_flag`
- `SAMPLE_PACKAGE` → `sample_package`
- `PRODUCTID` → **SKIPPED** (as requested)

## Verification

After import, verify the data:

```sql
-- Check counts
SELECT COUNT(*) FROM ndc_products;
SELECT COUNT(*) FROM ndc_packages;

-- Sample records
SELECT * FROM ndc_products LIMIT 5;
SELECT * FROM ndc_packages LIMIT 5;
```

## Notes

- The script uses the **Service Role Key** which bypasses RLS policies
- Data is inserted in batches of 1000 records
- There's a 100ms delay between batches to avoid overwhelming the database
- The script will show progress in real-time
- You have 5 seconds to cancel before the import starts

