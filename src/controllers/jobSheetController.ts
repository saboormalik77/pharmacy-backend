import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import { supabaseAdmin } from '../config/supabase';
import {
  generateJobSheetHTML,
  generateShippingLabelHTML,
  getJobSheetData,
} from '../services/jobSheetService';

function ensureAdmin() {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }
  return supabaseAdmin;
}

// ============================================================
// GET /api/return-transactions/:id/job-sheet
// ============================================================
export const generateJobSheetHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const sb = ensureAdmin();
    const data = await getJobSheetData(id, sb);
    const html = generateJobSheetHTML(data);

    res.set({
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="job-sheet-${data.transaction.licensePlate}.html"`,
    });
    res.send(html);
  }
);

// ============================================================
// GET /api/return-transactions/:id/job-sheet/print
// Same as above but auto-opens print dialog
// ============================================================
export const printJobSheetHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const sb = ensureAdmin();
    const data = await getJobSheetData(id, sb);
    let html = generateJobSheetHTML(data);

    html = html.replace(
      '</head>',
      `<script>window.onload=function(){setTimeout(()=>window.print(),500)}</script></head>`
    );

    res.set({
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="job-sheet-${data.transaction.licensePlate}-print.html"`,
    });
    res.send(html);
  }
);

// ============================================================
// GET /api/return-transactions/:id/shipping-label/:packageNumber
// Printable shipping label for a single package
// ============================================================
export const shippingLabelHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id, packageNumber } = req.params;
    const sb = ensureAdmin();
    const data = await getJobSheetData(id, sb);

    // Collect tracking numbers
    const trackingNumbers: string[] = [];
    if (data.transaction.packageTracking) {
      Object.values(data.transaction.packageTracking).forEach(n => {
        if (n && !trackingNumbers.includes(n)) trackingNumbers.push(n);
      });
    }
    if (trackingNumbers.length === 0 && data.transaction.fedexTracking) {
      trackingNumbers.push(data.transaction.fedexTracking);
    }

    const idx = parseInt(packageNumber, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= trackingNumbers.length) {
      throw new AppError(`Package ${packageNumber} not found. Available: 1–${trackingNumbers.length}`, 404);
    }

    const html = generateShippingLabelHTML(
      data,
      trackingNumbers[idx],
      idx + 1,
      trackingNumbers.length,
    );

    res.set({
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="label-${trackingNumbers[idx]}.html"`,
    });
    res.send(html);
  }
);

// ============================================================
// GET /api/return-transactions/:id/shipping-labels
// All labels on one printable page
// ============================================================
export const allShippingLabelsHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const sb = ensureAdmin();
    const data = await getJobSheetData(id, sb);

    const trackingNumbers: string[] = [];
    if (data.transaction.packageTracking) {
      Object.values(data.transaction.packageTracking).forEach(n => {
        if (n && !trackingNumbers.includes(n)) trackingNumbers.push(n);
      });
    }
    if (trackingNumbers.length === 0 && data.transaction.fedexTracking) {
      trackingNumbers.push(data.transaction.fedexTracking);
    }

    if (trackingNumbers.length === 0) {
      throw new AppError('No tracking numbers found', 404);
    }

    // Build a multi-page HTML document with all labels
    const labels = trackingNumbers.map((num, i) =>
      generateShippingLabelHTML(data, num, i + 1, trackingNumbers.length)
    );

    // Merge into one document by extracting body contents
    const bodyContents = labels.map(l => {
      const match = l.match(/<body>([\s\S]*?)<\/body>/);
      return match ? match[1] : '';
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>All Shipping Labels – ${data.transaction.licensePlate}</title>
<style>
  @page { margin: 0.3in; size: 4in 6in; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:Arial,Helvetica,sans-serif; font-size:10pt; color:#000; background:#fff; }
  .label { width:100%; max-width:3.6in; margin:0 auto; padding:10px 0; page-break-after:always; }
  .label:last-child { page-break-after:auto; }
  .label-box { border:2px solid #000; padding:12px; margin-bottom:14px; }
  .label-heading { font-size:8pt; font-weight:bold; color:#555; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px; border-bottom:1px solid #aaa; padding-bottom:2px; }
  .label-name { font-size:13pt; font-weight:bold; margin-bottom:2px; }
  .label-line { font-size:10pt; margin-bottom:1px; }
  .barcode-section { text-align:center; margin:12px 0 4px; }
  .barcode-section img { max-width:100%; }
  .tracking-text { font-family:'Courier New',monospace; font-size:14pt; font-weight:bold; margin-top:4px; text-align:center; }
  .pkg-info { text-align:center; font-size:9pt; color:#555; margin-bottom:8px; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } .label { max-width:none; } }
</style>
<script>window.onload=function(){setTimeout(()=>window.print(),500)}</script>
</head>
<body>
${bodyContents.join('\n')}
</body>
</html>`;

    res.set({
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="labels-${data.transaction.licensePlate}.html"`,
    });
    res.send(html);
  }
);
