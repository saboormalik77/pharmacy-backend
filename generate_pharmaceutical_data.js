#!/usr/bin/env node
/**
 * Pharmaceutical Test Data Generator (JavaScript Version)
 * Generates realistic GTIN, serial numbers, lot numbers, and expiration dates
 * based on real NDC numbers for testing pharmaceutical systems.
 */

class PharmaceuticalDataGenerator {
    constructor() {
        this.currentYear = 2026;
        this.batchLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    }

    /**
     * Convert NDC to GTIN-14 format
     * NDC format: 5-4-2 or 4-4-2 becomes GTIN-14: 00 + normalized NDC + check digit
     */
    ndcToGtin14(ndc) {
        // Remove hyphens and normalize to 11 digits
        let ndcClean = ndc.replace(/-/g, '');

        // Pad to 11 digits if needed (some NDCs are shorter)
        if (ndcClean.length < 11) {
            ndcClean = ndcClean.padStart(11, '0');
        } else if (ndcClean.length > 11) {
            ndcClean = ndcClean.substring(0, 11);
        }

        // Add company prefix (00) + indicator (3) to make 14 digits total
        const gtinWithoutCheck = `003${ndcClean}`;

        // Calculate check digit using GS1 algorithm
        const checkDigit = this.calculateGtinCheckDigit(gtinWithoutCheck);

        return `${gtinWithoutCheck}${checkDigit}`;
    }

    /**
     * Calculate GTIN check digit using GS1 algorithm
     */
    calculateGtinCheckDigit(partialGtin) {
        let total = 0;
        const digits = partialGtin.split('').reverse();

        for (let i = 0; i < digits.length; i++) {
            const multiplier = i % 2 === 0 ? 3 : 1;
            total += parseInt(digits[i]) * multiplier;
        }

        const checkDigit = (10 - (total % 10)) % 10;
        return checkDigit.toString();
    }

    /**
     * Generate realistic serial number (up to 20 alphanumeric chars)
     */
    generateSerialNumber() {
        // Format: SN + YYMMDD + random 8-digit number + random 2 letters
        const now = new Date();
        const datePart = now.getFullYear().toString().slice(-2) +
            (now.getMonth() + 1).toString().padStart(2, '0') +
            now.getDate().toString().padStart(2, '0');

        const numberPart = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
        const letterPart = this.randomString(2, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');

        return `SN${datePart}${numberPart}${letterPart}`;
    }

    /**
     * Generate realistic lot number (up to 20 alphanumeric chars)
     */
    generateLotNumber() {
        // Format: LOT + YYYY + batch letter + 3-digit batch number
        const year = this.currentYear;
        const batchLetter = this.batchLetters[Math.floor(Math.random() * this.batchLetters.length)];
        const batchNumber = Math.floor(Math.random() * 999) + 1;

        return `LOT${year}${batchLetter}${batchNumber.toString().padStart(3, '0')}`;
    }

    /**
     * Generate realistic expiration date in YYMMDD format (before April 2026)
     */
    generateExpirationDate() {
        // Generate expiration dates between now and March 2026
        const startDate = new Date(); // Current date (April 29, 2026)
        const endDate = new Date(2026, 2, 31); // March 31, 2026 (month is 0-indexed)

        // If current date is after March 2026, generate dates in the past
        let maxDate = endDate;
        if (startDate > endDate) {
            // Generate dates between January 2025 and March 2026
            const earlierStart = new Date(2025, 0, 1); // January 1, 2025
            const timeRange = endDate.getTime() - earlierStart.getTime();
            const randomTime = Math.random() * timeRange;
            const expDate = new Date(earlierStart.getTime() + randomTime);

            const year = expDate.getFullYear().toString().slice(-2);
            const month = (expDate.getMonth() + 1).toString().padStart(2, '0');
            const day = expDate.getDate().toString().padStart(2, '0');

            return `${year}${month}${day}`;
        } else {
            // Generate dates between now and March 31, 2026
            const timeRange = endDate.getTime() - startDate.getTime();
            const randomTime = Math.random() * timeRange;
            const expDate = new Date(startDate.getTime() + randomTime);

            const year = expDate.getFullYear().toString().slice(-2);
            const month = (expDate.getMonth() + 1).toString().padStart(2, '0');
            const day = expDate.getDate().toString().padStart(2, '0');

            return `${year}${month}${day}`;
        }
    }

    /**
     * Generate random string of specified length from given characters
     */
    randomString(length, chars) {
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Generate GS1 DataMatrix content with Application Identifiers
     */
    generateGs1DatamatrixContent(gtin, serial, lot, expDate) {
        return `(01)${gtin}(21)${serial}(17)${expDate}(10)${lot}`;
    }

    /**
     * Generate complete test data for a list of NDC numbers
     */
    generateTestData(ndcList) {
        const testData = [];

        for (const ndc of ndcList) {
            // Generate all required elements
            const gtin = this.ndcToGtin14(ndc);
            const serial = this.generateSerialNumber();
            const lot = this.generateLotNumber();
            const expiry = this.generateExpirationDate();
            const gs1Content = this.generateGs1DatamatrixContent(gtin, serial, lot, expiry);

            // Create data record in your requested format
            const record = {
                ndc: ndc,
                gtin: gtin,
                serial: serial,
                lot: lot,
                expiry: expiry,
                gs1_datamatrix_content: gs1Content,
                generated_timestamp: new Date().toISOString()
            };

            testData.push(record);
        }

        return testData;
    }

    /**
     * Save test data to JSON file
     */
    saveToJson(data, filename = 'pharmaceutical_test_data.json') {
        const fs = require('fs');
        fs.writeFileSync(filename, JSON.stringify(data, null, 2));
        console.log(`✅ Test data saved to ${filename}`);
    }

    /**
     * Save test data to CSV file
     */
    saveToCsv(data, filename = 'pharmaceutical_test_data.csv') {
        if (!data.length) return;

        const fs = require('fs');
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
        ].join('\n');

        fs.writeFileSync(filename, csvContent);
        console.log(`✅ Test data saved to ${filename}`);
    }

    /**
     * Save test data in raw text format (no quotes, clean values)
     */
    saveToRawText(data, filename = 'pharmaceutical_raw_data.txt') {
        if (!data.length) return;

        const fs = require('fs');
        let content = '';

        data.forEach((record, index) => {
            content += `NDC #${index + 1}: ${record.ndc}\n`;
            content += `${record.gtin}\n`;
            content += `${record.serial}\n`;
            content += `${record.lot}\n`;
            content += `${record.expiry}\n`;
            content += `\n`; // Empty line between records
        });

        fs.writeFileSync(filename, content);
        console.log(`✅ Raw text data saved to ${filename}`);
    }
}

// Your NDC List from the image
const NDC_LIST = [
    "00002-7511-01",
    "00005-1571-02",
    "00006-0575-61",
    "00032-1206-01",
    "00065-8531-10",
    "00074-4341-90",
    "00078-0911-12",
    "00093-6303-45",
    "00168-0264-60",
    "00169-2662-11",
    "00310-6105-30",
    "00378-3225-93",
    "00378-8082-45",
    "00378-4642-26",
    "00456-1420-90",
    "00456-1410-30",
    "00527-4958-32",
    "00591-2880-01",
    "00591-2884-01",
    "00591-0370-01",
    "00603-5338-31",
    "00713-0683-31",
    "00781-5388-01",
    "00781-1961-60",
    "00781-8089-31",
    "16729-0007-15",
    "24208-0358-05",
    "33342-0047-10",
    "45802-0493-83"
];

function main() {
    console.log('🔬 JavaScript Pharmaceutical Test Data Generator');
    console.log('='.repeat(55));
    console.log(`📋 Processing ${NDC_LIST.length} NDC numbers...`);

    // Initialize generator
    const generator = new PharmaceuticalDataGenerator();

    // Generate test data
    const testData = generator.generateTestData(NDC_LIST);

    // Save to files
    generator.saveToJson(testData, 'my_pharmaceutical_test_data.json');
    generator.saveToCsv(testData, 'my_pharmaceutical_test_data.csv');
    generator.saveToRawText(testData, 'my_pharmaceutical_raw_data.txt');

    // Display sample data in raw format (no quotes, no tags)
    console.log(`\n📋 Generated Test Data (Raw Values Format):`);
    console.log('-'.repeat(55));

    testData.forEach((record, index) => {
        console.log(`\n🏥 NDC #${index + 1}: ${record.ndc}`);
        console.log(record.gtin);
        console.log(record.serial);
        console.log(record.lot);
        console.log(record.expiry);
    });

    console.log(`\n✅ Successfully generated ${testData.length} pharmaceutical test records!`);
    console.log('\n📁 Output Files Created:');
    console.log('   📄 my_pharmaceutical_test_data.json');
    console.log('   📄 my_pharmaceutical_test_data.csv');
    console.log('   📄 my_pharmaceutical_raw_data.txt (Clean values for QR generation)');

    console.log('\n💡 Field Explanations:');
    console.log('   • gtin: GS1-compliant 14-digit identifier (calculated from NDC)');
    console.log('   • serial: Unique package serial number (SN + date + random)');
    console.log('   • lot: Manufacturing batch number (LOT + year + batch)');
    console.log('   • expiry: Expiration date in YYMMDD format (before April 2026)');

    console.log('\n🎯 Ready for QR Code Generation!');
    console.log('   Use the complete records to generate GS1 DataMatrix barcodes');
    console.log('   for testing your pharmaceutical scanning system.');
}

// Run the generator
if (require.main === module) {
    main();
}

module.exports = PharmaceuticalDataGenerator;