import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { catchAsync } from '../utils/catchAsync';
import * as wcService from '../services/wineCellarService';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
    const pharmacyId = req.pharmacyId!;
    const { status, search, expected_month, page, limit } = req.query as Record<string, string>;

    const result = await wcService.listWineCellarItems({
      pharmacyId,
      status: status || undefined,
      search: search || undefined,
      expectedMonth: expected_month || undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });

    res.status(200).json({ status: 'success', data: result });
  })
);

router.get(
  '/stats',
  catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
    const pharmacyId = req.pharmacyId!;
    const result = await wcService.getWineCellarStats(pharmacyId);
    res.status(200).json({ status: 'success', data: result });
  })
);

router.post(
  '/',
  catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
    const pharmacyId = req.pharmacyId!;
    const body = req.body || {};

    const item = await wcService.addToWineCellar({
      pharmacyId,
      transactionItemId: body.transactionItemId || body.transaction_item_id,
      sourceReturnTransactionId: body.sourceReturnTransactionId || body.source_return_transaction_id,
      ndc: body.ndc,
      ndc10: body.ndc10 || body.ndc_10,
      productName: body.productName || body.product_name,
      manufacturer: body.manufacturer,
      lotNumber: body.lotNumber || body.lot_number,
      serialNumber: body.serialNumber || body.serial_number,
      expirationDate: body.expirationDate || body.expiration_date,
      quantity: body.quantity != null ? Number(body.quantity) : undefined,
      standardPrice:
        body.standardPrice != null
          ? Number(body.standardPrice)
          : body.standard_price != null
            ? Number(body.standard_price)
            : undefined,
      isPartial: body.isPartial ?? body.is_partial,
      partialPercentage:
        body.partialPercentage != null
          ? Number(body.partialPercentage)
          : body.partial_percentage != null
            ? Number(body.partial_percentage)
            : undefined,
      expectedReturnableDate: body.expectedReturnableDate || body.expected_returnable_date,
      physicalLocation: body.physicalLocation || body.physical_location,
      baggieBarcode: body.baggieBarcode || body.baggie_barcode,
      notes: body.notes,
      createdBy: pharmacyId,
    });

    res.status(201).json({ status: 'success', data: item });
  })
);

export default router;
