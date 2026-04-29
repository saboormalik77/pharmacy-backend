/**
 * Cardinal Invoice & Pharmacy Itemized Return Service
 *
 * Generates:
 * 1. Cardinal Invoice PDF - Manufacturer transactions summary
 * 2. Pharmacy Itemized Return XLSX - Individual pharmacy manufacturer transactions
 */

import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';

// ============================================================
// Types
// ============================================================

interface BatchData {
  id: string;
  batchMonth: string;
  batchName: string;
  status: string;
  totalReturns: number;
  totalValue: number;
  closedAt: string | null;
}

interface DebitMemoData {
  id: string;
  pharmacyId: string;
  pharmacyName: string;
  memoNumber: string;
  destination: string | null;
  labelerId: string | null;
  labelerName: string | null;
  totalItems: number;
  totalAskValue: number;
}

interface ManufacturerPolicyData {
  labelerId: string;
  manufacturerName: string;
  // CVN is typically derived from the first 4-5 digits of the labeler_id
}

interface CardinalInvoiceRow {
  manufacturer: string;
  cvn: string;
  debitMemo: string;
  amount: number;
  pieces: number;
}

interface PharmacyReturnItem {
  ndc: string;
  productName: string;
  lot: string;
  exp: string;
  qty: number;
}

interface PharmacyReturnData {
  pharmacyName: string;
  deaNumber: string | null;
  phone: string | null;
  licensePlate: string;
  status: string;
  date: string;
  totalItems: number;
  returnableCount: number;
  nonReturnableCount: number;
  hasCiiItems: boolean;
  returnableItems: PharmacyReturnItem[];
  nonReturnableItems: PharmacyReturnItem[];
}

// ============================================================
// Settings (matching the sample file format)
// ============================================================

interface CardinalInvoiceSettings {
  companyName: string;
  address: string;
  cityStateZip: string;
  phone: string;
  fax: string;
  invoiceRunBy: string;
}

// Default Cardinal Health settings - these match the sample invoice
const DEFAULT_SETTINGS: CardinalInvoiceSettings = {
  companyName: 'Cardinal Health',
  address: '7000 Cardinal Place',
  cityStateZip: 'Dublin, Ohio 42017',
  phone: '(614) 757-4804',
  fax: '(614) 553-6255',
  invoiceRunBy: 'Steve Eckert',
};

// ============================================================
// Helper Functions
// ============================================================

function ensureAdmin() {
  if (!supabaseAdmin) throw new AppError('Supabase admin client not configured', 500);
  return supabaseAdmin;
}

/**
 * Format date for display (MM/DD/YYYY)
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
}

/**
 * Format expiration date from ISO string to MM/DD/YYYY
 */
function formatExpDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
}

/**
 * Generate invoice number from batch month and sequence
 * Format: 1MM-DDMMYY (e.g., 113-020526 for batch in January 2026, created Feb 5)
 */
function generateInvoiceNumber(batchMonth: string): string {
  const d = new Date();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const year = d.getFullYear().toString().slice(-2);
  
  // Use batch month for the prefix (1 = Jan, 2 = Feb, etc.)
  const batchDate = new Date(batchMonth);
  const batchMonthNum = batchDate.getMonth() + 1;
  
  return `1${batchMonthNum.toString().padStart(2, '0')}-${day}${month}${year}`;
}

/**
 * Get month name for summary title
 */
function getMonthName(batchMonth: string): string {
  const d = new Date(batchMonth);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ============================================================
// Cardinal Invoice XLSX Generation
// ============================================================

/**
 * Get batch data with debit memos for Cardinal Invoice generation
 */
export async function getBatchDataForCardinalInvoice(batchId: string): Promise<{
  batch: BatchData;
  debitMemos: DebitMemoData[];
}> {
  const sb = ensureAdmin();
  
  // Get batch details
  const { data: batchResult, error: batchError } = await sb.rpc('get_batch', { p_id: batchId });
  
  if (batchError) throw new AppError(`Failed to get batch: ${batchError.message}`, 400);
  if (!batchResult || batchResult.error) {
    throw new AppError(batchResult?.message || 'Batch not found', batchResult?.code || 404);
  }
  
  const batch = batchResult.data.batch as BatchData;
  const debitMemos = batchResult.data.debitMemos as DebitMemoData[];
  
  return { batch, debitMemos };
}

/**
 * Get manufacturer policy data (CVN lookup)
 * CVN (Cardinal Vendor Number) is typically the labeler_id or a mapped value
 */
async function getManufacturerCVN(labelerId: string): Promise<string> {
  const sb = ensureAdmin();
  
  // Try to get from manufacturer_policies table
  const { data, error } = await sb
    .from('manufacturer_policies')
    .select('labeler_id')
    .eq('labeler_id', labelerId)
    .single();
  
  if (error || !data) {
    // If not found, use the labeler_id as CVN (common practice)
    // CVN is typically 4-5 digits
    return labelerId.slice(0, 5);
  }
  
  return data.labeler_id.slice(0, 5);
}

/**
 * Generate Cardinal Invoice PDF file
 * 
 * Format matches the sample provided:
 * - Header: Cardinal Health company info
 * - Invoice Copy label with Invoice Date, Invoice Number, Batch, Invoice Run By
 * - Return Transactions table: Numbered rows with Manufacturer, CVN, Debit Memo, Amount
 * - Footer: Invoice Total
 */
export async function generateCardinalInvoicePdf(
  batchId: string,
  settings?: Partial<CardinalInvoiceSettings>
): Promise<Buffer> {
  const finalSettings = { ...DEFAULT_SETTINGS, ...settings };
  const { batch, debitMemos } = await getBatchDataForCardinalInvoice(batchId);
  
  if (batch.status !== 'closed' && batch.status !== 'submitted') {
    throw new AppError('Batch must be closed before generating Cardinal Invoice', 400);
  }
  
  if (debitMemos.length === 0) {
    throw new AppError('No debit memos found for this batch', 400);
  }
  
  const invoiceNumber = generateInvoiceNumber(batch.batchMonth);
  const monthName = getMonthName(batch.batchMonth);
  const invoiceDate = formatDate(new Date().toISOString());
  
  // Build the data rows
  const rows: CardinalInvoiceRow[] = [];
  
  for (const memo of debitMemos) {
    // Get CVN from labeler_id (first 4-5 digits)
    const cvn = memo.labelerId ? await getManufacturerCVN(memo.labelerId) : '';
    
    rows.push({
      manufacturer: memo.labelerName || 'Unknown Manufacturer',
      cvn: cvn,
      debitMemo: memo.memoNumber,
      amount: memo.totalAskValue,
      pieces: memo.totalItems,
    });
  }
  
  // Sort by manufacturer name
  rows.sort((a, b) => a.manufacturer.localeCompare(b.manufacturer));
  
  // Calculate invoice total
  const invoiceTotal = rows.reduce((sum, row) => sum + row.amount, 0);
  
  // Create PDF document
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 40, bottom: 40, left: 50, right: 50 },
  });
  
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  
  // ========== HEADER SECTION ==========
  // Cardinal Health company info (left side)
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000')
    .text(finalSettings.companyName, 50, 40);
  doc.fontSize(9).font('Helvetica').fillColor('#333333')
    .text(finalSettings.address, 50, 55)
    .text(finalSettings.cityStateZip, 50, 67)
    .text(`Phone: ${finalSettings.phone}`, 50, 79)
    .text(`Fax: ${finalSettings.fax}`, 50, 91);
  
  // Invoice Copy label (right side)
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000')
    .text('Invoice Copy', 400, 40, { align: 'right' });
  
  // Invoice details (right side)
  const detailsStartY = 65;
  const labelX = 380;
  const valueX = 480;
  
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#666666');
  doc.text('Invoice Date:', labelX, detailsStartY);
  doc.text('Invoice Number:', labelX, detailsStartY + 14);
  doc.text('Batch:', labelX, detailsStartY + 28);
  doc.text('Invoice Run By:', labelX, detailsStartY + 42);
  
  doc.font('Helvetica').fillColor('#000000');
  doc.text(invoiceDate, valueX, detailsStartY);
  doc.text(invoiceNumber, valueX, detailsStartY + 14);
  doc.text(monthName, valueX, detailsStartY + 28);
  doc.text(finalSettings.invoiceRunBy, valueX, detailsStartY + 42);
  
  // ========== TABLE SECTION ==========
  doc.moveDown(3);
  const tableStartY = 140;
  
  // Section title
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000')
    .text('Return Transactions On This Invoice:', 50, tableStartY);
  
  // Table header
  const headerY = tableStartY + 25;
  const cols = { num: 50, mfr: 70, cvn: 280, memo: 330, amount: 450 };
  
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#333333');
  doc.text('', cols.num, headerY);
  doc.text('Manufacturer', cols.mfr, headerY);
  doc.text('CVN', cols.cvn, headerY);
  doc.text('Debit Memo', cols.memo, headerY);
  doc.text('Amount', cols.amount, headerY);
  
  // Draw header underline
  doc.strokeColor('#cccccc').lineWidth(0.5)
    .moveTo(50, headerY + 12).lineTo(562, headerY + 12).stroke();
  
  // Table rows
  let currentY = headerY + 20;
  doc.fontSize(9).font('Helvetica').fillColor('#000000');
  
  rows.forEach((row, index) => {
    // Check for page break
    if (currentY > 700) {
      doc.addPage();
      currentY = 50;
      
      // Repeat header on new page
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#333333');
      doc.text('', cols.num, currentY);
      doc.text('Manufacturer', cols.mfr, currentY);
      doc.text('CVN', cols.cvn, currentY);
      doc.text('Debit Memo', cols.memo, currentY);
      doc.text('Amount', cols.amount, currentY);
      doc.strokeColor('#cccccc').lineWidth(0.5)
        .moveTo(50, currentY + 12).lineTo(562, currentY + 12).stroke();
      currentY += 20;
      doc.font('Helvetica').fillColor('#000000');
    }
    
    const rowNum = `${index + 1}.`;
    const amountStr = `$${row.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    doc.text(rowNum, cols.num, currentY, { width: 18 });
    doc.text(row.manufacturer.substring(0, 35), cols.mfr, currentY, { width: 205 });
    doc.text(row.cvn, cols.cvn, currentY, { width: 45 });
    doc.text(row.debitMemo, cols.memo, currentY, { width: 115 });
    doc.text(amountStr, cols.amount, currentY, { width: 80, align: 'right' });
    
    currentY += 16;
  });
  
  // ========== FOOTER - INVOICE TOTAL ==========
  currentY += 10;
  doc.strokeColor('#000000').lineWidth(1)
    .moveTo(350, currentY).lineTo(562, currentY).stroke();
  
  currentY += 8;
  const totalStr = `$${invoiceTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000');
  doc.text('Invoice Total:', 350, currentY);
  doc.text(totalStr, cols.amount, currentY, { width: 80, align: 'right' });
  
  // Finalize PDF
  doc.end();
  
  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

/**
 * Get the filename for Cardinal Invoice
 * Format: Cardinal_Invoice_1MM-DDMMYY.pdf
 */
export function getCardinalInvoiceFilename(batchMonth: string): string {
  const invoiceNumber = generateInvoiceNumber(batchMonth);
  return `Cardinal_Invoice_${invoiceNumber}.pdf`;
}

// ============================================================
// Pharmacy Itemized Return XLSX Generation (Cardinal Invoice Format)
// ============================================================

/**
 * Get pharmacy debit memo data for XLSX generation
 */
export async function getPharmacyDebitMemoData(transactionId: string): Promise<{
  pharmacyName: string;
  batchMonth: string;
  debitMemos: DebitMemoData[];
}> {
  const sb = ensureAdmin();
  
  // First, get the transaction to find pharmacy_id and batch_id
  const { data: transaction, error: txnError } = await sb
    .from('return_transactions')
    .select('pharmacy_id, batch_id, pharmacy:pharmacy(name)')
    .eq('id', transactionId)
    .single();
  
  if (txnError || !transaction) {
    throw new AppError('Transaction not found', 404);
  }
  
  // Get the batch info to get batch_month
  const { data: batch, error: batchError } = await sb
    .from('return_batches')
    .select('batch_month')
    .eq('id', transaction.batch_id)
    .single();
  
  if (batchError || !batch) {
    throw new AppError('Batch not found', 404);
  }
  
  // Get all debit memos for this pharmacy in this batch
  const { data: memos, error: memosError } = await sb
    .from('debit_memos')
    .select('id, pharmacy_id, memo_number, destination, labeler_id, labeler_name, total_items, total_ask_value')
    .eq('batch_id', transaction.batch_id)
    .eq('pharmacy_id', transaction.pharmacy_id);
  
  if (memosError) throw new AppError(`Failed to get debit memos: ${memosError.message}`, 400);
  
  const debitMemos: DebitMemoData[] = (memos || []).map(memo => ({
    id: memo.id,
    pharmacyId: memo.pharmacy_id,
    pharmacyName: (transaction.pharmacy as any)?.name || 'Unknown Pharmacy',
    memoNumber: memo.memo_number,
    destination: memo.destination,
    labelerId: memo.labeler_id,
    labelerName: memo.labeler_name,
    totalItems: memo.total_items,
    totalAskValue: memo.total_ask_value,
  }));
  
  return {
    pharmacyName: (transaction.pharmacy as any)?.name || 'Unknown Pharmacy',
    batchMonth: batch.batch_month,
    debitMemos,
  };
}

/**
 * Generate Pharmacy Itemized Return XLSX
 * 
 * Format matches: Cardinal_Invoice_13-020526.xlsx
 * - Header section with manufacturer summary info
 * - Data rows with: Manufacturer, CVN, Debit Memo, Amount, Pieces
 */
export async function generatePharmacyReturnXlsx(transactionId: string): Promise<Buffer> {
  const { pharmacyName, batchMonth, debitMemos } = await getPharmacyDebitMemoData(transactionId);
  
  if (debitMemos.length === 0) {
    throw new AppError('No debit memos found for this pharmacy', 400);
  }
  
  const invoiceNumber = generateInvoiceNumber(batchMonth);
  const monthName = getMonthName(batchMonth);
  const invoiceDate = formatDate(new Date().toISOString());
  
  // Build the data rows
  const rows: CardinalInvoiceRow[] = [];
  
  for (const memo of debitMemos) {
    // Get CVN from labeler_id (first 4-5 digits)
    const cvn = memo.labelerId ? await getManufacturerCVN(memo.labelerId) : '';
    
    rows.push({
      manufacturer: memo.labelerName || 'Unknown Manufacturer',
      cvn: cvn,
      debitMemo: memo.memoNumber,
      amount: memo.totalAskValue,
      pieces: memo.totalItems,
    });
  }
  
  // Sort by manufacturer name
  rows.sort((a, b) => a.manufacturer.localeCompare(b.manufacturer));
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Build worksheet data with header section (matching the sample format)
  const wsData: (string | number | null)[][] = [
    [`MANUFACTURER SUMMARY: ${monthName}`, null, null, null, null],
    [null, null, null, null, null],
    [pharmacyName, null, null, null, null],
    ['FCR Pharmacy Returns', null, null, null, null],
    [`Vendor ID: 5100015435`, null, null, null, null],
    [`Invoice Date: ${invoiceDate}`, null, null, null, null],
    [`Invoice Number: ${invoiceNumber}`, null, null, null, null],
    [null, null, null, null, null],
    ['Manufacturer', 'CVN', 'Debit Memo', 'Amount', 'Pieces'],
  ];
  
  // Add data rows
  for (const row of rows) {
    wsData.push([
      row.manufacturer,
      row.cvn,
      row.debitMemo,
      row.amount,
      row.pieces,
    ]);
  }
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 45 }, // Manufacturer
    { wch: 10 }, // CVN
    { wch: 20 }, // Debit Memo
    { wch: 12 }, // Amount
    { wch: 8 },  // Pieces
  ];
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Cardinal Invoice');
  
  // Generate buffer
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  
  return buffer;
}

/**
 * Get the filename for Pharmacy Itemized Return XLSX
 * Format: Cardinal_Invoice_{PharmacyName}_{InvoiceNumber}.xlsx
 */
export function getPharmacyReturnFilename(pharmacyName: string, batchMonth: string): string {
  const safeName = pharmacyName.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');
  const invoiceNumber = generateInvoiceNumber(batchMonth);
  return `Cardinal_Invoice_${safeName}_${invoiceNumber}.xlsx`;
}

// ============================================================
// Batch-level generation (all pharmacies in a batch)
// ============================================================

/**
 * Generate all pharmacy itemized return XLSX files for a batch
 * Returns an array of { pharmacyName, buffer, filename } objects
 */
export async function generateAllPharmacyReturnXlsx(batchId: string): Promise<Array<{
  pharmacyName: string;
  licensePlate: string;
  buffer: Buffer;
  filename: string;
}>> {
  const sb = ensureAdmin();
  
  // First, get the batch info to get batch_month
  const { data: batch, error: batchError } = await sb
    .from('return_batches')
    .select('batch_month')
    .eq('id', batchId)
    .single();
  
  if (batchError || !batch) {
    throw new AppError('Batch not found', 404);
  }
  
  // Get all transactions in the batch
  const { data: transactions, error } = await sb
    .from('return_transactions')
    .select('id, pharmacy:pharmacy(name), license_plate')
    .eq('batch_id', batchId);
  
  if (error) throw new AppError(`Failed to get batch transactions: ${error.message}`, 400);
  if (!transactions || transactions.length === 0) {
    throw new AppError('No transactions found in this batch', 400);
  }
  
  const results: Array<{ pharmacyName: string; licensePlate: string; buffer: Buffer; filename: string }> = [];
  
  for (const txn of transactions) {
    try {
      const buffer = await generatePharmacyReturnXlsx(txn.id);
      const pharmacyName = (txn.pharmacy as any)?.name || 'Unknown';
      const filename = getPharmacyReturnFilename(pharmacyName, batch.batch_month);
      
      results.push({
        pharmacyName,
        licensePlate: txn.license_plate || '',
        buffer,
        filename,
      });
    } catch (err) {
      console.error(`Failed to generate XLSX for transaction ${txn.id}:`, err);
      // Continue with other transactions
    }
  }
  
  return results;
}
