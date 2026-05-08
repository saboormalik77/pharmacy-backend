const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Read Excel files
const productFile = path.join(__dirname, '../files/product.xls');
const packageFile = path.join(__dirname, '../files/package.xls');

console.log('Reading Excel files...\n');

// Read product.xls
const productWorkbook = XLSX.readFile(productFile);
const productSheetName = productWorkbook.SheetNames[0];
const productData = XLSX.utils.sheet_to_json(productWorkbook.Sheets[productSheetName]);

// Read package.xls
const packageWorkbook = XLSX.readFile(packageFile);
const packageSheetName = packageWorkbook.SheetNames[0];
const packageData = XLSX.utils.sheet_to_json(packageWorkbook.Sheets[packageSheetName]);

console.log('Product columns:', Object.keys(productData[0] || {}));
console.log('Product rows:', productData.length);
console.log('\nPackage columns:', Object.keys(packageData[0] || {}));
console.log('Package rows:', packageData.length);
console.log('\nFirst product row:', productData[0]);
console.log('\nFirst package row:', packageData[0]);

// Export data for use in other scripts
module.exports = {
  productData,
  packageData,
};

