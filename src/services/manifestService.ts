/**
 * Manifest & DEA Form 222 PDF Service
 *
 * Generates PDFs using pdfkit with data fetched by RPC functions.
 * All business logic (data gathering, totals, filters) lives in
 * the database RPCs — this service only handles PDF rendering.
 */

import PDFDocument from 'pdfkit';

// ============================================================
// Types (matching RPC output shapes)
// ============================================================

interface ManifestItem {
  ndc: string | null;
  ndc10: string | null;
  proprietaryName: string | null;
  genericName: string | null;
  manufacturer: string | null;
  lotNumber: string | null;
  expirationDate: string | null;
  quantity: number;
  standardPrice: number | null;
  estimatedValue: number | null;
  destination: string | null;
  deaSchedule: string | null;
  isPartial: boolean;
  partialPercentage: number | null;
  nonReturnableReason?: string | null;
  strength: string | null;
  dosageForm: string | null;
}

interface ManifestData {
  transaction: {
    id: string;
    licensePlate: string;
    status: string;
    fedexTracking: string | null;
    fedexPickupConfirmation: string | null;
    boxCount: number | null;
    serviceType: string;
    timeIn: string | null;
    timeOut: string | null;
    finalizedAt: string | null;
    notes: string | null;
    createdAt: string;
  };
  pharmacy: {
    id: string;
    name: string;
    npiNumber: string | null;
    deaNumber: string | null;
    phone: string | null;
    email: string | null;
  };
  processor: {
    id: string | null;
    name: string | null;
  };
  summary: {
    totalItems: number;
    returnableCount: number;
    nonReturnableCount: number;
    totalReturnableValue: number;
    totalNonReturnableValue: number;
    totalValue: number;
    hasCiiItems: boolean;
  };
  returnableItems: ManifestItem[];
  nonReturnableItems: ManifestItem[];
}

interface DeaFormItem {
  ndc: string | null;
  ndc10: string | null;
  proprietaryName: string | null;
  genericName: string | null;
  manufacturer: string | null;
  lotNumber: string | null;
  serialNumber: string | null;
  expirationDate: string | null;
  quantity: number;
  standardPrice: number | null;
  estimatedValue: number | null;
  deaSchedule: string | null;
  strength: string | null;
  dosageForm: string | null;
  returnStatus: string | null;
  destination: string | null;
  isPartial: boolean;
  partialPercentage: number | null;
}

interface DeaFormData {
  transaction: {
    id: string;
    licensePlate: string;
    status: string;
    fedexTracking: string | null;
    finalizedAt: string | null;
    createdAt: string;
  };
  pharmacy: {
    id: string;
    name: string;
    npiNumber: string | null;
    deaNumber: string | null;
    phone: string | null;
    email: string | null;
  };
  summary: {
    totalCiiItems: number;
    totalValue: number;
  };
  items: DeaFormItem[];
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
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
}

function productName(item: { proprietaryName: string | null; genericName: string | null }): string {
  return item.proprietaryName || item.genericName || 'Unknown Product';
}

function escapeHtml(s: string | null | undefined): string {
  if (s == null || s === '') return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Helper to collect PDF doc into a Buffer via a Promise
 */
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
// Manifest PDF Generator
// ============================================================

export async function generateManifestPdf(data: ManifestData): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
    bufferPages: true,
  });

  const pageWidth = 612 - 80; // letter width minus margins

  // ── Header ──
  doc.fontSize(18).font('Helvetica-Bold').text('RETURN MANIFEST', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(9).font('Helvetica').fillColor('#666666')
    .text('FCR Pharmacy Returns', { align: 'center' });
  doc.moveDown(0.5);

  // Divider
  doc.strokeColor('#333333').lineWidth(1)
    .moveTo(40, doc.y).lineTo(572, doc.y).stroke();
  doc.moveDown(0.5);

  // ── Transaction & Pharmacy Info ──
  doc.fillColor('#000000');
  const infoY = doc.y;

  // Left column: Pharmacy
  doc.fontSize(10).font('Helvetica-Bold').text('Pharmacy:', 40, infoY);
  doc.fontSize(10).font('Helvetica').text(data.pharmacy.name, 120, infoY);

  let yPos = infoY + 14;
  if (data.pharmacy.deaNumber) {
    doc.font('Helvetica-Bold').text('DEA:', 40, yPos);
    doc.font('Helvetica').text(data.pharmacy.deaNumber, 120, yPos);
    yPos += 14;
  }
  if (data.pharmacy.npiNumber) {
    doc.font('Helvetica-Bold').text('NPI:', 40, yPos);
    doc.font('Helvetica').text(data.pharmacy.npiNumber, 120, yPos);
    yPos += 14;
  }
  if (data.pharmacy.phone) {
    doc.font('Helvetica-Bold').text('Phone:', 40, yPos);
    doc.font('Helvetica').text(data.pharmacy.phone, 120, yPos);
    yPos += 14;
  }

  // Right column: Return details
  const rightX = 320;
  let rY = infoY;
  doc.font('Helvetica-Bold').text('License Plate:', rightX, rY);
  doc.font('Helvetica').text(data.transaction.licensePlate, rightX + 90, rY);
  rY += 14;

  doc.font('Helvetica-Bold').text('FedEx Tracking:', rightX, rY);
  doc.font('Helvetica').text(data.transaction.fedexTracking || '—', rightX + 90, rY);
  rY += 14;

  doc.font('Helvetica-Bold').text('Status:', rightX, rY);
  doc.font('Helvetica').text(data.transaction.status.toUpperCase(), rightX + 90, rY);
  rY += 14;

  if (data.transaction.boxCount) {
    doc.font('Helvetica-Bold').text('Box Count:', rightX, rY);
    doc.font('Helvetica').text(String(data.transaction.boxCount), rightX + 90, rY);
    rY += 14;
  }

  doc.font('Helvetica-Bold').text('Date:', rightX, rY);
  doc.font('Helvetica').text(fmtDate(data.transaction.finalizedAt || data.transaction.createdAt), rightX + 90, rY);
  rY += 14;

  if (data.processor.name) {
    doc.font('Helvetica-Bold').text('Processor:', rightX, rY);
    doc.font('Helvetica').text(data.processor.name, rightX + 90, rY);
    rY += 14;
  }

  doc.y = Math.max(yPos, rY) + 10;

  // Divider
  doc.strokeColor('#cccccc').lineWidth(0.5)
    .moveTo(40, doc.y).lineTo(572, doc.y).stroke();
  doc.moveDown(0.5);

  // ── Summary Box ──
  const sumY = doc.y;
  doc.rect(40, sumY, pageWidth, 40).fillAndStroke('#f0f4f8', '#cccccc');
  doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');

  const colW = pageWidth / 4;
  doc.text(`Total Items: ${data.summary.totalItems}`, 50, sumY + 8, { width: colW });
  doc.text(`Returnable: ${data.summary.returnableCount}`, 50 + colW, sumY + 8, { width: colW });
  doc.text(`Non-Returnable: ${data.summary.nonReturnableCount}`, 50 + colW * 2, sumY + 8, { width: colW });
  doc.text(`CII Items: ${data.summary.hasCiiItems ? 'Yes' : 'No'}`, 50 + colW * 3, sumY + 8, { width: colW });

  doc.text(`Returnable Value: ${fmt$(data.summary.totalReturnableValue)}`, 50, sumY + 22, { width: colW * 2 });
  doc.text(`Non-Ret. Value: ${fmt$(data.summary.totalNonReturnableValue)}`, 50 + colW * 2, sumY + 22, { width: colW });
  doc.text(`Total: ${fmt$(data.summary.totalValue)}`, 50 + colW * 3, sumY + 22, { width: colW });

  doc.y = sumY + 50;

  // ── Returnable Items Table ──
  if (data.returnableItems.length > 0) {
    drawItemsTable(doc, 'RETURNABLE ITEMS', data.returnableItems, pageWidth, true);
  }

  // ── Non-Returnable Items Table ──
  if (data.nonReturnableItems.length > 0) {
    if (doc.y > 650) doc.addPage();
    drawItemsTable(doc, 'NON-RETURNABLE ITEMS', data.nonReturnableItems, pageWidth, false);
  }

  // ── Notes ──
  if (data.transaction.notes) {
    if (doc.y > 680) doc.addPage();
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica-Bold').text('Notes:');
    doc.font('Helvetica').text(data.transaction.notes);
  }

  // ── Footer on each page ──
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(7).font('Helvetica').fillColor('#999999');
    doc.text(
      `Manifest generated ${new Date().toLocaleString('en-US')} — Page ${i + 1} of ${pages.count}`,
      40, 740, { align: 'center', width: pageWidth }
    );
  }

  return pdfToBuffer(doc);
}

// ============================================================
// Manifest HTML (browser print — same data as PDF manifest)
// ============================================================

function manifestItemsTableHtml(
  title: string,
  items: ManifestItem[],
  showDestination: boolean
): string {
  if (items.length === 0) return '';
  const th = showDestination
    ? '<th>NDC</th><th>Product</th><th>Lot</th><th>Exp</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Value</th><th>Dest</th>'
    : '<th>NDC</th><th>Product</th><th>Lot</th><th>Exp</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Value</th><th>Reason</th>';
  const rows = items
    .map((item, idx) => {
      const namePlain = productName(item) + (item.isPartial ? ` (${item.partialPercentage || 0}%)` : '');
      const destOrReason = showDestination
        ? (item.destination || '—').toUpperCase()
        : (item.nonReturnableReason || '—').toUpperCase();
      const bg = idx % 2 === 0 ? ' class="alt"' : '';
      return `<tr${bg}>
        <td class="mono">${escapeHtml(item.ndc || '—')}</td>
        <td>${escapeHtml(namePlain)}</td>
        <td>${escapeHtml(item.lotNumber || '—')}</td>
        <td>${escapeHtml(fmtDate(item.expirationDate))}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${escapeHtml(fmt$(item.standardPrice))}</td>
        <td class="num">${escapeHtml(fmt$(item.estimatedValue))}</td>
        <td>${escapeHtml(destOrReason)}</td>
      </tr>`;
    })
    .join('');
  const total = items.reduce((sum, i) => sum + (i.estimatedValue || 0), 0);
  return `
    <h2 class="section-title">${escapeHtml(title)}</h2>
    <table class="items">
      <thead><tr>${th}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="subtotal"><strong>${escapeHtml(title)} total:</strong> ${items.length} items — ${escapeHtml(fmt$(total))}</p>
  `;
}

export function generateManifestHtml(data: ManifestData): string {
  const t = data.transaction;
  const p = data.pharmacy;
  const s = data.summary;
  const proc = data.processor;
  const dateStr = fmtDate(t.finalizedAt || t.createdAt);
  const returnableBlock = manifestItemsTableHtml('RETURNABLE ITEMS', data.returnableItems, true);
  const nonRetBlock = manifestItemsTableHtml('NON-RETURNABLE ITEMS', data.nonReturnableItems, false);
  const notesBlock = t.notes
    ? `<div class="notes"><strong>Notes:</strong> ${escapeHtml(t.notes)}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Return manifest — ${escapeHtml(t.licensePlate)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #111; margin: 0; padding: 24px; background: #fff; }
  h1 { font-size: 18pt; text-align: center; margin: 0 0 4px; }
  .subtitle { text-align: center; color: #666; font-size: 9pt; margin: 0 0 16px; }
  .rule { border: 0; border-top: 1px solid #333; margin: 12px 0; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 12px; }
  .grid dt { font-weight: bold; color: #333; }
  .grid dd { margin: 0; }
  .summary { background: #f0f4f8; border: 1px solid #ccc; padding: 10px 12px; margin: 12px 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; font-size: 9pt; }
  .summary .wide { grid-column: span 2; }
  h2.section-title { font-size: 11pt; margin: 16px 0 8px; }
  table.items { width: 100%; border-collapse: collapse; font-size: 7pt; margin-bottom: 8px; }
  table.items th { background: #e2e8f0; text-align: left; padding: 4px 3px; border: 1px solid #ccc; font-weight: bold; }
  table.items td { padding: 3px; border: 1px solid #ddd; vertical-align: top; }
  table.items tr.alt td { background: #f8fafc; }
  table.items .num { text-align: right; white-space: nowrap; }
  table.items .mono { font-family: 'Courier New', monospace; }
  .subtotal { text-align: right; font-size: 8pt; margin: 0 0 12px; }
  .notes { margin-top: 16px; font-size: 9pt; }
  .footer { margin-top: 24px; font-size: 7pt; color: #999; text-align: center; }
  @media print {
    body { padding: 12px; }
    table.items { page-break-inside: auto; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    h2.section-title { page-break-after: avoid; }
  }
</style>
</head>
<body>
  <h1>RETURN MANIFEST</h1>
  <p class="subtitle">FCR Pharmacy Returns</p>
  <hr class="rule" />
  <div class="grid">
    <dl style="margin:0;">
      <dt>Pharmacy</dt><dd>${escapeHtml(p.name)}</dd>
      ${p.deaNumber ? `<dt>DEA</dt><dd>${escapeHtml(p.deaNumber)}</dd>` : ''}
      ${p.npiNumber ? `<dt>NPI</dt><dd>${escapeHtml(p.npiNumber)}</dd>` : ''}
      ${p.phone ? `<dt>Phone</dt><dd>${escapeHtml(p.phone)}</dd>` : ''}
    </dl>
    <dl style="margin:0;">
      <dt>License Plate</dt><dd>${escapeHtml(t.licensePlate)}</dd>
      <dt>FedEx Tracking</dt><dd>${escapeHtml(t.fedexTracking || '—')}</dd>
      <dt>Status</dt><dd>${escapeHtml(String(t.status).toUpperCase())}</dd>
      ${t.boxCount != null ? `<dt>Box Count</dt><dd>${escapeHtml(String(t.boxCount))}</dd>` : ''}
      <dt>Date</dt><dd>${escapeHtml(dateStr)}</dd>
      ${proc.name ? `<dt>Processor</dt><dd>${escapeHtml(proc.name)}</dd>` : ''}
    </dl>
  </div>
  <div class="summary">
    <div>Total Items: <strong>${s.totalItems}</strong></div>
    <div>Returnable: <strong>${s.returnableCount}</strong></div>
    <div>Non-Returnable: <strong>${s.nonReturnableCount}</strong></div>
    <div>CII Items: <strong>${s.hasCiiItems ? 'Yes' : 'No'}</strong></div>
    <div class="wide">Returnable Value: <strong>${escapeHtml(fmt$(s.totalReturnableValue))}</strong></div>
    <div class="wide">Non-Ret. Value: <strong>${escapeHtml(fmt$(s.totalNonReturnableValue))}</strong> &nbsp; Total: <strong>${escapeHtml(fmt$(s.totalValue))}</strong></div>
  </div>
  ${returnableBlock}
  ${nonRetBlock}
  ${notesBlock}
  <p class="footer">Manifest generated ${escapeHtml(new Date().toLocaleString('en-US'))}</p>
</body>
</html>`;
}


// ============================================================
// Items Table Drawing Helper
// ============================================================

function drawItemsTable(
  doc: PDFKit.PDFDocument,
  title: string,
  items: ManifestItem[],
  pageWidth: number,
  showDestination: boolean
): void {
  doc.moveDown(0.3);
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000').text(title);
  doc.moveDown(0.3);

  // Column widths
  const cols = showDestination
    ? { ndc: 75, name: 145, lot: 55, exp: 55, qty: 30, price: 55, value: 55, dest: 62 }
    : { ndc: 80, name: 165, lot: 60, exp: 60, qty: 35, price: 60, value: 60, reason: 62 };

  const headerY = doc.y;

  // Header bg
  doc.rect(40, headerY - 2, pageWidth, 14).fill('#e2e8f0');

  // Header text
  doc.fillColor('#000000').fontSize(7).font('Helvetica-Bold');
  let x = 42;
  doc.text('NDC', x, headerY, { width: cols.ndc }); x += cols.ndc;
  doc.text('PRODUCT', x, headerY, { width: (cols as any).name }); x += (cols as any).name;
  doc.text('LOT', x, headerY, { width: cols.lot }); x += cols.lot;
  doc.text('EXP', x, headerY, { width: cols.exp }); x += cols.exp;
  doc.text('QTY', x, headerY, { width: cols.qty }); x += cols.qty;
  doc.text('PRICE', x, headerY, { width: cols.price }); x += cols.price;
  doc.text('VALUE', x, headerY, { width: cols.value }); x += cols.value;
  if (showDestination) {
    doc.text('DEST', x, headerY, { width: (cols as any).dest });
  } else {
    doc.text('REASON', x, headerY, { width: (cols as any).reason });
  }

  doc.y = headerY + 16;

  // Rows
  doc.font('Helvetica').fontSize(7);
  items.forEach((item, idx) => {
    if (doc.y > 700) {
      doc.addPage();
      doc.y = 40;
    }

    const rowY = doc.y;

    // Alternate row bg
    if (idx % 2 === 0) {
      doc.rect(40, rowY - 1, pageWidth, 12).fill('#f8fafc');
    }

    doc.fillColor('#000000');
    let cx = 42;
    doc.text(item.ndc || '—', cx, rowY, { width: cols.ndc }); cx += cols.ndc;
    const name = productName(item) + (item.isPartial ? ` (${item.partialPercentage || 0}%)` : '');
    doc.text(name.substring(0, 35), cx, rowY, { width: (cols as any).name }); cx += (cols as any).name;
    doc.text(item.lotNumber || '—', cx, rowY, { width: cols.lot }); cx += cols.lot;
    doc.text(fmtDate(item.expirationDate), cx, rowY, { width: cols.exp }); cx += cols.exp;
    doc.text(String(item.quantity), cx, rowY, { width: cols.qty }); cx += cols.qty;
    doc.text(fmt$(item.standardPrice), cx, rowY, { width: cols.price }); cx += cols.price;
    doc.text(fmt$(item.estimatedValue), cx, rowY, { width: cols.value }); cx += cols.value;
    if (showDestination) {
      doc.text((item.destination || '—').toUpperCase(), cx, rowY, { width: (cols as any).dest });
    } else {
      doc.text((item.nonReturnableReason || '—').toUpperCase(), cx, rowY, { width: (cols as any).reason });
    }

    doc.y = rowY + 13;
  });

  // Table bottom line
  doc.strokeColor('#cccccc').lineWidth(0.5)
    .moveTo(40, doc.y).lineTo(572, doc.y).stroke();
  doc.moveDown(0.3);

  // Subtotal
  const totalValue = items.reduce((sum, i) => sum + (i.estimatedValue || 0), 0);
  doc.font('Helvetica-Bold').fontSize(8)
    .text(`${title} TOTAL: ${items.length} items — ${fmt$(totalValue)}`, { align: 'right' });
  doc.moveDown(0.5);
}


// ============================================================
// DEA Form 222 PDF Generator
// ============================================================

export async function generateDeaForm222Pdf(data: DeaFormData): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
    bufferPages: true,
  });

  const pageWidth = 612 - 80;

  // ── Header ──
  doc.fontSize(16).font('Helvetica-Bold').text('DEA FORM 222', { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(10).font('Helvetica').text('ORDER FORM FOR SCHEDULE II CONTROLLED SUBSTANCES', { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(8).fillColor('#cc0000').font('Helvetica-Bold')
    .text('CONTROLLED SUBSTANCE — HANDLE IN ACCORDANCE WITH APPLICABLE FEDERAL AND STATE LAWS', { align: 'center' });
  doc.moveDown(0.5);

  // Divider
  doc.strokeColor('#333333').lineWidth(1.5)
    .moveTo(40, doc.y).lineTo(572, doc.y).stroke();
  doc.moveDown(0.5);

  // ── Pharmacy / Registrant Info ──
  doc.fillColor('#000000');
  doc.fontSize(10).font('Helvetica-Bold').text('REGISTRANT INFORMATION');
  doc.moveDown(0.3);

  const labelWidth = 120;
  doc.fontSize(9).font('Helvetica');

  const fields: [string, string][] = [
    ['Pharmacy Name:', data.pharmacy.name],
    ['DEA Number:', data.pharmacy.deaNumber || 'NOT ON FILE'],
    ['NPI Number:', data.pharmacy.npiNumber || '—'],
    ['Phone:', data.pharmacy.phone || '—'],
    ['Email:', data.pharmacy.email || '—'],
  ];

  fields.forEach(([label, value]) => {
    doc.font('Helvetica-Bold').text(label, 40, doc.y, { continued: true, width: labelWidth });
    doc.font('Helvetica').text(`  ${value}`);
  });

  doc.moveDown(0.3);

  // ── Return Info ──
  doc.font('Helvetica-Bold').text('License Plate:', 40, doc.y, { continued: true, width: labelWidth });
  doc.font('Helvetica').text(`  ${data.transaction.licensePlate}`);
  doc.font('Helvetica-Bold').text('FedEx Tracking:', 40, doc.y, { continued: true, width: labelWidth });
  doc.font('Helvetica').text(`  ${data.transaction.fedexTracking || '—'}`);
  doc.font('Helvetica-Bold').text('Date:', 40, doc.y, { continued: true, width: labelWidth });
  doc.font('Helvetica').text(`  ${fmtDate(data.transaction.finalizedAt || data.transaction.createdAt)}`);

  doc.moveDown(0.5);

  // Divider
  doc.strokeColor('#cccccc').lineWidth(0.5)
    .moveTo(40, doc.y).lineTo(572, doc.y).stroke();
  doc.moveDown(0.5);

  // ── Warning ──
  if (!data.pharmacy.deaNumber) {
    doc.fontSize(9).fillColor('#cc0000').font('Helvetica-Bold')
      .text('⚠ WARNING: No DEA number on file for this pharmacy. DEA Form 222 requires a valid DEA registration.', 40, doc.y, { width: pageWidth });
    doc.moveDown(0.5);
    doc.fillColor('#000000');
  }

  // ── Schedule II Items Table ──
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000')
    .text(`SCHEDULE II CONTROLLED SUBSTANCES (${data.summary.totalCiiItems} Items)`);
  doc.moveDown(0.3);

  // Table header
  const headerY = doc.y;
  doc.rect(40, headerY - 2, pageWidth, 14).fill('#fde8e8');

  const colDef = { line: 25, ndc: 80, name: 130, strength: 60, lot: 55, exp: 55, qty: 30, price: 50, value: 50 };

  doc.fillColor('#000000').fontSize(7).font('Helvetica-Bold');
  let hx = 42;
  doc.text('#', hx, headerY, { width: colDef.line }); hx += colDef.line;
  doc.text('NDC', hx, headerY, { width: colDef.ndc }); hx += colDef.ndc;
  doc.text('PRODUCT NAME', hx, headerY, { width: colDef.name }); hx += colDef.name;
  doc.text('STRENGTH', hx, headerY, { width: colDef.strength }); hx += colDef.strength;
  doc.text('LOT', hx, headerY, { width: colDef.lot }); hx += colDef.lot;
  doc.text('EXP', hx, headerY, { width: colDef.exp }); hx += colDef.exp;
  doc.text('QTY', hx, headerY, { width: colDef.qty }); hx += colDef.qty;
  doc.text('PRICE', hx, headerY, { width: colDef.price }); hx += colDef.price;
  doc.text('VALUE', hx, headerY, { width: colDef.value });

  doc.y = headerY + 16;

  // Item rows
  doc.font('Helvetica').fontSize(7);
  data.items.forEach((item, idx) => {
    if (doc.y > 680) {
      doc.addPage();
      doc.y = 40;
    }

    const rowY = doc.y;
    if (idx % 2 === 0) {
      doc.rect(40, rowY - 1, pageWidth, 12).fill('#fff5f5');
    }

    doc.fillColor('#000000');
    let rx = 42;
    doc.text(String(idx + 1), rx, rowY, { width: colDef.line }); rx += colDef.line;
    doc.text(item.ndc || '—', rx, rowY, { width: colDef.ndc }); rx += colDef.ndc;
    doc.text(productName(item).substring(0, 30), rx, rowY, { width: colDef.name }); rx += colDef.name;
    doc.text(item.strength || '—', rx, rowY, { width: colDef.strength }); rx += colDef.strength;
    doc.text(item.lotNumber || '—', rx, rowY, { width: colDef.lot }); rx += colDef.lot;
    doc.text(fmtDate(item.expirationDate), rx, rowY, { width: colDef.exp }); rx += colDef.exp;
    doc.text(String(item.quantity), rx, rowY, { width: colDef.qty }); rx += colDef.qty;
    doc.text(fmt$(item.standardPrice), rx, rowY, { width: colDef.price }); rx += colDef.price;
    doc.text(fmt$(item.estimatedValue), rx, rowY, { width: colDef.value });

    doc.y = rowY + 13;
  });

  // Bottom line
  doc.strokeColor('#cc0000').lineWidth(1)
    .moveTo(40, doc.y).lineTo(572, doc.y).stroke();
  doc.moveDown(0.3);

  // Total
  doc.font('Helvetica-Bold').fontSize(9)
    .text(`TOTAL: ${data.summary.totalCiiItems} Schedule II Items — ${fmt$(data.summary.totalValue)}`, { align: 'right' });

  doc.moveDown(1);

  // ── Signature Section ──
  doc.strokeColor('#cccccc').lineWidth(0.5)
    .moveTo(40, doc.y).lineTo(572, doc.y).stroke();
  doc.moveDown(0.5);

  doc.fontSize(9).font('Helvetica-Bold').text('AUTHORIZED SIGNATURES');
  doc.moveDown(0.8);

  // Signature lines
  const sigWidth = 200;
  doc.strokeColor('#000000').lineWidth(0.5);

  doc.moveTo(40, doc.y).lineTo(40 + sigWidth, doc.y).stroke();
  doc.moveTo(310, doc.y).lineTo(310 + sigWidth, doc.y).stroke();
  doc.moveDown(0.2);

  doc.fontSize(7).font('Helvetica');
  doc.text('Registrant Signature', 40, doc.y, { width: sigWidth });
  doc.text('Date', 310, doc.y - doc.currentLineHeight(), { width: sigWidth });

  doc.moveDown(1.5);
  doc.moveTo(40, doc.y).lineTo(40 + sigWidth, doc.y).stroke();
  doc.moveTo(310, doc.y).lineTo(310 + sigWidth, doc.y).stroke();
  doc.moveDown(0.2);
  doc.text('Receiving Pharmacist / Reverse Distributor', 40, doc.y, { width: sigWidth });
  doc.text('Date', 310, doc.y - doc.currentLineHeight(), { width: sigWidth });

  // ── Footer ──
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(7).font('Helvetica').fillColor('#999999');
    doc.text(
      `DEA Form 222 — Generated ${new Date().toLocaleString('en-US')} — Page ${i + 1} of ${pages.count}`,
      40, 740, { align: 'center', width: pageWidth }
    );
  }

  return pdfToBuffer(doc);
}
