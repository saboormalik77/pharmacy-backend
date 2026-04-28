/**
 * Debit Memo PDF Service
 *
 * Generates debit memo PDFs using PDFKit based on the format requirements.
 * Similar structure to manifestService.ts
 */

import PDFDocument from 'pdfkit';

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
  remitTo: {
    companyName: string;
    address: string;
    phone: string;
    fax: string;
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
  // STORE/PHARMACY INFORMATION (Top Left)
  // ══════════════════════════════════════════════════════════
  doc.fontSize(10).font('Helvetica-Bold').text('STORE:', 30, yPos);
  yPos += 12;
  doc.fontSize(9).font('Helvetica').text(data.pharmacy.name, 30, yPos);
  yPos += 11;
  
  if (data.pharmacy.address) {
    doc.text(data.pharmacy.address, 30, yPos);
    yPos += 11;
  }
  
  if (data.pharmacy.city || data.pharmacy.state || data.pharmacy.zipCode) {
    const cityStateZip = [
      data.pharmacy.city,
      data.pharmacy.state,
      data.pharmacy.zipCode
    ].filter(Boolean).join(', ');
    doc.text(cityStateZip, 30, yPos);
    yPos += 11;
  }
  
  if (data.pharmacy.phone) {
    doc.text(`Phone: ${data.pharmacy.phone}`, 30, yPos);
    yPos += 11;
  }
  
  if (data.pharmacy.fax) {
    doc.text(`Fax: ${data.pharmacy.fax}`, 30, yPos);
    yPos += 11;
  }
  
  if (data.pharmacy.deaNumber) {
    doc.text(`DEA #: ${data.pharmacy.deaNumber}`, 30, yPos);
    yPos += 11;
  }
  
  if (data.pharmacy.deaExpiration) {
    doc.text(`DEA Exp: ${fmtDate(data.pharmacy.deaExpiration)}`, 30, yPos);
    yPos += 11;
  }

  // ══════════════════════════════════════════════════════════
  // DEBIT MEMO TITLE (Top Right)
  // ══════════════════════════════════════════════════════════
  doc.fontSize(20).font('Helvetica-Bold').text('DEBIT MEMO', 400, 30, { align: 'right', width: 152 });
  
  // Memo Number
  doc.fontSize(10).font('Helvetica-Bold').text(`#${data.memo.memoNumber}`, 400, 55, { align: 'right', width: 152 });
  
  // Date
  doc.fontSize(9).font('Helvetica').text(`Date: ${fmtDate(data.memo.createdAt)}`, 400, 70, { align: 'right', width: 152 });

  yPos = Math.max(yPos, 90);

  // ══════════════════════════════════════════════════════════
  // REMIT CREDITS TO SECTION
  // ══════════════════════════════════════════════════════════
  yPos += 10;
  doc.fontSize(10).font('Helvetica-Bold').text('REMIT CREDITS TO:', 30, yPos);
  yPos += 12;
  
  doc.fontSize(9).font('Helvetica').text(data.remitTo.companyName, 30, yPos);
  yPos += 11;
  doc.text(data.remitTo.address, 30, yPos);
  yPos += 11;
  doc.text(`Phone: ${data.remitTo.phone}`, 30, yPos);
  yPos += 11;
  doc.text(`Fax: ${data.remitTo.fax}`, 30, yPos);
  yPos += 15;

  // Divider Line
  doc.strokeColor('#000000').lineWidth(1.5)
    .moveTo(30, yPos).lineTo(582, yPos).stroke();
  yPos += 15;

  // ══════════════════════════════════════════════════════════
  // MANUFACTURER/LABELER SECTION HEADER
  // ══════════════════════════════════════════════════════════
  doc.fontSize(12).font('Helvetica-Bold').text(`MANUFACTURER/LABELER: ${data.labeler.labelerName}`, 30, yPos);
  yPos += 12;
  doc.fontSize(9).font('Helvetica').text(`Labeler ID: ${data.labeler.labelerId}`, 30, yPos);
  
  if (data.labeler.address || data.labeler.city || data.labeler.state) {
    const labelerLocation = [
      data.labeler.address,
      data.labeler.city,
      data.labeler.state,
      data.labeler.zipCode
    ].filter(Boolean).join(', ');
    yPos += 11;
    doc.text(labelerLocation, 30, yPos);
  }
  
  if (data.labeler.phone) {
    yPos += 11;
    doc.text(`Phone: ${data.labeler.phone}`, 30, yPos);
  }
  
  yPos += 15;

  // ══════════════════════════════════════════════════════════
  // LINE ITEMS TABLE
  // ══════════════════════════════════════════════════════════
  
  // Table Header
  const tableTop = yPos;
  doc.rect(30, tableTop, pageWidth, 16).fillAndStroke('#e0e0e0', '#000000');
  
  doc.fillColor('#000000').fontSize(8).font('Helvetica-Bold');
  
  const colX = {
    drugName: 32,
    ndc: 160,
    lot: 240,
    exp: 290,
    pkg: 340,
    full: 390,
    partial: 430,
    price: 470,
    value: 515,
  };
  
  yPos = tableTop + 5;
  doc.text('Drug Name', colX.drugName, yPos, { width: 125 });
  doc.text('NDC', colX.ndc, yPos, { width: 75 });
  doc.text('Lot #', colX.lot, yPos, { width: 45 });
  doc.text('Exp Date', colX.exp, yPos, { width: 45 });
  doc.text('Pkg', colX.pkg, yPos, { width: 45 });
  doc.text('Full', colX.full, yPos, { width: 35, align: 'right' });
  doc.text('Part', colX.partial, yPos, { width: 35, align: 'right' });
  doc.text('Price', colX.price, yPos, { width: 40, align: 'right' });
  doc.text('Value', colX.value, yPos, { width: 37, align: 'right' });
  
  yPos = tableTop + 18;
  
  // Table Rows
  doc.font('Helvetica').fontSize(7);
  
  data.items.forEach((item, idx) => {
    // Check for page break
    if (yPos > 720) {
      doc.addPage();
      yPos = 30;
    }
    
    const rowHeight = 12;
    
    // Alternating row background
    if (idx % 2 === 0) {
      doc.rect(30, yPos - 2, pageWidth, rowHeight).fill('#f5f5f5');
    }
    
    doc.fillColor('#000000');
    
    // Drug Name (truncate if too long)
    const drugName = (item.drugName || 'Unknown').substring(0, 40);
    doc.text(drugName, colX.drugName, yPos, { width: 125 });
    
    // NDC
    doc.text(item.ndc || '—', colX.ndc, yPos, { width: 75 });
    
    // Lot Number
    doc.text(item.lotNumber || '—', colX.lot, yPos, { width: 45 });
    
    // Expiration Date
    doc.text(fmtDate(item.expirationDate), colX.exp, yPos, { width: 45 });
    
    // Package Size
    doc.text(item.packageSize || '—', colX.pkg, yPos, { width: 45 });
    
    // Full Quantity
    doc.text(String(item.fullQuantity || 0), colX.full, yPos, { width: 35, align: 'right' });
    
    // Partial Quantity
    doc.text(String(item.partialQuantity || 0), colX.partial, yPos, { width: 35, align: 'right' });
    
    // Price
    doc.text(fmt$(item.askPrice), colX.price, yPos, { width: 40, align: 'right' });
    
    // Value
    doc.text(fmt$(item.askValue), colX.value, yPos, { width: 37, align: 'right' });
    
    yPos += rowHeight;
    
    // Row bottom border
    doc.strokeColor('#cccccc').lineWidth(0.5)
      .moveTo(30, yPos - 2).lineTo(582, yPos - 2).stroke();
  });
  
  // ══════════════════════════════════════════════════════════
  // SUBTOTAL (ERV This Labeler)
  // ══════════════════════════════════════════════════════════
  yPos += 5;
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text(`ERV This Labeler: ${fmt$(data.memo.totalAskValue)}`, 400, yPos, { align: 'right', width: 152 });
  
  yPos += 20;

  // ══════════════════════════════════════════════════════════
  // BATCH SHIP SECTION
  // ══════════════════════════════════════════════════════════
  if (data.memo.baggieManifest || data.memo.destination) {
    yPos += 10;
    doc.fontSize(10).font('Helvetica-Bold').text('BATCH SHIP THIS BAGGIE MANIFEST TO:', 30, yPos);
    yPos += 12;
    
    if (data.memo.destination) {
      doc.fontSize(9).font('Helvetica').text(`Destination: ${data.memo.destination}`, 30, yPos);
      yPos += 11;
    }
    
    if (data.memo.baggieManifest) {
      doc.text(`Baggie Manifest: ${data.memo.baggieManifest}`, 30, yPos);
      yPos += 11;
    }
    
    if (data.memo.raNumber) {
      doc.text(`RA Number: ${data.memo.raNumber}`, 30, yPos);
      yPos += 11;
    }
  }

  // ══════════════════════════════════════════════════════════
  // BARCODE PLACEHOLDERS
  // ══════════════════════════════════════════════════════════
  yPos += 20;
  doc.fontSize(8).font('Helvetica');
  doc.text(`Debit Memo Barcode: ${data.memo.memoNumber}`, 30, yPos);
  yPos += 12;
  doc.text(`DALLC Internal Use Barcode: ${data.memo.memoNumber}`, 30, yPos);
  yPos += 12;
  doc.text(`Date: ${fmtDate(data.memo.createdAt)}`, 30, yPos);

  // ══════════════════════════════════════════════════════════
  // FOOTER
  // ══════════════════════════════════════════════════════════
  doc.fontSize(7).font('Helvetica').fillColor('#999999');
  doc.text(
    `Debit Memo generated ${new Date().toLocaleString('en-US')}`,
    30, 750, { align: 'center', width: pageWidth }
  );

  return pdfToBuffer(doc);
}
