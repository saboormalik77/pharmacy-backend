import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import * as itemsService from '../services/returnTransactionItemsService';
import { parseGS1 } from '../services/gs1ParserService';
import { lookupNDC, lookupNDCFromCandidates, extractPackageSizeFromDescription } from '../services/ndcLookupService';
import { checkReturnability, ReturnabilityResult } from '../services/policyEngineService';

// ============================================================
// POST /api/return-transactions/:id/items — Add scanned item
// Auto-classifies via policy engine when returnStatus is not provided
// ============================================================
export const addItemHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const transactionId = req.params.id;
    const body = req.body;

    let returnStatus = body.returnStatus;
    let nonReturnableReason = body.nonReturnableReason;
    let destination = body.destination;
    let policyResult: ReturnabilityResult | null = null;

    // Auto-classify via policy engine when:
    // - returnStatus is not set, OR
    // - returnStatus is "tbd" (default from frontend — means "please classify for me")
    // Only skip when processor explicitly chose "returnable" or "non_returnable"
    const shouldAutoClassify =
      (!returnStatus || returnStatus === 'tbd') && body.ndc && body.expirationDate;

    if (shouldAutoClassify) {
      try {
        policyResult = await checkReturnability({
          ndc: body.ndc,
          expirationDate: body.expirationDate,
          isPartial: body.isPartial === true || body.isPartial === 'true',
          dosageForm: body.dosageForm,
        });

        returnStatus = policyResult.status;
        destination = policyResult.destination || destination;

        if (policyResult.status === 'non_returnable' && policyResult.reason) {
          const reasonMap: Record<string, string> = {
            too_early: 'date',
            too_late: 'date',
            policy_exception: 'policy',
            no_partials: 'policy',
            dosage_form_not_accepted: 'policy',
          };
          nonReturnableReason = reasonMap[policyResult.reason] || 'policy';
        }
      } catch (err: any) {
        console.error('Policy engine auto-classify failed (saving as TBD):', err.message);
        returnStatus = 'tbd';
      }
    }

    // Extract fullPackageSize from packageDescription if not explicitly provided
    let fullPackageSize: number | undefined;
    if (body.fullPackageSize != null) {
      fullPackageSize = Number(body.fullPackageSize);
    } else if (body.packageDescription) {
      const extracted = extractPackageSizeFromDescription(body.packageDescription);
      if (extracted) fullPackageSize = extracted;
    }

    const result = await itemsService.addItem({
      transactionId,
      ndc: body.ndc,
      ndc10: body.ndc10,
      gtin: body.gtin,
      proprietaryName: body.proprietaryName,
      genericName: body.genericName,
      manufacturer: body.manufacturer,
      packageDescription: body.packageDescription,
      dosageForm: body.dosageForm,
      strength: body.strength,
      route: body.route,
      lotNumber: body.lotNumber,
      serialNumber: body.serialNumber,
      expirationDate: body.expirationDate,
      standardPrice: body.standardPrice != null ? Number(body.standardPrice) : undefined,
      quantity: body.quantity != null ? Number(body.quantity) : undefined,
      fullPackageSize,
      isPartial: body.isPartial,
      partialPercentage: body.partialPercentage != null ? Number(body.partialPercentage) : undefined,
      returnStatus,
      nonReturnableReason,
      returnReason: body.returnReason,
      destination,
      deaSchedule: body.deaSchedule,
      deaForm222Required: body.deaForm222Required,
      productType: body.productType,
      coStatus: body.coStatus,
      bmpStatus: body.bmpStatus,
      memo: body.memo,
      scanSource: body.scanSource,
      rawScanData: body.rawScanData,
    });

    const response: any = {
      status: 'success',
      data: result.item,
    };

    if (policyResult) {
      response.policyCheck = policyResult;
    }

    if (result.duplicate) {
      response.warning = 'Duplicate NDC + lot number detected in this transaction';
      response.duplicateItemId = result.duplicateItemId;
    }

    res.status(201).json(response);
  }
);

// ============================================================
// GET /api/return-transactions/:id/items — List items
// ============================================================
export const listItemsHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const transactionId = req.params.id;
    const { return_status, returnStatus, search } = req.query as Record<string, string>;

    const result = await itemsService.listItems(
      transactionId,
      return_status || returnStatus,
      search,
    );

    res.status(200).json({ status: 'success', data: result });
  }
);

// ============================================================
// GET /api/return-transactions/:id/items/:itemId — Get item
// ============================================================
export const getItemHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const item = await itemsService.getItem(req.params.itemId);
    res.status(200).json({ status: 'success', data: item });
  }
);

// ============================================================
// PATCH /api/return-transactions/:id/items/:itemId — Update item
// ============================================================
export const updateItemHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const item = await itemsService.updateItem(req.params.itemId, req.body);
    res.status(200).json({ status: 'success', data: item });
  }
);

// ============================================================
// DELETE /api/return-transactions/:id/items/:itemId — Delete item
// ============================================================
export const deleteItemHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    await itemsService.deleteItem(req.params.itemId);
    res.status(200).json({ status: 'success', message: 'Item deleted' });
  }
);

// ============================================================
// PATCH /api/return-transactions/:id/items/:itemId/resolve — Resolve TBD item
// ============================================================
export const resolveItemHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { itemId } = req.params;
    const { new_status, reason, destination, memo } = req.body;

    if (!new_status || !['returnable', 'non_returnable'].includes(new_status)) {
      throw new AppError('new_status must be "returnable" or "non_returnable"', 400);
    }

    const existingItem = await itemsService.getItem(itemId);
    if (!existingItem) {
      throw new AppError('Item not found', 404);
    }

    if (existingItem.returnStatus !== 'tbd') {
      throw new AppError(
        `Item is already classified as "${existingItem.returnStatus}". Only TBD items can be resolved.`,
        400
      );
    }

    const updates: Partial<itemsService.AddItemData> = {
      returnStatus: new_status,
    };

    if (new_status === 'non_returnable') {
      updates.nonReturnableReason = reason || 'manual_review';
    }

    if (destination) {
      updates.destination = destination;
    }

    if (memo) {
      updates.memo = memo;
    }

    const updatedItem = await itemsService.updateItem(itemId, updates);

    res.status(200).json({
      status: 'success',
      data: updatedItem,
      message: `Item resolved as ${new_status}`,
    });
  }
);

// ============================================================
// POST /api/barcode/scan — Parse QR/barcode + lookup product info
// ============================================================
export const scanBarcodeHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { scanData, barcodeData } = req.body;
    const input = scanData || barcodeData;

    if (!input || typeof input !== 'string' || input.trim() === '') {
      throw new AppError('scanData is required', 400);
    }

    const trimmed = input.trim();

    // 1. Parse GS1 data from scan
    const gs1 = parseGS1(trimmed);

    // 2. Look up product info from NDC
    let productInfo = null;

    if (gs1.ndcCandidates.length > 0) {
      productInfo = await lookupNDCFromCandidates(gs1.ndcCandidates);
    }

    // If GTIN conversion didn't yield a result, try the raw input as an NDC
    if (!productInfo && !gs1.gtin) {
      productInfo = await lookupNDC(trimmed);
    }

    // 3. Build unified response
    const result: Record<string, any> = {
      scan: {
        gtin: gs1.gtin,
        lotNumber: gs1.lotNumber,
        serialNumber: gs1.serialNumber,
        expirationDate: gs1.expirationDate,
        ndc10: gs1.ndc10,
        ndcCandidates: gs1.ndcCandidates,
      },
      product: productInfo ? {
        ndc: productInfo.ndc,
        ndc11: productInfo.ndc11,
        proprietaryName: productInfo.proprietaryName,
        genericName: productInfo.genericName,
        manufacturer: productInfo.manufacturer,
        packageDescription: productInfo.packageDescription,
        dosageForm: productInfo.dosageForm,
        strength: productInfo.strength,
        route: productInfo.route,
        deaSchedule: productInfo.deaSchedule,
        productType: productInfo.productType,
        fullPackageSize: productInfo.fullPackageSize,
        activeIngredients: productInfo.activeIngredients,
        source: productInfo.source,
      } : null,
      autoFill: {
        ndc: productInfo?.ndc || gs1.ndcCandidates[0] || null,
        ndc10: gs1.ndc10 || null,
        gtin: gs1.gtin || null,
        proprietaryName: productInfo?.proprietaryName || null,
        genericName: productInfo?.genericName || null,
        manufacturer: productInfo?.manufacturer || null,
        packageDescription: productInfo?.packageDescription || null,
        dosageForm: productInfo?.dosageForm || null,
        strength: productInfo?.strength || null,
        route: productInfo?.route || null,
        lotNumber: gs1.lotNumber || null,
        serialNumber: gs1.serialNumber || null,
        expirationDate: gs1.expirationDate || null,
        deaSchedule: productInfo?.deaSchedule || null,
        productType: productInfo?.productType || null,
        fullPackageSize: productInfo?.fullPackageSize || null,
        scanSource: gs1.gtin ? 'gs1_qr' : 'manual',
      },
    };

    res.status(200).json({ status: 'success', data: result });
  }
);
