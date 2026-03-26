import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import { supabaseAdmin } from '../config/supabase';
import * as raService from '../services/raService';
import * as fedexService from '../services/fedexService';

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

    // Save the tracking to the debit memo
    await raService.shipDebitMemo(id, result.masterTrackingNumber);

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
        labels: result.packages.reduce((acc, p, i) => {
          if (p.labelBase64) acc[`package${i + 1}`] = p.labelBase64;
          return acc;
        }, {} as Record<string, string>),
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
