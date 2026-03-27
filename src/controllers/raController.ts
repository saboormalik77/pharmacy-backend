import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import { supabaseAdmin } from '../config/supabase';
import * as raService from '../services/raService';
import * as fedexService from '../services/fedexService';
import { generateBarcode } from '../services/barcodeService';

// ============================================================
// POST /api/admin/debit-memos/:id/request-ra
// ============================================================
export const requestRAHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { sentBy, emailOverride } = req.body;

    const result = await raService.sendRARequest(
      req.params.id,
      sentBy,
      emailOverride
    );

    res.status(200).json({
      status: 'success',
      message: 'RA request sent successfully',
      data: result,
    });
  }
);

// ============================================================
// POST /api/admin/debit-memos/:id/receive-ra
// ============================================================
export const receiveRAHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { raNumber, pdfUrl } = req.body;

    if (!raNumber) throw new AppError('raNumber is required', 400);

    const memo = await raService.receiveRA(
      req.params.id,
      raNumber,
      pdfUrl
    );

    res.status(200).json({
      status: 'success',
      message: 'RA received recorded successfully',
      data: memo,
    });
  }
);

// ============================================================
// POST /api/admin/debit-memos/:id/resend-ra
// ============================================================
export const resendRAHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { sentBy, emailOverride } = req.body;

    const result = await raService.resendRARequest(
      req.params.id,
      sentBy,
      emailOverride
    );

    res.status(200).json({
      status: 'success',
      message: 'RA reminder sent successfully',
      data: result,
    });
  }
);

// ============================================================
// POST /api/admin/debit-memos/:id/ship
// ============================================================
export const shipDebitMemoHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { outboundTracking, shippedAt } = req.body;

    if (!outboundTracking) throw new AppError('outboundTracking is required', 400);

    const memo = await raService.shipDebitMemo(
      req.params.id,
      outboundTracking,
      shippedAt
    );

    res.status(200).json({
      status: 'success',
      message: 'Shipment recorded successfully',
      data: memo,
    });
  }
);

// ============================================================
// POST /api/admin/debit-memos/:id/create-fedex-shipment
// ============================================================
export const createDebitMemoFedexShipmentHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const { boxCount, packageWeight, serviceType } = req.body;

    if (!supabaseAdmin) throw new AppError('Supabase admin client not configured', 500);

    // Get the debit memo with destination
    const { data: memo, error: memoErr } = await supabaseAdmin
      .from('debit_memos')
      .select('id, memo_number, destination, ra_number, ra_status, pharmacy_id')
      .eq('id', id)
      .single();

    if (memoErr || !memo) throw new AppError('Debit memo not found', 404);
    if (!memo.ra_number) throw new AppError('Cannot create shipment without an RA number', 400);
    if (!memo.destination) throw new AppError('Debit memo has no destination assigned', 400);

    // Get warehouse address (shipper)
    const { data: settings, error: settingsErr } = await supabaseAdmin.rpc('get_admin_settings');
    if (settingsErr) throw new AppError(`Failed to load settings: ${settingsErr.message}`, 500);

    const s = settings?.settings || settings;
    if (!s?.warehouseStreet || !s?.warehouseCity || !s?.warehouseState || !s?.warehouseZip) {
      throw new AppError('Warehouse address is not configured. Set it in Admin Settings.', 400);
    }

    const cleanWarehousePhone = (s.warehousePhone || '').replace(/\D/g, '');
    if (cleanWarehousePhone.length !== 10) {
      throw new AppError(`Invalid warehouse phone. Must be 10 digits.`, 400);
    }

    // Get reverse distributor address (recipient)
    const { data: distributor, error: distErr } = await supabaseAdmin
      .from('reverse_distributors')
      .select('id, name, contact_email, contact_phone, address')
      .ilike('name', memo.destination)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (distErr || !distributor) {
      throw new AppError(`Reverse distributor "${memo.destination}" not found. Add it in the Distributors page.`, 404);
    }

    const distAddr = distributor.address as { street?: string; city?: string; state?: string; zipCode?: string } | null;
    const missingFields: string[] = [];
    if (!distAddr?.street || distAddr.street.trim() === '') missingFields.push('street address');
    if (!distAddr?.city || distAddr.city.trim() === '') missingFields.push('city');
    if (!distAddr?.state || distAddr.state.trim() === '') missingFields.push('state');
    if (!distAddr?.zipCode || distAddr.zipCode.trim() === '') missingFields.push('ZIP code');
    
    if (missingFields.length > 0) {
      throw new AppError(`Reverse distributor "${distributor.name}" is missing: ${missingFields.join(', ')}. Update it in Distributors page.`, 400);
    }

    const cleanDistPhone = (distributor.contact_phone || '').replace(/\D/g, '');

    const shipperAddress = {
      streetLines: [s.warehouseStreet],
      city: s.warehouseCity,
      stateOrProvinceCode: s.warehouseState,
      postalCode: s.warehouseZip,
      countryCode: s.warehouseCountry || 'US',
    };
    const shipperContact = {
      personName: s.warehouseContactName || s.warehouseName || 'Warehouse',
      phoneNumber: cleanWarehousePhone,
      companyName: s.warehouseName || undefined,
    };

    const recipientAddress = {
      streetLines: [distAddr!.street!],
      city: distAddr!.city!,
      stateOrProvinceCode: distAddr!.state!,
      postalCode: distAddr!.zipCode!,
      countryCode: 'US',
    };
    const recipientContact = {
      personName: distributor.name,
      phoneNumber: cleanDistPhone.length === 10 ? cleanDistPhone : cleanWarehousePhone,
      companyName: distributor.name,
    };

    const resolvedBoxCount = boxCount || 1;

    const result = await fedexService.createShipment({
      shipperAddress,
      shipperContact,
      recipientAddress,
      recipientContact,
      boxCount: resolvedBoxCount,
      packageWeight: packageWeight || 10,
      serviceType: serviceType || 'FEDEX_GROUND',
    });

    // Build labels map
    const labelsMap = result.packages.reduce((acc, p, i) => {
      if (p.labelBase64) acc[`package${i + 1}`] = p.labelBase64;
      return acc;
    }, {} as Record<string, string>);

    // Save tracking and labels to the debit memo
    await raService.shipDebitMemo(id, result.masterTrackingNumber);
    if (Object.keys(labelsMap).length > 0) {
      await supabaseAdmin!
        .from('debit_memos')
        .update({ fedex_labels: labelsMap })
        .eq('id', id);
    }

    res.status(200).json({
      status: 'success',
      data: {
        memo: { id: memo.id, memoNumber: memo.memo_number, destination: memo.destination },
        shipment: {
          masterTrackingNumber: result.masterTrackingNumber,
          shipmentId: result.shipmentId,
          packageCount: result.packages.length,
          packages: result.packages.map((p) => ({
            trackingNumber: p.trackingNumber,
            hasLabel: !!p.labelBase64,
          })),
        },
        labels: labelsMap,
      },
    });
  }
);

// ============================================================
// POST /api/admin/debit-memos/:id/schedule-pickup
// ============================================================
export const scheduleDebitMemoPickupHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const { readyTime, closeTime, pickupDate } = req.body;

    if (!supabaseAdmin) throw new AppError('Supabase admin client not configured', 500);

    const { data: memo, error: memoErr } = await supabaseAdmin
      .from('debit_memos')
      .select('id, memo_number, destination, outbound_tracking')
      .eq('id', id)
      .single();

    if (memoErr || !memo) throw new AppError('Debit memo not found', 404);
    if (!memo.outbound_tracking) {
      throw new AppError('Cannot schedule pickup: Create FedEx shipment first.', 400);
    }

    const { data: settings, error: settingsErr } = await supabaseAdmin.rpc('get_admin_settings');
    if (settingsErr) throw new AppError(`Failed to load settings: ${settingsErr.message}`, 500);

    const s = settings?.settings || settings;
    if (!s?.warehouseStreet || !s?.warehouseCity || !s?.warehouseState || !s?.warehouseZip) {
      throw new AppError('Warehouse address is not configured. Set it in Admin Settings.', 400);
    }

    const cleanPhone = (s.warehousePhone || '').replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      throw new AppError('Invalid warehouse phone. Must be 10 digits.', 400);
    }

    const result = await fedexService.schedulePickup({
      pickupAddress: {
        streetLines: [s.warehouseStreet],
        city: s.warehouseCity,
        stateOrProvinceCode: s.warehouseState,
        postalCode: s.warehouseZip,
        countryCode: s.warehouseCountry || 'US',
      },
      pickupContact: {
        personName: s.warehouseContactName || s.warehouseName || 'Warehouse',
        phoneNumber: cleanPhone,
        companyName: s.warehouseName || undefined,
      },
      packageCount: 1,
      totalWeight: 10,
      readyTime: readyTime || '09:00',
      closeTime: closeTime || '17:00',
      pickupDate: pickupDate || new Date().toISOString().split('T')[0],
    });

    res.status(200).json({
      status: 'success',
      data: {
        memo: { id: memo.id, memoNumber: memo.memo_number },
        pickup: result,
      },
    });
  }
);

// ============================================================
// GET /api/admin/debit-memos/:id/email-preview
// ============================================================
export const emailPreviewHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { type, emailOverride } = req.query as Record<string, string>;

    let template;
    if (type === 'reminder') {
      template = await raService.generateReminderEmail(req.params.id, emailOverride);
    } else {
      template = await raService.generateRequestEmail(req.params.id, emailOverride);
    }

    res.status(200).json({
      status: 'success',
      data: template,
    });
  }
);

// ============================================================
// GET /api/admin/ra-tracking
// ============================================================
export const raTrackingDashboardHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { ra_status, destination, date_from, date_to, search, page, limit } =
      req.query as Record<string, string>;

    const result = await raService.listRATracking({
      raStatus: ra_status,
      destination,
      dateFrom: date_from,
      dateTo: date_to,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    res.status(200).json({
      status: 'success',
      data: result.data,
      pagination: result.pagination,
      summary: result.summary,
    });
  }
);

// ============================================================
// GET /api/admin/ra-tracking/outstanding
// ============================================================
export const raOutstandingHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { search, page, limit } = req.query as Record<string, string>;

    const result = await raService.listOutstandingRAs(
      search,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined
    );

    res.status(200).json({
      status: 'success',
      data: result.data,
      pagination: result.pagination,
    });
  }
);

// ============================================================
// GET /api/admin/ra-tracking/overdue
// ============================================================
export const raOverdueHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { search, page, limit } = req.query as Record<string, string>;

    const result = await raService.listOverdueRAs(
      search,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined
    );

    res.status(200).json({
      status: 'success',
      data: result.data,
      pagination: result.pagination,
    });
  }
);

// ============================================================
// GET /api/admin/shipments/outbound
// ============================================================
export const outboundShipmentsHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { search, page, limit } = req.query as Record<string, string>;

    const result = await raService.listOutboundShipments(
      search,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined
    );

    res.status(200).json({
      status: 'success',
      data: result.data,
      pagination: result.pagination,
    });
  }
);

// ============================================================
// GET /api/admin/debit-memos/:id/shipping-label
// Returns a printable HTML shipping label page
// ============================================================
export const debitMemoShippingLabelHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;

    if (!supabaseAdmin) throw new AppError('Supabase admin client not configured', 500);

    const { data: memo, error: memoErr } = await supabaseAdmin
      .from('debit_memos')
      .select('id, memo_number, destination, outbound_tracking, labeler_name, total_items')
      .eq('id', id)
      .single();

    if (memoErr || !memo) throw new AppError('Debit memo not found', 404);
    if (!memo.outbound_tracking) throw new AppError('No tracking number found for this memo', 400);

    const { data: settings, error: settingsErr } = await supabaseAdmin.rpc('get_admin_settings');
    if (settingsErr) throw new AppError(`Failed to load settings: ${settingsErr.message}`, 500);
    const s = settings?.settings || settings;

    const fromName = s?.warehouseName || 'Warehouse';
    const fromContact = s?.warehouseContactName || '';
    const fromPhone = s?.warehousePhone || '';
    const fromStreet = s?.warehouseStreet || '';
    const fromCity = s?.warehouseCity || '';
    const fromState = s?.warehouseState || '';
    const fromZip = s?.warehouseZip || '';

    let toName = memo.destination || 'Reverse Distributor';
    let toContact = '';
    let toPhone = '';
    let toStreet = '';
    let toCity = '';
    let toState = '';
    let toZip = '';

    if (memo.destination) {
      const { data: dist } = await supabaseAdmin
        .from('reverse_distributors')
        .select('name, phone, address, city, state, zip_code, contact_name')
        .ilike('name', memo.destination)
        .maybeSingle();

      if (dist) {
        toName = dist.name || toName;
        toContact = dist.contact_name || '';
        toPhone = dist.phone || '';
        toStreet = dist.address || '';
        toCity = dist.city || '';
        toState = dist.state || '';
        toZip = dist.zip_code || '';
      }
    }

    let barcodeDataUrl = '';
    try {
      const bc = generateBarcode(memo.outbound_tracking, { format: 'CODE128', width: 2, height: 60, displayValue: true, fontSize: 12, margin: 5 });
      barcodeDataUrl = `data:image/png;base64,${bc.buffer.toString('base64')}`;
    } catch { /* barcode is optional */ }

    const esc = (v: string) => v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const cityLine = (city: string, state: string, zip: string) =>
      [city, state, zip].filter(Boolean).join(', ');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Shipping Label - ${esc(memo.outbound_tracking)}</title>
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
  .memo-info{text-align:center;font-size:8pt;color:#333;margin-top:10px;border-top:1px dashed #ccc;padding-top:6px;}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}.label{max-width:none;}}
</style>
<script>window.onload=function(){setTimeout(function(){window.print();},400);}</script>
</head>
<body>
<div class="label">
  <div class="pkg-info">SHIPPING LABEL - Debit Memo ${esc(memo.memo_number)}</div>
  <div class="label-box">
    <div class="label-heading">From - Shipper</div>
    <div class="label-name">${esc(fromName)}</div>
    ${fromContact && fromContact !== fromName ? `<div class="label-line">${esc(fromContact)}</div>` : ''}
    ${fromStreet ? `<div class="label-line">${esc(fromStreet)}</div>` : ''}
    ${cityLine(fromCity,fromState,fromZip) ? `<div class="label-line">${esc(cityLine(fromCity,fromState,fromZip))}</div>` : ''}
    ${fromPhone ? `<div class="label-line">Phone: ${esc(fromPhone)}</div>` : ''}
  </div>
  <div class="label-box">
    <div class="label-heading">To - Recipient</div>
    <div class="label-name">${esc(toName)}</div>
    ${toContact ? `<div class="label-line">${esc(toContact)}</div>` : ''}
    ${toStreet ? `<div class="label-line">${esc(toStreet)}</div>` : ''}
    ${cityLine(toCity,toState,toZip) ? `<div class="label-line">${esc(cityLine(toCity,toState,toZip))}</div>` : ''}
    ${toPhone ? `<div class="label-line">Phone: ${esc(toPhone)}</div>` : ''}
  </div>
  <div class="barcode-section">
    ${barcodeDataUrl ? `<img src="${barcodeDataUrl}" alt="barcode">` : ''}
  </div>
  <div class="tracking-text">${esc(memo.outbound_tracking)}</div>
  <div class="memo-info">
    Memo: ${esc(memo.memo_number)} | Items: ${memo.total_items}${memo.labeler_name ? ` | Labeler: ${esc(memo.labeler_name)}` : ''}
  </div>
</div>
</body>
</html>`;

    res.set({
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="label-${memo.outbound_tracking}.html"`,
    });
    res.send(html);
  }
);
