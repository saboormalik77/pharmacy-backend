import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import * as wcService from '../services/wineCellarService';

// ============================================================
// GET /api/admin/wine-cellar — List wine cellar items
// ============================================================
export const listHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const {
      pharmacy_id, pharmacyId,
      status,
      search,
      expected_month, expectedMonth,
      page, limit,
    } = req.query as Record<string, string>;

    const result = await wcService.listWineCellarItems({
      pharmacyId: pharmacy_id || pharmacyId,
      status,
      search,
      expectedMonth: expected_month || expectedMonth,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    res.status(200).json({ status: 'success', data: result });
  }
);

// ============================================================
// GET /api/admin/wine-cellar/due — Items due this month
// ============================================================
export const dueHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { pharmacy_id, pharmacyId } = req.query as Record<string, string>;

    // Current month in YYYY-MM format
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const result = await wcService.listWineCellarItems({
      pharmacyId: pharmacy_id || pharmacyId,
      status: 'ready_to_return',
      expectedMonth: currentMonth,
      page: 1,
      limit: 100,
    });

    res.status(200).json({ status: 'success', data: result });
  }
);

// ============================================================
// GET /api/admin/wine-cellar/stats — Statistics by status
// ============================================================
export const statsHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { pharmacy_id, pharmacyId } = req.query as Record<string, string>;

    const stats = await wcService.getWineCellarStats(pharmacy_id || pharmacyId);

    res.status(200).json({ status: 'success', data: stats });
  }
);

// ============================================================
// POST /api/admin/wine-cellar/check-ready — Surface ready items
// ============================================================
export const checkReadyHandler = catchAsync(
  async (_req: Request, res: Response, _next: NextFunction) => {
    const result = await wcService.checkAndSurfaceReadyItems();

    res.status(200).json({ status: 'success', data: result });
  }
);

// ============================================================
// GET /api/admin/wine-cellar/:id — Get single item
// ============================================================
export const getHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const item = await wcService.getWineCellarItem(req.params.id);
    res.status(200).json({ status: 'success', data: item });
  }
);

// ============================================================
// POST /api/admin/wine-cellar — Add item to wine cellar
// ============================================================
export const createHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const body = req.body;
    const resolvedPharmacyId = body.pharmacyId || body.pharmacy_id;

    if (!resolvedPharmacyId) {
      throw new AppError('pharmacyId is required', 400);
    }

    const item = await wcService.addToWineCellar({
      pharmacyId: resolvedPharmacyId,
      transactionItemId: body.transactionItemId || body.transaction_item_id,
      sourceReturnTransactionId:
        body.sourceReturnTransactionId || body.source_return_transaction_id,
      ndc: body.ndc,
      ndc10: body.ndc10 || body.ndc_10,
      productName: body.productName || body.product_name,
      manufacturer: body.manufacturer,
      lotNumber: body.lotNumber || body.lot_number,
      serialNumber: body.serialNumber || body.serial_number,
      expirationDate: body.expirationDate || body.expiration_date,
      quantity: body.quantity != null ? Number(body.quantity) : undefined,
      standardPrice: body.standardPrice != null ? Number(body.standardPrice) :
                     body.standard_price != null ? Number(body.standard_price) : undefined,
      isPartial: body.isPartial ?? body.is_partial,
      partialPercentage: body.partialPercentage != null ? Number(body.partialPercentage) :
                         body.partial_percentage != null ? Number(body.partial_percentage) : undefined,
      expectedReturnableDate: body.expectedReturnableDate || body.expected_returnable_date,
      physicalLocation: body.physicalLocation || body.physical_location,
      baggieBarcode: body.baggieBarcode || body.baggie_barcode,
      notes: body.notes,
      createdBy: (req as any).adminId || (req as any).userId,
    });

    res.status(201).json({ status: 'success', data: item });
  }
);

// ============================================================
// PATCH /api/admin/wine-cellar/:id — Update wine cellar item
// ============================================================
export const updateHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const body = req.body;

    const item = await wcService.updateWineCellarItem(req.params.id, {
      physicalLocation: body.physicalLocation ?? body.physical_location,
      baggieBarcode: body.baggieBarcode ?? body.baggie_barcode,
      notes: body.notes,
      quantity: body.quantity != null ? Number(body.quantity) : undefined,
      standardPrice: body.standardPrice != null ? Number(body.standardPrice) :
                     body.standard_price != null ? Number(body.standard_price) : undefined,
      expectedReturnableDate: body.expectedReturnableDate ?? body.expected_returnable_date,
      isPartial: body.isPartial ?? body.is_partial,
      partialPercentage: body.partialPercentage != null ? Number(body.partialPercentage) :
                         body.partial_percentage != null ? Number(body.partial_percentage) : undefined,
    });

    res.status(200).json({ status: 'success', data: item });
  }
);

// ============================================================
// POST /api/admin/wine-cellar/:id/return — Mark as returned
// ============================================================
export const returnHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const body = req.body;
    const resolvedTransactionId = body.transactionId || body.transaction_id;

    if (!resolvedTransactionId) {
      throw new AppError('transactionId is required', 400);
    }

    const item = await wcService.markAsReturned(req.params.id, resolvedTransactionId);

    res.status(200).json({ status: 'success', data: item });
  }
);
