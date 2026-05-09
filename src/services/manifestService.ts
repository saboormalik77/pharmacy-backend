/**
 * Manifest & DEA Form 222 PDF Service
 *
 * Generates PDFs using pdfkit with data fetched by RPC functions.
 * All business logic (data gathering, totals, filters) lives in
 * the database RPCs — this service only handles PDF rendering.
 */

import PDFDocument from 'pdfkit';
import { formatNonReturnableReason } from '../constants/nonReturnableReasons';

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
  fullPackageSize?: number | null;
  fullPackageQtyReturned?: number | null;
  returnStatus?: string | null;
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
  allItems?: ManifestItem[]; // NEW: Optional field for all items regardless of status
}

interface DeaFormItem {
  ndc: string | null;
  ndc10: string | null;
  proprietaryName: string | null;
  genericName: string | null;
  manufacturer: string | null;
  lotNumber: string | null;
  expirationDate: string | null;
  quantity: number;
  fullPackageSize: number | null;
  fullPackageQtyReturned: number | null;
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
    deaExpiration: string | null;
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

  // FedEx Tracking removed per user request

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
  doc.rect(40, sumY, pageWidth, 20).fillAndStroke('#f0f4f8', '#cccccc');
  doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');

  const colW = pageWidth / 2; // Adjusted for 2 columns instead of 4
  doc.text(`Total Items: ${data.summary.totalItems}`, 50, sumY + 8, { width: colW });
  // doc.text(`Returnable: ${data.summary.returnableCount}`, 50 + colW, sumY + 8, { width: colW });
  // doc.text(`Non-Returnable: ${data.summary.nonReturnableCount}`, 50 + colW * 2, sumY + 8, { width: colW });
  doc.text(`CII Items: ${data.summary.hasCiiItems ? 'Yes' : 'No'}`, 50 + colW, sumY + 8, { width: colW });

  // doc.text(`Returnable Value: ${fmt$(data.summary.totalReturnableValue)}`, 50, sumY + 22, { width: colW * 2 });
  // doc.text(`Non-Ret. Value: ${fmt$(data.summary.totalNonReturnableValue)}`, 50 + colW * 2, sumY + 22, { width: colW });
  // doc.text(`Total: ${fmt$(data.summary.totalValue)}`, 50 + colW * 3, sumY + 22, { width: colW });

  doc.y = sumY + 30;

  // ── Item Tables ──
  // Use allItems (direct DB fetch with pkg size) when available; fall back to RPC arrays.
  const allItemsSrcPdf: ManifestItem[] = (data as any).allItems && (data as any).allItems.length > 0
    ? (data as any).allItems
    : [...data.returnableItems, ...data.nonReturnableItems];

  if (allItemsSrcPdf.length === 0) {
    doc.fontSize(10).font('Helvetica').text('No items found for this return transaction.', { align: 'center' });
  } else {
    const retItemsPdf = allItemsSrcPdf.filter((i: ManifestItem) => (i as any).returnStatus === 'returnable');
    const nonRetItemsPdf = allItemsSrcPdf.filter((i: ManifestItem) => (i as any).returnStatus === 'non_returnable');
    const otherItemsPdf = allItemsSrcPdf.filter((i: ManifestItem) =>
      (i as any).returnStatus !== 'returnable' && (i as any).returnStatus !== 'non_returnable'
    );
    const returnablePlusPendingPdf = [...retItemsPdf, ...otherItemsPdf];

    if (returnablePlusPendingPdf.length > 0) drawItemsTable(doc, 'RETURNABLE ITEMS', returnablePlusPendingPdf, pageWidth, false);
    if (nonRetItemsPdf.length > 0) drawItemsTable(doc, 'NON-RETURNABLE ITEMS', nonRetItemsPdf, pageWidth, true);
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
  showReason: boolean
): string {
  if (items.length === 0) return '';

  const th = `
    <th>NDC</th>
    <th>Product</th>
    <th>Lot</th>
    <th>Exp</th>
    <th class="num">Pkg Size</th>
    <th class="num">Full Qty</th>
    <th class="num">Partial Qty</th>
    ${showReason ? '<th>Reason</th>' : ''}
  `;

  const rows = items
    .map((item, idx) => {
      const namePlain = productName(item);
      const reason = formatNonReturnableReason(item.nonReturnableReason).toUpperCase();
      const bg = idx % 2 === 0 ? ' class="alt"' : '';

      const pkgSize = item.fullPackageSize != null ? String(item.fullPackageSize) : '—';

      // Full Qty: units returned when NOT partial
      const fullQty = item.isPartial
        ? '—'
        : String(item.fullPackageQtyReturned ?? item.quantity ?? '—');

      // Partial Qty: show units + % when IS partial
      const partialQty = item.isPartial
        ? `${item.quantity ?? ''}${item.partialPercentage != null ? ` (${item.partialPercentage}%)` : ''}`
        : '—';

      const reasonCell = showReason ? `<td>${escapeHtml(reason || '—')}</td>` : '';

      return `<tr${bg}>
        <td class="mono">${escapeHtml(item.ndc || '—')}</td>
        <td>${escapeHtml(namePlain)}</td>
        <td>${escapeHtml(item.lotNumber || '—')}</td>
        <td>${escapeHtml(fmtDate(item.expirationDate))}</td>
        <td class="num">${escapeHtml(pkgSize)}</td>
        <td class="num">${escapeHtml(fullQty)}</td>
        <td class="num">${escapeHtml(partialQty)}</td>
        ${reasonCell}
      </tr>`;
    })
    .join('');

  return `
    <h2 class="section-title">${escapeHtml(title)}</h2>
    <table class="items">
      <thead><tr>${th}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="subtotal"><strong>${escapeHtml(title)} total:</strong> ${items.length} item${items.length !== 1 ? 's' : ''}</p>
  `;
}

export function generateManifestHtml(data: ManifestData): string {
  const t = data.transaction;
  const p = data.pharmacy;
  const s = data.summary;
  const proc = data.processor;
  const dateStr = fmtDate(t.finalizedAt || t.createdAt);
  
  // Build item blocks.
  // Priority: use allItems (direct DB fetch — includes TBD and pkg size fields) when available.
  // Fall back to combining returnableItems + nonReturnableItems from the RPC.
  const allItemsSrc: ManifestItem[] = (data as any).allItems && (data as any).allItems.length > 0
    ? (data as any).allItems
    : [...data.returnableItems, ...data.nonReturnableItems];

  let returnableBlock = '';
  let nonRetBlock = '';

  if (allItemsSrc.length > 0) {
    // Separate by status for display so labels are correct
    const retItems = allItemsSrc.filter((i: ManifestItem) => (i as any).returnStatus === 'returnable');
    const nonRetItems = allItemsSrc.filter((i: ManifestItem) => (i as any).returnStatus === 'non_returnable');
    const otherItems = allItemsSrc.filter((i: ManifestItem) =>
      (i as any).returnStatus !== 'returnable' && (i as any).returnStatus !== 'non_returnable'
    );
    const returnablePlusPending = [...retItems, ...otherItems];

    if (returnablePlusPending.length > 0) {
      returnableBlock += manifestItemsTableHtml('RETURNABLE ITEMS', returnablePlusPending, false);
    }
    if (nonRetItems.length > 0) {
      nonRetBlock += manifestItemsTableHtml('NON-RETURNABLE ITEMS', nonRetItems, true);
    }
  } else {
    returnableBlock = `
      <h2 class="section-title">NO ITEMS FOUND</h2>
      <p>This return transaction appears to have no items or the items have not been classified yet.</p>
    `;
  }
  
  const notesBlock = t.notes
    ? `<div class="notes"><strong>Notes:</strong> ${escapeHtml(t.notes)}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(p.name)} Itemized Return</title>
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
      <dt>Status</dt><dd>${escapeHtml(String(t.status).toUpperCase())}</dd>
      ${t.boxCount != null ? `<dt>Box Count</dt><dd>${escapeHtml(String(t.boxCount))}</dd>` : ''}
      <dt>Date</dt><dd>${escapeHtml(dateStr)}</dd>
      ${proc.name ? `<dt>Processor</dt><dd>${escapeHtml(proc.name)}</dd>` : ''}
    </dl>
  </div>
  <div class="summary">
    <div>Total Items: <strong>${s.totalItems}</strong></div>
    <!-- <div>Returnable: <strong>${s.returnableCount}</strong></div>
    <div>Non-Returnable: <strong>${s.nonReturnableCount}</strong></div> -->
    <div>CII Items: <strong>${s.hasCiiItems ? 'Yes' : 'No'}</strong></div>
    <!-- <div class="wide">Returnable Value: <strong>${escapeHtml(fmt$(s.totalReturnableValue))}</strong></div>
    <div class="wide">Non-Ret. Value: <strong>${escapeHtml(fmt$(s.totalNonReturnableValue))}</strong> &nbsp; Total: <strong>${escapeHtml(fmt$(s.totalValue))}</strong></div> -->
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
  showReason: boolean
): void {
  doc.moveDown(0.3);
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000').text(title);
  doc.moveDown(0.3);

  // Column widths — NDC | Product | Lot | Exp | Pkg Size | Full Qty | Partial Qty [| Reason]
  const cols = showReason
    ? { ndc: 68, name: 118, lot: 48, exp: 44, pkgSize: 36, fullQty: 36, partialQty: 52, reason: 50 }
    : { ndc: 75, name: 145, lot: 55, exp: 50, pkgSize: 42, fullQty: 42, partialQty: 55 };

  const headerY = doc.y;
  doc.rect(40, headerY - 2, pageWidth, 14).fill('#e2e8f0');

  doc.fillColor('#000000').fontSize(7).font('Helvetica-Bold');
  let x = 42;
  doc.text('NDC', x, headerY, { width: cols.ndc }); x += cols.ndc;
  doc.text('PRODUCT', x, headerY, { width: cols.name }); x += cols.name;
  doc.text('LOT', x, headerY, { width: cols.lot }); x += cols.lot;
  doc.text('EXP', x, headerY, { width: cols.exp }); x += cols.exp;
  doc.text('PKG SIZE', x, headerY, { width: cols.pkgSize }); x += cols.pkgSize;
  doc.text('FULL QTY', x, headerY, { width: cols.fullQty }); x += cols.fullQty;
  doc.text('PARTIAL QTY', x, headerY, { width: cols.partialQty }); x += cols.partialQty;
  if (showReason) {
    doc.text('REASON', x, headerY, { width: cols.reason });
  }

  doc.y = headerY + 16;

  doc.font('Helvetica').fontSize(7);
  items.forEach((item, idx) => {
    if (doc.y > 700) {
      doc.addPage();
      doc.y = 40;
    }

    const rowY = doc.y;
    if (idx % 2 === 0) {
      doc.rect(40, rowY - 1, pageWidth, 12).fill('#f8fafc');
    }

    // Compute Pkg Size / Full Qty / Partial Qty
    const pkgSize = item.fullPackageSize != null ? String(item.fullPackageSize) : '—';
    const fullQty = item.isPartial
      ? '—'
      : String(item.fullPackageQtyReturned ?? item.quantity ?? '—');
    const partialQty = item.isPartial
      ? `${item.quantity ?? ''}${item.partialPercentage != null ? ` (${item.partialPercentage}%)` : ''}`
      : '—';

    doc.fillColor('#000000');
    let cx = 42;
    doc.text(item.ndc || '—', cx, rowY, { width: cols.ndc }); cx += cols.ndc;
    doc.text(productName(item).substring(0, 28), cx, rowY, { width: cols.name }); cx += cols.name;
    doc.text(item.lotNumber || '—', cx, rowY, { width: cols.lot }); cx += cols.lot;
    doc.text(fmtDate(item.expirationDate), cx, rowY, { width: cols.exp }); cx += cols.exp;
    doc.text(pkgSize, cx, rowY, { width: cols.pkgSize }); cx += cols.pkgSize;
    doc.text(fullQty, cx, rowY, { width: cols.fullQty }); cx += cols.fullQty;
    doc.text(partialQty, cx, rowY, { width: cols.partialQty }); cx += cols.partialQty;
    if (showReason) {
      const reasonLabel = formatNonReturnableReason(item.nonReturnableReason);
      doc.text(reasonLabel.toUpperCase(), cx, rowY, { width: cols.reason });
    }

    doc.y = rowY + 13;
  });

  doc.strokeColor('#cccccc').lineWidth(0.5)
    .moveTo(40, doc.y).lineTo(572, doc.y).stroke();
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
    ['DEA Expiration:', data.pharmacy.deaExpiration ? fmtDate(data.pharmacy.deaExpiration) : 'NOT ON FILE'],
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
  // FedEx Tracking removed per user request
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
  
  if (!data.pharmacy.deaExpiration) {
    doc.fontSize(9).fillColor('#cc0000').font('Helvetica-Bold')
      .text('⚠ WARNING: No DEA expiration date on file for this pharmacy. Please verify DEA registration status.', 40, doc.y, { width: pageWidth });
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

  const colDef = { line: 20, ndc: 70, name: 100, strength: 50, lot: 45, exp: 45, pkgSize: 45, fullQty: 40, partialQty: 50 };

  doc.fillColor('#000000').fontSize(7).font('Helvetica-Bold');
  let hx = 42;
  doc.text('#', hx, headerY, { width: colDef.line }); hx += colDef.line;
  doc.text('NDC', hx, headerY, { width: colDef.ndc }); hx += colDef.ndc;
  doc.text('PRODUCT NAME', hx, headerY, { width: colDef.name }); hx += colDef.name;
  doc.text('STRENGTH', hx, headerY, { width: colDef.strength }); hx += colDef.strength;
  doc.text('LOT', hx, headerY, { width: colDef.lot }); hx += colDef.lot;
  doc.text('EXP', hx, headerY, { width: colDef.exp }); hx += colDef.exp;
  doc.text('PKG SIZE', hx, headerY, { width: colDef.pkgSize }); hx += colDef.pkgSize;
  doc.text('FULL QTY', hx, headerY, { width: colDef.fullQty }); hx += colDef.fullQty;
  doc.text('PARTIAL QTY', hx, headerY, { width: colDef.partialQty });

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
    doc.text(productName(item).substring(0, 20), rx, rowY, { width: colDef.name }); rx += colDef.name;
    doc.text(item.strength || '—', rx, rowY, { width: colDef.strength }); rx += colDef.strength;
    doc.text(item.lotNumber || '—', rx, rowY, { width: colDef.lot }); rx += colDef.lot;
    doc.text(fmtDate(item.expirationDate), rx, rowY, { width: colDef.exp }); rx += colDef.exp;
    
    // Package Size
    doc.text(item.fullPackageSize ? `${item.fullPackageSize}` : '—', rx, rowY, { width: colDef.pkgSize }); rx += colDef.pkgSize;
    
    // Full Qty (show only if not partial)
    const fullQty = item.isPartial ? '—' : (item.fullPackageQtyReturned ?? item.quantity ?? '—');
    doc.text(String(fullQty), rx, rowY, { width: colDef.fullQty }); rx += colDef.fullQty;
    
    // Partial Qty (show only if partial)
    const partialQty = item.isPartial 
      ? (item.partialPercentage ? `${item.quantity || 0} (${item.partialPercentage}%)` : (item.quantity ?? '—'))
      : '—';
    doc.text(String(partialQty), rx, rowY, { width: colDef.partialQty });

    doc.y = rowY + 13;
  });

  // Bottom line
  doc.strokeColor('#cc0000').lineWidth(1)
    .moveTo(40, doc.y).lineTo(572, doc.y).stroke();
  doc.moveDown(0.3);

  // Total (removed value since we don't show prices anymore)
  doc.font('Helvetica-Bold').fontSize(9)
    .text(`TOTAL: ${data.summary.totalCiiItems} Schedule II Items`, { align: 'right' });

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
