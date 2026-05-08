# Products and Packages Data Import Guide

This guide explains how to import the Excel data (product.xls and package.xls) into Supabase.

## Files Created

### 1. Table Schema
- **`products_packages_tables.sql`** - Creates the `ndc_products` and `ndc_packages` tables in Supabase

### 2. Data Import Scripts
- **`insert_products.sql`** - SQL INSERT statements for 114,334 product records
- **`insert_packages.sql`** - SQL INSERT statements for 214,784 package records

### 3. Generator Script
- **`generate_insert_statements.js`** - Node.js script that reads Excel files and generates SQL

## Table Schemas

### NDC Products Table

```sql
CREATE TABLE ndc_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_ndc VARCHAR(20) NOT NULL,
  product_type_name VARCHAR(100),
  proprietary_name VARCHAR(255),
  non_proprietary_name VARCHAR(255),
  dosage_form_name VARCHAR(100),
  route_name VARCHAR(100),
  start_marketing_date DATE,
  marketing_category_name VARCHAR(50),
  application_number VARCHAR(50),
  labeler_name VARCHAR(255),
  substance_name TEXT,
  active_numerator_strength DECIMAL(10, 4),
  active_ingred_unit VARCHAR(50),
  pharm_classes TEXT,
  ndc_exclude_flag VARCHAR(1) DEFAULT 'N',
  listing_record_certified_through DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Columns (excluding ID from Excel):**
- `product_ndc` - From PRODUCTNDC
- `product_type_name` - From PRODUCTTYPENAME
- `proprietary_name` - From PROPRIETARYNAME
- `non_proprietary_name` - From NONPROPRIETARYNAME
- `dosage_form_name` - From DOSAGEFORMNAME
- `route_name` - From ROUTENAME
- `start_marketing_date` - From STARTMARKETINGDATE (converted from YYYYMMDD to DATE)
- `marketing_category_name` - From MARKETINGCATEGORYNAME
- `application_number` - From APPLICATIONNUMBER
- `labeler_name` - From LABELERNAME
- `substance_name` - From SUBSTANCENAME
- `active_numerator_strength` - From ACTIVE_NUMERATOR_STRENGTH
- `active_ingred_unit` - From ACTIVE_INGRED_UNIT
- `pharm_classes` - From PHARM_CLASSES
- `ndc_exclude_flag` - From NDC_EXCLUDE_FLAG
- `listing_record_certified_through` - From LISTING_RECORD_CERTIFIED_THROUGH (converted from YYYYMMDD to DATE)

### NDC Packages Table

```sql
CREATE TABLE ndc_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_ndc VARCHAR(20) NOT NULL,
  ndc_package_code VARCHAR(20) NOT NULL,
  package_description TEXT,
  start_marketing_date DATE,
  ndc_exclude_flag VARCHAR(1) DEFAULT 'N',
  sample_package VARCHAR(1) DEFAULT 'N',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Columns (excluding ID from Excel):**
- `product_ndc` - From PRODUCTNDC
- `ndc_package_code` - From NDCPACKAGECODE
- `package_description` - From PACKAGEDESCRIPTION
- `start_marketing_date` - From STARTMARKETINGDATE (converted from YYYYMMDD to DATE)
- `ndc_exclude_flag` - From NDC_EXCLUDE_FLAG
- `sample_package` - From SAMPLE_PACKAGE

## Import Steps

### Step 1: Create Tables
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Open and run `scripts/products_packages_tables.sql`
4. Verify tables are created successfully

### Step 2: Import Products Data
1. In Supabase SQL Editor, open `scripts/insert_products.sql`
2. **Note:** The file contains 115 batches of INSERT statements (1000 records each)
3. You can run the entire file, or run batches individually if needed
4. The import may take several minutes due to the large number of records (114,334)

### Step 3: Import Packages Data
1. In Supabase SQL Editor, open `scripts/insert_packages.sql`
2. **Note:** The file contains 215 batches of INSERT statements (1000 records each)
3. You can run the entire file, or run batches individually if needed
4. The import may take several minutes due to the large number of records (214,784)

## Data Statistics

- **Products:** 114,334 records
- **Packages:** 214,784 records
- **Total:** 329,118 records

## Notes

1. **ID Columns Skipped:** The `PRODUCTID` column from both Excel files has been excluded as requested. The tables use auto-generated UUIDs instead.

2. **Date Conversion:** Dates in the Excel files (format: YYYYMMDD as numbers) are converted to PostgreSQL DATE format (YYYY-MM-DD).

3. **Batch Processing:** Data is inserted in batches of 1000 records to avoid overwhelming the database.

4. **Indexes:** The schema includes indexes on commonly queried fields:
   - `products.product_ndc`
   - `products.proprietary_name`
   - `products.non_proprietary_name`
   - `packages.ndc_package_code`
   - `packages.product_ndc`

5. **Error Handling:** If you encounter errors during import:
   - Check for duplicate NDC codes (if unique constraints are needed)
   - Verify date formats are correct
   - Check for NULL values in required fields

## Regenerating SQL Files

If you need to regenerate the SQL files from the Excel files:

```bash
cd /home/saboor.malik@2bvision.com/2bvt/pharmacy-backend
node scripts/generate_insert_statements.js
```

This will regenerate `insert_products.sql` and `insert_packages.sql` from the Excel files in the `files/` directory.

## Verification Queries

After importing, you can verify the data with these queries:

```sql
-- Check product count
SELECT COUNT(*) FROM ndc_products;

-- Check package count
SELECT COUNT(*) FROM ndc_packages;

-- Sample products
SELECT * FROM ndc_products LIMIT 10;

-- Sample packages
SELECT * FROM ndc_packages LIMIT 10;

-- Products by labeler
SELECT labeler_name, COUNT(*) as count 
FROM ndc_products 
GROUP BY labeler_name 
ORDER BY count DESC 
LIMIT 10;
```

