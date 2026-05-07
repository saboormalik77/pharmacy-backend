const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Read Excel files
const productFile = path.join(__dirname, '../files/product.xls');
const packageFile = path.join(__dirname, '../files/package.xls');

console.log('Reading Excel files and generating SQL insert statements...\n');

// Read product.xls
const productWorkbook = XLSX.readFile(productFile);
const productSheetName = productWorkbook.SheetNames[0];
const productData = XLSX.utils.sheet_to_json(productWorkbook.Sheets[productSheetName]);

// Read package.xls
const packageWorkbook = XLSX.readFile(packageFile);
const packageSheetName = packageWorkbook.SheetNames[0];
const packageData = XLSX.utils.sheet_to_json(packageWorkbook.Sheets[packageSheetName]);

// Helper function to escape SQL strings
function escapeSQL(str) {
  if (str === null || str === undefined) return 'NULL';
  if (typeof str === 'number') return str;
  return "'" + String(str).replace(/'/g, "''") + "'";
}

// Helper function to format date (YYYYMMDD to DATE format)
function formatDate(dateValue) {
  if (!dateValue) return 'NULL';
  if (typeof dateValue === 'number') {
    const dateStr = String(dateValue);
    if (dateStr.length === 8) {
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      return `'${year}-${month}-${day}'`;
    }
  }
  return 'NULL';
}

// Generate Products INSERT statements
console.log('Generating products insert statements...');
const productInserts = [];
const batchSize = 1000; // Insert in batches of 1000

for (let i = 0; i < productData.length; i += batchSize) {
  const batch = productData.slice(i, i + batchSize);
  let insertSQL = 'INSERT INTO ndc_products (\n';
  insertSQL += '  product_ndc, product_type_name, proprietary_name\n';
  insertSQL += ') VALUES\n';

  const values = batch.map(row => {
    const vals = [
      escapeSQL(row.PRODUCTNDC),
      escapeSQL(row.PRODUCTTYPENAME),
      escapeSQL(row.PROPRIETARYNAME),
    ];
    return `  (${vals.join(', ')})`;
  });

  insertSQL += values.join(',\n');
  insertSQL += ';\n';
  
  productInserts.push(insertSQL);
}

// Generate Packages INSERT statements
console.log('Generating packages insert statements...');
const packageInserts = [];

for (let i = 0; i < packageData.length; i += batchSize) {
  const batch = packageData.slice(i, i + batchSize);
  let insertSQL = 'INSERT INTO ndc_packages (\n';
  insertSQL += '  product_ndc, ndc_package_code, package_description\n';
  insertSQL += ') VALUES\n';

  const values = batch.map(row => {
    const vals = [
      escapeSQL(row.PRODUCTNDC),
      escapeSQL(row.NDCPACKAGECODE),
      escapeSQL(row.PACKAGEDESCRIPTION),
    ];
    return `  (${vals.join(', ')})`;
  });

  insertSQL += values.join(',\n');
  insertSQL += ';\n';
  
  packageInserts.push(insertSQL);
}

// Write to SQL files
const productsSQL = `-- Products Data Import
-- Generated from product.xls
-- Total records: ${productData.length}
-- Generated at: ${new Date().toISOString()}

${productInserts.join('\n')}
`;

const packagesSQL = `-- Packages Data Import
-- Generated from package.xls
-- Total records: ${packageData.length}
-- Generated at: ${new Date().toISOString()}

${packageInserts.join('\n')}
`;

// Write files
const productsOutputPath = path.join(__dirname, 'insert_products.sql');
const packagesOutputPath = path.join(__dirname, 'insert_packages.sql');

fs.writeFileSync(productsOutputPath, productsSQL, 'utf8');
fs.writeFileSync(packagesOutputPath, packagesSQL, 'utf8');

console.log(`\n✅ Generated SQL files:`);
console.log(`   - ${productsOutputPath} (${productData.length} records in ${productInserts.length} batches)`);
console.log(`   - ${packagesOutputPath} (${packageData.length} records in ${packageInserts.length} batches)`);
console.log(`\n📝 Next steps:`);
console.log(`   1. Run scripts/products_packages_tables.sql in Supabase to create tables`);
console.log(`   2. Run scripts/insert_products.sql in Supabase to import products`);
console.log(`   3. Run scripts/insert_packages.sql in Supabase to import packages`);

