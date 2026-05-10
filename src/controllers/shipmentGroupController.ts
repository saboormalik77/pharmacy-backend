import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import { supabaseAdmin } from '../config/supabase';
import { generateBarcode } from '../services/barcodeService';
import * as shipmentGroupService from '../services/shipmentGroupService';
import { getWarehouseAddressFromTable } from '../utils/warehouseAddress';

// ============================================================
// GET /api/admin/shipment-groups/shipped
// ============================================================
export const listShippedShipmentGroupsHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { page, limit, destination } = req.query as Record<string, string>;
    const result = await shipmentGroupService.listShippedShipmentGroups(
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
      destination
    );

    res.set('Cache-Control', 'private, no-store');
    res.status(200).json({
      status: 'success',
      data: result.data,
      pagination: result.pagination,
    });
  }
);

// ============================================================
// GET /api/admin/shipment-groups/available-memos
// ============================================================
export const listMemosForGroupShippingHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { destination } = req.query as { destination?: string };

    const memos = await shipmentGroupService.listMemosForGroupShipping(destination);

    res.set('Cache-Control', 'private, no-store');
    res.status(200).json({
      status: 'success',
      data: memos,
    });
  }
);

// ============================================================
// POST /api/admin/shipment-groups
// ============================================================
export const createShipmentGroupHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { memoIds, boxCount, notes } = req.body;

    if (!memoIds || !Array.isArray(memoIds) || memoIds.length === 0) {
      throw new AppError('memoIds array is required and must not be empty', 400);
    }

    const result = await shipmentGroupService.createShipmentGroup({
      memoIds,
      boxCount,
      notes,
    });

    res.status(201).json({
      status: 'success',
      message: 'Shipment group created successfully',
      data: result,
    });
  }
);

// ============================================================
// GET /api/admin/shipment-groups/:id/shipping-label
// ============================================================
export const shipmentGroupShippingLabelHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;

    if (!supabaseAdmin) throw new AppError('Supabase admin client not configured', 500);

    const details = await shipmentGroupService.getShipmentGroupDetails(id);
    const group = details.group;
    const memos = details.memos;

    if (!group?.outboundTracking) {
      throw new AppError('No tracking number for this shipment group', 400);
    }

    const s = await getWarehouseAddressFromTable();

    const fromName = s.warehouseName || 'Warehouse';
    const fromContact = s.warehouseContactName || '';
    const fromPhone = s.warehousePhone || '';
    const fromStreet = s.warehouseStreet || '';
    const fromCity = s.warehouseCity || '';
    const fromState = s.warehouseState || '';
    const fromZip = s.warehouseZip || '';

    let toName = group.destination || 'Reverse Distributor';
    let toContact = '';
    let toPhone = '';
    let toStreet = '';
    let toCity = '';
    let toState = '';
    let toZip = '';

    if (group.destination) {
      const destTrim = group.destination.trim();
      const norm = (x: string) => x.toLowerCase().replace(/\s+/g, ' ').trim();

      let { data: dist } = await supabaseAdmin
        .from('reverse_distributors')
        .select('name, contact_phone, contact_person, address')
        .ilike('name', destTrim)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (!dist) {
        const { data: allActive } = await supabaseAdmin
          .from('reverse_distributors')
          .select('name, contact_phone, contact_person, address')
          .eq('is_active', true);
        dist =
          allActive?.find((d) => norm(d.name) === norm(destTrim)) ??
          allActive?.find((d) => norm(destTrim).startsWith(norm(d.name))) ??
          allActive?.find((d) => norm(d.name).startsWith(norm(destTrim))) ??
          null;
      }

      if (dist) {
        toName = dist.name || toName;
        toContact = (dist.contact_person || '').trim();
        toPhone = (dist.contact_phone || '').trim();
        const addr = dist.address as Record<string, unknown> | null;
        if (addr && typeof addr === 'object') {
          toStreet = String(addr.street ?? addr.line1 ?? addr.addressLine1 ?? '').trim();
          toCity = String(addr.city ?? '').trim();
          toState = String(addr.state ?? '').trim();
          toZip = String(addr.zipCode ?? addr.zip ?? addr.postalCode ?? '').trim();
        }
      }
    }

    let barcodeDataUrl = '';
    try {
      const bc = generateBarcode(group.outboundTracking, {
        format: 'CODE128',
        width: 2,
        height: 60,
        displayValue: true,
        fontSize: 12,
        margin: 5,
      });
      barcodeDataUrl = `data:image/png;base64,${bc.buffer.toString('base64')}`;
    } catch {
      /* optional */
    }

    const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const cityLine = (city: string, state: string, zip: string) =>
      [city, state, zip].filter(Boolean).join(', ');

    const memoLines = memos
      .map(
        (m: { memoNumber?: string; raNumber?: string; totalItems?: number; pharmacyName?: string }) =>
          `${esc(m.memoNumber || '')} — ${esc(m.pharmacyName || '')} — RA ${esc(m.raNumber || '—')} — ${m.totalItems ?? 0} items`
      )
      .join('<br/>');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Group Shipment - ${esc(group.outboundTracking)}</title>
<style>
  @page { margin:0.3in; size:4in 6in; }
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Arial,Helvetica,sans-serif;font-size:10pt;color:#000;background:#fff;}
  .label{width:100%;max-width:3.6in;margin:0 auto;padding:10px 0;}
  .label-box{border:2px solid #000;padding:12px;margin-bottom:14px;}
  .label-heading{font-size:8pt;font-weight:bold;color:#555;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;border-bottom:1px solid #aaa;padding-bottom:2px;}
  .label-name{font-size:13pt;font-weight:bold;margin-bottom:2px;}
  .label-line{font-size:10pt;margin-bottom:1px;}
  .barcode-section{text-align:center;margin:12px 0 4px;}
  .barcode-section img{max-width:100%;}
  .tracking-text{font-family:'Courier New',monospace;font-size:14pt;font-weight:bold;margin-top:4px;text-align:center;}
  .pkg-info{text-align:center;font-size:9pt;color:#555;margin-bottom:8px;}
  .memo-info{text-align:left;font-size:8pt;color:#333;margin-top:10px;border-top:1px dashed #ccc;padding-top:6px;line-height:1.4;}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}.label{max-width:none;}}
</style>
<script>window.onload=function(){setTimeout(function(){window.print();},400);}</script>
</head>
<body>
<div class="label">
  <div class="pkg-info">GROUP SHIPMENT — ${memos.length} debit memo${memos.length !== 1 ? 's' : ''}</div>
  <div class="label-box">
    <div class="label-heading">From - Shipper</div>
    <div class="label-name">${esc(fromName)}</div>
    ${fromContact && fromContact !== fromName ? `<div class="label-line">${esc(fromContact)}</div>` : ''}
    ${fromStreet ? `<div class="label-line">${esc(fromStreet)}</div>` : ''}
    ${cityLine(fromCity, fromState, fromZip) ? `<div class="label-line">${esc(cityLine(fromCity, fromState, fromZip))}</div>` : ''}
    ${fromPhone ? `<div class="label-line">Phone: ${esc(fromPhone)}</div>` : ''}
  </div>
  <div class="label-box">
    <div class="label-heading">To - Recipient</div>
    <div class="label-name">${esc(toName)}</div>
    ${toContact ? `<div class="label-line">${esc(toContact)}</div>` : ''}
    ${toStreet ? `<div class="label-line">${esc(toStreet)}</div>` : ''}
    ${cityLine(toCity, toState, toZip) ? `<div class="label-line">${esc(cityLine(toCity, toState, toZip))}</div>` : ''}
    ${toPhone ? `<div class="label-line">Phone: ${esc(toPhone)}</div>` : ''}
  </div>
  <div class="barcode-section">
    ${barcodeDataUrl ? `<img src="${barcodeDataUrl}" alt="barcode">` : ''}
  </div>
  <div class="tracking-text">${esc(group.outboundTracking)}</div>
  <div class="memo-info">
    <strong>Memos in this shipment:</strong><br/>${memoLines}
  </div>
</div>
</body>
</html>`;

    res.set({
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="group-label-${group.outboundTracking}.html"`,
    });
    res.send(html);
  }
);

// ============================================================
// GET /api/admin/shipment-groups/:id/fedex-labels
// Returns info about available FedEx labels for the group
// ============================================================
export const getShipmentGroupFedexLabelsHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;

    if (!supabaseAdmin) throw new AppError('Supabase admin client not configured', 500);

    const { data: group, error } = await supabaseAdmin
      .from('shipment_groups')
      .select('id, fedex_labels, package_tracking, outbound_tracking')
      .eq('id', id)
      .single();

    if (error || !group) {
      throw new AppError('Shipment group not found', 404);
    }

    if (!group.fedex_labels) {
      throw new AppError('No FedEx labels found for this shipment group', 404);
    }

    const labels = typeof group.fedex_labels === 'string'
      ? JSON.parse(group.fedex_labels)
      : group.fedex_labels;

    const labelSummary = Object.entries(labels).map(([key, val]) => ({
      package: key,
      hasLabel: !!(val as string),
    }));

    res.status(200).json({
      status: 'success',
      data: { labels: labelSummary, totalLabels: labelSummary.length },
    });
  }
);

// ============================================================
// GET /api/admin/shipment-groups/:id/fedex-labels/:packageNumber/download
// Download a specific package's FedEx label as PDF
// ============================================================
export const downloadShipmentGroupFedexLabelHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id, packageNumber } = req.params;
    const format = req.query.format as string;

    if (!supabaseAdmin) throw new AppError('Supabase admin client not configured', 500);

    const { data: group, error } = await supabaseAdmin
      .from('shipment_groups')
      .select('id, fedex_labels, outbound_tracking')
      .eq('id', id)
      .single();

    if (error || !group) {
      throw new AppError('Shipment group not found', 404);
    }

    if (!group.fedex_labels) {
      throw new AppError('No FedEx labels found for this shipment group', 404);
    }

    const labels = typeof group.fedex_labels === 'string'
      ? JSON.parse(group.fedex_labels)
      : group.fedex_labels;

    // Debug: log what labels are stored
    console.log('Stored labels for group:', {
      groupId: id,
      packageNumber,
      availableKeys: Object.keys(labels),
      labelSizes: Object.entries(labels).map(([k, v]) => `${k}: ${(v as string)?.length || 0} chars`),
    });

    const key = `package${packageNumber}`;
    const labelBase64 = labels[key];
    if (!labelBase64) {
      throw new AppError(`No label found for package ${packageNumber}. Available: ${Object.keys(labels).join(', ')}`, 404);
    }
    
    console.log(`Returning label for ${key}, size: ${labelBase64.length} chars`);

    // If format=print, return HTML page that embeds the PDF for printing
    if (format === 'print') {
      const totalLabels = Object.keys(labels).filter(k => labels[k]).length;
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>FedEx Label - Package ${packageNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; }
  .header { text-align: center; padding: 8px; background: #f5f5f5; border-bottom: 1px solid #ddd; font-size: 12px; }
  .pdf-container { width: 100%; height: calc(100vh - 40px); }
  @media print {
    .header { display: none; }
    .pdf-container { height: 100vh; }
  }
</style>
</head>
<body>
<div class="header">FedEx Shipping Label - Package ${packageNumber} of ${totalLabels} | Tracking: ${group.outbound_tracking || 'N/A'}</div>
<embed src="data:application/pdf;base64,${labelBase64}" type="application/pdf" class="pdf-container" />
<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 800);
  };
</script>
</body>
</html>`;
      res.set({ 'Content-Type': 'text/html; charset=utf-8' });
      return res.send(html);
    }

    // Default: return raw PDF
    const pdfBuffer = Buffer.from(labelBase64, 'base64');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="label_${id}_pkg${packageNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  }
);

// ============================================================
// GET /api/admin/shipment-groups/:id/fedex-labels/print-all
// Returns HTML page with all FedEx labels embedded for printing
// ============================================================
export const printAllShipmentGroupFedexLabelsHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;

    if (!supabaseAdmin) throw new AppError('Supabase admin client not configured', 500);

    const { data: group, error } = await supabaseAdmin
      .from('shipment_groups')
      .select('id, fedex_labels, outbound_tracking, destination')
      .eq('id', id)
      .single();

    if (error || !group) {
      throw new AppError('Shipment group not found', 404);
    }

    if (!group.fedex_labels) {
      throw new AppError('No FedEx labels found for this shipment group', 404);
    }

    const labels = typeof group.fedex_labels === 'string'
      ? JSON.parse(group.fedex_labels)
      : group.fedex_labels;

    const labelEntries = Object.entries(labels).filter(([, val]) => val);
    if (labelEntries.length === 0) {
      throw new AppError('No labels available to print', 404);
    }

    // Generate HTML with embedded PDF labels using embed tags (better print support than iframes)
    const labelPages = labelEntries.map(([key, base64], i) => {
      const pkgNum = key.replace('package', '');
      return `
        <div class="label-page" id="page-${i}">
          <div class="label-header">FedEx Label - Package ${pkgNum} of ${labelEntries.length}</div>
          <embed src="data:application/pdf;base64,${base64}" type="application/pdf" class="label-embed" />
        </div>
      `;
    }).join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>FedEx Labels - ${group.outbound_tracking || group.id}</title>
<style>
  @page { margin: 0; size: 4in 6in; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; background: #fff; }
  .label-page { 
    width: 4in; 
    height: 6in; 
    page-break-after: always; 
    position: relative;
    margin: 0 auto 20px;
    border: 1px solid #ccc;
    background: #fff;
  }
  .label-page:last-child { page-break-after: auto; }
  .label-header { 
    text-align: center; 
    font-size: 10pt; 
    padding: 6px; 
    background: #f5f5f5; 
    border-bottom: 1px solid #ddd;
    font-weight: bold;
  }
  .label-embed { 
    width: 100%; 
    height: calc(6in - 30px); 
    border: none; 
  }
  .print-info {
    text-align: center;
    padding: 20px;
    background: #e8f5e9;
    margin-bottom: 20px;
    border-radius: 4px;
  }
  .print-info h2 { margin: 0 0 10px; color: #2e7d32; }
  .print-info p { margin: 0; color: #555; }
  .print-btn {
    display: inline-block;
    margin-top: 15px;
    padding: 10px 30px;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
  }
  .print-btn:hover { background: #1565c0; }
  @media print {
    .print-info { display: none; }
    .label-page { margin: 0; border: none; }
    .label-header { display: none; }
    .label-embed { height: 6in; }
  }
</style>
</head>
<body>
<div class="print-info">
  <h2>FedEx Shipping Labels Ready</h2>
  <p>Tracking: <strong>${group.outbound_tracking || 'N/A'}</strong> | Total Labels: <strong>${labelEntries.length}</strong></p>
  <button class="print-btn" onclick="window.print()">Print All Labels</button>
</div>
${labelPages}
<script>
  // Auto-print after a delay to allow PDFs to load
  setTimeout(function() { window.print(); }, 1500);
</script>
</body>
</html>`;

    res.set({
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="fedex-labels-${group.id}.html"`,
    });
    res.send(html);
  }
);

// ============================================================
// POST /api/admin/shipment-groups/:id/schedule-pickup
// ============================================================
export const scheduleShipmentGroupPickupHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { readyTime, closeTime, pickupDate } = req.body;
    const pickup = await shipmentGroupService.scheduleShipmentGroupPickup(req.params.id, {
      readyTime,
      closeTime,
      pickupDate,
    });

    res.status(200).json({
      status: 'success',
      data: {
        group: { id: req.params.id },
        pickup,
      },
    });
  }
);

// ============================================================
// GET /api/admin/shipment-groups/:id
// ============================================================
export const getShipmentGroupDetailsHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const result = await shipmentGroupService.getShipmentGroupDetails(req.params.id);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  }
);

// ============================================================
// POST /api/admin/shipment-groups/:id/ship
// ============================================================
export const shipGroupHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { outboundTracking, shippedAt } = req.body;

    if (!outboundTracking) {
      throw new AppError('outboundTracking is required', 400);
    }

    const result = await shipmentGroupService.shipMemoGroup(req.params.id, {
      outboundTracking,
      shippedAt,
    });

    res.status(200).json({
      status: 'success',
      message: 'Shipment group shipped successfully',
      data: result,
    });
  }
);

// ============================================================
// POST /api/admin/shipment-groups/:id/create-fedex-shipment
// ============================================================
export const createGroupFedexShipmentHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const { boxCount, packageWeight, serviceType } = req.body;

    if (!boxCount || boxCount < 1) {
      throw new AppError('boxCount is required and must be at least 1', 400);
    }

    const result = await shipmentGroupService.createShipmentGroupFedexShipment(
      id,
      boxCount,
      packageWeight,
      serviceType
    );

    res.status(200).json({
      status: 'success',
      message: 'FedEx shipment created and group shipped successfully',
      data: {
        group: result.group,
        memos: result.memos,
        shipment: result.shipment,
        labels: result.labels,
      },
    });
  }
);