/**
 * Debit Memo PDF Service
 *
 * Generates debit memo PDFs using PDFKit based on the format requirements.
 * Similar structure to manifestService.ts
 */

import PDFDocument from 'pdfkit';
import bwipjs from 'bwip-js';

// ============================================================
// Types
// ============================================================

export interface DebitMemoPdfData {
  memo: {
    memoNumber: string;
    raNumber: string | null;
    createdAt: string;
    totalAskValue: number;
    destination: string | null;
    baggieManifest: string | null;
  };
  pharmacy: {
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    phone: string | null;
    fax: string | null;
    deaNumber: string | null;
    deaExpiration: string | null;
  };
  labeler: {
    labelerId: string;
    labelerName: string;
    address: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    phone: string | null;
    fax: string | null;
  };
  items: Array<{
    ndc: string | null;
    drugName: string | null;
    lotNumber: string | null;
    expirationDate: string | null;
    packageSize: string | null;
    fullQuantity: number;
    partialQuantity: number;
    askPrice: number | null;
    askValue: number | null;
  }>;
  warehouse: {
    companyName: string;
    address: string | null;
    phone: string | null;
  };
  remitTo: {
    companyName: string;
    address: string | null;
    phone: string | null;
    fax: string | null;
  };
}

// ============================================================
// Helpers
// ============================================================

function fmt$(val: number | null): string {
  if (val == null) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

function fmtDate(val: string | null): string {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
}

function pdfToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

// ============================================================
// Debit Memo PDF Generator
// ============================================================

export async function generateDebitMemoPdf(data: DebitMemoPdfData): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 30, bottom: 30, left: 30, right: 30 },
  });

  const pageWidth = 612 - 60; // letter width minus margins
  let yPos = 30;

  // ══════════════════════════════════════════════════════════
  // TOP HEADER - COMPANY INFORMATION (Centered)
  // ══════════════════════════════════════════════════════════
  doc.fontSize(14).font('Helvetica-Bold').text(data.warehouse.companyName, 30, yPos, { align: 'center', width: pageWidth });
  yPos += 18;
  
  if (data.warehouse.address) {
    doc.fontSize(11).font('Helvetica').text(data.warehouse.address, 30, yPos, { align: 'center', width: pageWidth });
    yPos += 14;
  }
  
  if (data.warehouse.phone) {
    doc.fontSize(11).text(`Phone: ${data.warehouse.phone}`, 30, yPos, { align: 'center', width: pageWidth });
    yPos += 18;
  }
  
  // Horizontal divider line
  doc.strokeColor('#000000').lineWidth(1)
    .moveTo(30, yPos).lineTo(582, yPos).stroke();
  yPos += 20;

  // ══════════════════════════════════════════════════════════
  // STORE/PHARMACY INFORMATION (Top Left)
  // ══════════════════════════════════════════════════════════
  doc.fontSize(11).font('Helvetica-Bold').text('Store Name:', 30, yPos);
  doc.fontSize(11).font('Helvetica').text(data.pharmacy.name, 120, yPos);
  yPos += 15;
  
  if (data.pharmacy.address) {
    doc.fontSize(11).font('Helvetica-Bold').text('Street:', 30, yPos);
    doc.fontSize(11).font('Helvetica').text(data.pharmacy.address, 120, yPos);
    yPos += 15;
  }
  
  if (data.pharmacy.city || data.pharmacy.state || data.pharmacy.zipCode) {
    doc.fontSize(11).font('Helvetica-Bold').text('C/S/Z:', 30, yPos);
    const cityStateZip = [
      data.pharmacy.city,
      data.pharmacy.state,
      data.pharmacy.zipCode
    ].filter(Boolean).join(', ');
    doc.fontSize(11).font('Helvetica').text(cityStateZip, 120, yPos);
    yPos += 15;
  }
  
  if (data.pharmacy.deaNumber && data.pharmacy.deaExpiration) {
    doc.fontSize(11).font('Helvetica-Bold').text('DEA # & Exp:', 30, yPos);
    doc.fontSize(11).font('Helvetica').text(`${data.pharmacy.deaNumber}    ${fmtDate(data.pharmacy.deaExpiration)}`, 120, yPos);
    yPos += 15;
  }

  // ══════════════════════════════════════════════════════════
  // REMIT CREDITS TO SECTION (Top Right)
  // ══════════════════════════════════════════════════════════
  const rightColX = 340;
  let rightYPos = yPos - 75; // Start at same level as pharmacy info
  
  doc.fontSize(11).font('Helvetica-Bold').text('Remit Credits to:', rightColX, rightYPos);
  rightYPos += 15;
  
  doc.fontSize(11).font('Helvetica-Bold').text(data.remitTo.companyName, rightColX + 20, rightYPos);
  rightYPos += 15;
  
  if (data.remitTo.address) {
    doc.fontSize(11).font('Helvetica').text(data.remitTo.address, rightColX + 20, rightYPos);
    rightYPos += 15;
  }
  
  if (data.remitTo.phone) {
    doc.fontSize(11).font('Helvetica').text(`Phone: ${data.remitTo.phone}`, rightColX + 20, rightYPos);
    rightYPos += 15;
  }
  
  if (data.remitTo.fax) {
    doc.fontSize(11).font('Helvetica').text(`Fax: ${data.remitTo.fax}`, rightColX + 20, rightYPos);
    rightYPos += 15;
  }

  yPos = Math.max(yPos, rightYPos + 10);

  // Divider Line
  yPos += 10;
  doc.strokeColor('#000000').lineWidth(1)
    .moveTo(30, yPos).lineTo(582, yPos).stroke();
  yPos += 15;

  // ══════════════════════════════════════════════════════════
  // MANUFACTURER/LABELER SECTION HEADER
  // ══════════════════════════════════════════════════════════
  doc.fontSize(14).font('Helvetica-Bold').text(data.labeler.labelerName, 30, yPos, { align: 'center', width: pageWidth });
  yPos += 20;

  // ══════════════════════════════════════════════════════════
  // LINE ITEMS TABLE
  // ══════════════════════════════════════════════════════════
  
  // Table Header
  const tableTop = yPos;
  doc.rect(30, tableTop, pageWidth, 18).fillAndStroke('#f0f0f0', '#000000');
  
  doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold');
  
  const colX = {
    num: 32,
    ndc: 50,
    drugName: 140,
    lot: 280,
    exp: 330,
    pkg: 380,
    full: 425,
    partial: 460,
    price: 500,
    value: 540,
  };
  
  yPos = tableTop + 5;
  doc.text(' ', colX.num, yPos, { width: 15 });
  doc.text('NDC', colX.ndc, yPos, { width: 85 });
  doc.text('Drug Name', colX.drugName, yPos, { width: 135 });
  doc.text('Lot #', colX.lot, yPos, { width: 45 });
  doc.text('Exp Date', colX.exp, yPos, { width: 45 });
  doc.text('Pkg Size', colX.pkg, yPos, { width: 40 });
  doc.text('Full Qty', colX.full, yPos, { width: 30, align: 'right' });
  doc.text('Partial', colX.partial, yPos, { width: 35, align: 'right' });
  doc.text('Price', colX.price, yPos, { width: 35, align: 'right' });
  doc.text('Value', colX.value, yPos, { width: 42, align: 'right' });
  
  yPos = tableTop + 20;
  
  // Table Rows
  doc.font('Helvetica').fontSize(9);
  
  data.items.forEach((item, idx) => {
    // Check for page break
    if (yPos > 720) {
      doc.addPage();
      yPos = 30;
    }
    
    const rowHeight = 14;
    
    // Alternating row background
    if (idx % 2 === 0) {
      doc.rect(30, yPos - 2, pageWidth, rowHeight).fill('#fafafa');
    }
    
    doc.fillColor('#000000');
    
    // Row number
    doc.text(String(idx + 1) + '.', colX.num, yPos, { width: 15 });
    
    // NDC
    doc.text(item.ndc || '—', colX.ndc, yPos, { width: 85 });
    
    // Drug Name (truncate if too long)
    const drugName = (item.drugName || 'Unknown').substring(0, 35);
    doc.text(drugName, colX.drugName, yPos, { width: 135 });
    
    // Lot Number
    doc.text(item.lotNumber || '—', colX.lot, yPos, { width: 45 });
    
    // Expiration Date (shorter format: MM/YY)
    const expDate = item.expirationDate ? new Date(item.expirationDate).toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' }).replace('/', '/') : '—';
    doc.text(expDate, colX.exp, yPos, { width: 45 });
    
    // Package Size
    doc.text(item.packageSize || '—', colX.pkg, yPos, { width: 40 });
    
    // Full Quantity
    doc.text(String(item.fullQuantity || 0), colX.full, yPos, { width: 30, align: 'right' });
    
    // Partial Quantity
    doc.text(String(item.partialQuantity || 0), colX.partial, yPos, { width: 35, align: 'right' });
    
    // Price
    doc.text(fmt$(item.askPrice), colX.price, yPos, { width: 35, align: 'right' });
    
    // Value
    doc.text(fmt$(item.askValue), colX.value, yPos, { width: 42, align: 'right' });
    
    yPos += rowHeight;
    
    // Row bottom border
    doc.strokeColor('#dddddd').lineWidth(0.5)
      .moveTo(30, yPos - 2).lineTo(582, yPos - 2).stroke();
  });
  
  // ══════════════════════════════════════════════════════════
  // SUBTOTAL (ERV This Labeler)
  // ══════════════════════════════════════════════════════════
  yPos += 10;
  doc.fontSize(11).font('Helvetica-Bold');
  doc.text('ERV This Labeler:', 420, yPos);
  doc.text(fmt$(data.memo.totalAskValue), 520, yPos, { align: 'right', width: 62 });
  
  yPos += 30;

  // ══════════════════════════════════════════════════════════
  // BATCH SHIP SECTION
  // ══════════════════════════════════════════════════════════
  if (data.memo.baggieManifest || data.memo.destination) {
    yPos += 20;
    doc.fontSize(11).font('Helvetica-Bold').text(`Batch Ship This Baggie Manifest To:  ${data.memo.destination || ''}`, 30, yPos);
    yPos += 20;
  }

  // ══════════════════════════════════════════════════════════
  // BARCODE SECTION
  // ══════════════════════════════════════════════════════════
  yPos += 20;
  doc.strokeColor('#000000').lineWidth(2)
    .moveTo(30, yPos).lineTo(582, yPos).stroke();
  yPos += 15;
  
  // Generate barcode for debit memo number
  try {
    const barcodeBuffer = await bwipjs.toBuffer({
      bcid: 'code128',
      text: data.memo.memoNumber,
      scale: 2,
      height: 8,
      includetext: false,
    });
    
    doc.fontSize(11).font('Helvetica-Bold').text('Debit Memo:', 30, yPos);
    yPos += 20;
    
    // Embed barcode image (smaller size)
    doc.image(barcodeBuffer, 30, yPos, { width: 180 });
    yPos += 45;
    
    // Show memo number below barcode
    doc.fontSize(10).font('Helvetica').text(data.memo.memoNumber, 30, yPos);
    yPos += 15;
  } catch (error) {
    console.error('Failed to generate barcode:', error);
    // Fallback if barcode generation fails
    doc.fontSize(11).font('Helvetica-Bold').text('Debit Memo:', 30, yPos);
    yPos += 15;
    doc.fontSize(10).font('Helvetica').text(data.memo.memoNumber, 30, yPos);
    yPos += 20;
  }
  
  doc.strokeColor('#000000').lineWidth(2)
    .moveTo(30, yPos).lineTo(582, yPos).stroke();
  yPos += 15;
  
  doc.fontSize(10).font('Helvetica').text(`${fmtDate(data.memo.createdAt)}`, 30, yPos);

  return pdfToBuffer(doc);
}

// ============================================================
// Debit Memo Summary PDF Generator
// ============================================================

import { DebitMemoSummaryData } from './batchService';

export async function generateDebitMemoSummaryPdf(data: DebitMemoSummaryData): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 30, bottom: 30, left: 30, right: 30 },
  });

  const pageWidth = 612 - 60;
  let yPos = 30;

  // ══════════════════════════════════════════════════════════
  // TITLE HEADER
  // ══════════════════════════════════════════════════════════
  doc.rect(30, yPos, pageWidth, 28).fillAndStroke('#e0e0e0', '#999999');
  doc.fillColor('#000000').fontSize(16).font('Helvetica-Bold')
    .text('Return Transaction Debit Memo Overview', 30, yPos + 6, { align: 'center', width: pageWidth });
  yPos += 40;

  // ══════════════════════════════════════════════════════════
  // RETURN INFO (License Plate, Processor, Dates)
  // ══════════════════════════════════════════════════════════
  const leftCol = 30;
  const rightCol = 380;

  doc.fontSize(10).font('Helvetica-Bold').text('License Plate:', leftCol, yPos);
  doc.font('Helvetica').text(data.licensePlate, leftCol + 85, yPos);
  
  if (data.processorName) {
    doc.font('Helvetica-Bold').text('Processor:', 240, yPos);
    doc.font('Helvetica').text(data.processorName, 305, yPos);
  }
  
  doc.font('Helvetica-Bold').text('Return Date:', rightCol + 50, yPos, { width: 70 });
  doc.font('Helvetica').text(fmtDate(data.returnDate), rightCol + 130, yPos, { width: 70 });
  yPos += 16;

  doc.font('Helvetica-Bold').text('Store Name:', leftCol, yPos);
  doc.font('Helvetica').text(data.pharmacy.name, leftCol + 85, yPos, { width: 240 });
  doc.font('Helvetica-Bold').text('Close-Out Date:', rightCol + 50, yPos, { width: 80 });
  doc.font('Helvetica').text(fmtDate(data.closeOutDate), rightCol + 130, yPos, { width: 70 });
  yPos += 16;

  if (data.pharmacy.address) {
    doc.font('Helvetica-Bold').text('Street:', leftCol, yPos);
    doc.font('Helvetica').text(data.pharmacy.address, leftCol + 85, yPos);
    doc.font('Helvetica-Bold').text('Batch:', rightCol + 50, yPos, { width: 70 });
    doc.font('Helvetica').text(data.batchMonth, rightCol + 130, yPos, { width: 70 });
    yPos += 16;
  }

  if (data.pharmacy.city || data.pharmacy.state || data.pharmacy.zipCode) {
    doc.font('Helvetica-Bold').text('C/S/Z:', leftCol, yPos);
    doc.font('Helvetica').text(
      [data.pharmacy.city, data.pharmacy.state, data.pharmacy.zipCode].filter(Boolean).join(', '),
      leftCol + 85, yPos
    );
    doc.font('Helvetica-Bold').text('Cardinal Batch:', rightCol + 50, yPos, { width: 80 });
    doc.font('Helvetica').text(data.cardinalBatch, rightCol + 130, yPos, { width: 100 });
    yPos += 16;
  }

  if (data.pharmacy.deaNumber) {
    doc.font('Helvetica-Bold').text('DEA Number:', leftCol, yPos);
    doc.font('Helvetica').text(data.pharmacy.deaNumber, leftCol + 85, yPos);
    yPos += 16;
  }

  if (data.pharmacy.contact) {
    doc.font('Helvetica-Bold').text('Contact:', leftCol, yPos);
    doc.font('Helvetica').text(data.pharmacy.contact, leftCol + 85, yPos);
    yPos += 16;
  }

  if (data.pharmacy.phone) {
    doc.font('Helvetica-Bold').text('Phone:', leftCol, yPos);
    doc.font('Helvetica').text(data.pharmacy.phone, leftCol + 85, yPos);
  }

  if (data.pharmacy.email) {
    doc.font('Helvetica-Bold').text('E-Mail:', 280, yPos);
    doc.font('Helvetica').text(data.pharmacy.email, 325, yPos);
  }

  yPos += 16;

  // *COHOES Use Only* label
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000')
    .text('*COHOES Use Only*', 30, yPos, { align: 'center', width: pageWidth });
  yPos += 30;

  // ══════════════════════════════════════════════════════════
  // DEBIT MEMO SUMMARY TABLE
  // ══════════════════════════════════════════════════════════

  const tableTop = yPos;
  doc.rect(30, tableTop, pageWidth, 18).fillAndStroke('#f0f0f0', '#000000');

  doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold');

  const sColX = {
    num: 35,
    memo: 55,
    labeler: 195,
    returnTo: 395,
    ra: 500,
    total: 540,
  };

  yPos = tableTop + 5;
  doc.text(' ', sColX.num, yPos, { width: 15 });
  doc.text('Full Debit Memo', sColX.memo, yPos, { width: 135 });
  doc.text('Labeler Name', sColX.labeler, yPos, { width: 195 });
  doc.text('Return To', sColX.returnTo, yPos, { width: 100 });
  doc.text('RA Needed', sColX.ra, yPos, { width: 45 });
  doc.text('Total', sColX.total, yPos, { width: 42, align: 'right' });

  yPos = tableTop + 20;

  doc.font('Helvetica').fontSize(9);

  data.memos.forEach((memo, idx) => {
    if (yPos > 700) {
      doc.addPage();
      yPos = 30;
    }

    const rowHeight = 16;

    if (idx % 2 === 0) {
      doc.rect(30, yPos - 2, pageWidth, rowHeight).fill('#fafafa');
    }

    doc.fillColor('#000000');
    doc.text(`${idx + 1}.`, sColX.num, yPos, { width: 15 });
    doc.text(memo.memoNumber || '—', sColX.memo, yPos, { width: 135 });
    doc.text((memo.labelerName || '—').substring(0, 40), sColX.labeler, yPos, { width: 195 });
    doc.text(memo.destination || '—', sColX.returnTo, yPos, { width: 100 });
    doc.text(memo.raNeeded ? 'YES' : 'NO', sColX.ra, yPos, { width: 45 });
    doc.text(fmt$(memo.totalAskValue), sColX.total, yPos, { width: 42, align: 'right' });

    yPos += rowHeight;

    doc.strokeColor('#dddddd').lineWidth(0.5)
      .moveTo(30, yPos - 2).lineTo(582, yPos - 2).stroke();
  });

  // ══════════════════════════════════════════════════════════
  // GRAND TOTAL
  // ══════════════════════════════════════════════════════════
  yPos += 15;

  doc.rect(380, yPos - 5, pageWidth - 350, 22).fill('#f0f0f0');
  doc.fillColor('#000000');
  doc.fontSize(11).font('Helvetica-Bold')
    .text('Total $$$ Ask:', 400, yPos, { width: 100 });
  doc.text(fmt$(data.grandTotal), sColX.total - 10, yPos, { width: 52, align: 'right' });

  // ══════════════════════════════════════════════════════════
  // BARCODE SECTION (bottom of page)
  // ══════════════════════════════════════════════════════════
  yPos = 680;

  doc.strokeColor('#000000').lineWidth(1.5)
    .moveTo(30, yPos).lineTo(582, yPos).stroke();
  yPos += 10;

  try {
    const barcodeBuffer = await bwipjs.toBuffer({
      bcid: 'code128',
      text: data.licensePlate,
      scale: 2,
      height: 10,
      includetext: false,
    });

    doc.image(barcodeBuffer, 30, yPos, { width: 200 });
    yPos += 50;
    doc.fontSize(10).font('Helvetica').text(data.licensePlate, 30, yPos);
  } catch {
    doc.fontSize(10).font('Helvetica').text(data.licensePlate, 30, yPos);
    yPos += 15;
  }

  // Date and Page at bottom right
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.fontSize(9).font('Helvetica')
    .text(today, 380, 730, { width: 200, align: 'right' });
  doc.text('Page 1 of 1', 380, 742, { width: 200, align: 'right' });

  return pdfToBuffer(doc);
}
