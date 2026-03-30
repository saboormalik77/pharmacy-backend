import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import * as itemsService from '../services/returnTransactionItemsService';
import { parseGS1 } from '../services/gs1ParserService';
import { lookupNDC, lookupNDCFromCandidates, extractPackageSizeFromDescription } from '../services/ndcLookupService';
import { checkReturnability, ReturnabilityResult } from '../services/policyEngineService';
import { getPricingForSingleNDC } from '../services/pricingService';
import { resolveNDCPrice } from '../services/ndcPricingBookService';
import * as wcService from '../services/wineCellarService';
import { getReturnTransactionById } from '../services/returnTransactionService';

const parseBooleanInput = (value: unknown): boolean => value === true || value === 'true';

const parsePartialPercentage = (value: unknown): number | undefined => {
  if (value == null || value === '') return undefined;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 100) {
    throw new AppError('partialPercentage must be between 1 and 100', 400);
  }

  return parsed;
};

// ============================================================
// POST /api/return-transactions/:id/items — Add scanned item
// Auto-classifies via policy engine when returnStatus is not provided
// ============================================================
export const addItemHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const transactionId = req.params.id;
    const body = req.body;
    const isPartial = parseBooleanInput(body.isPartial);
    const partialPercentage = isPartial ? parsePartialPercentage(body.partialPercentage) : undefined;

    if (isPartial && partialPercentage == null) {
      throw new AppError('partialPercentage is required when isPartial is true', 400);
    }

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
          isPartial,
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
            not_returnable_in_policy_window: 'policy',
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
      isPartial,
      partialPercentage,
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

    // ── Auto-add to wine cellar when reason is 'too_early' ──────
    let wineCellarItem: any = null;
    if (
      policyResult &&
      policyResult.reason === 'too_early' &&
      policyResult.expectedReturnableDate &&
      result.item
    ) {
      try {
        const transaction = await getReturnTransactionById(transactionId);
        wineCellarItem = await wcService.addToWineCellar({
          pharmacyId: transaction.pharmacyId,
          transactionItemId: result.item.id,
          ndc: body.ndc,
          ndc10: body.ndc10,
          productName: body.proprietaryName || body.genericName,
          manufacturer: body.manufacturer,
          lotNumber: body.lotNumber,
          serialNumber: body.serialNumber,
          expirationDate: body.expirationDate,
          quantity: body.quantity != null ? Number(body.quantity) : 1,
          standardPrice: body.standardPrice != null ? Number(body.standardPrice) : undefined,
          isPartial,
          partialPercentage,
          expectedReturnableDate: policyResult.expectedReturnableDate,
          createdBy: (req as any).adminId || (req as any).processorId,
        });

        // Link wine_cellar_id back on the return item
        await itemsService.updateItem(result.item.id, {
          wineCellarId: wineCellarItem.id,
        } as any);
        result.item.wineCellarId = wineCellarItem.id;
      } catch (wcErr: any) {
        console.error('Auto wine-cellar add failed (non-blocking):', wcErr.message);
      }
    }

    const response: any = {
      status: 'success',
      data: result.item,
    };

    if (policyResult) {
      response.policyCheck = policyResult;
    }

    if (wineCellarItem) {
      response.wineCellarItem = wineCellarItem;
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
    const existingItem = await itemsService.getItem(req.params.itemId);
    const body = req.body;
    const hasIsPartial = Object.prototype.hasOwnProperty.call(body, 'isPartial');
    const hasPartialPercentage = Object.prototype.hasOwnProperty.call(body, 'partialPercentage');

    const isPartial = hasIsPartial ? parseBooleanInput(body.isPartial) : existingItem.isPartial;
    let partialPercentage: number | null | undefined;

    if (isPartial) {
      partialPercentage = hasPartialPercentage
        ? parsePartialPercentage(body.partialPercentage) ?? null
        : existingItem.partialPercentage;

      if (partialPercentage == null) {
        throw new AppError('partialPercentage is required when isPartial is true', 400);
      }
    } else if (hasIsPartial || hasPartialPercentage) {
      partialPercentage = null;
    }

    const normalizedUpdates = {
      ...body,
      ...(hasIsPartial ? { isPartial } : {}),
      ...(partialPercentage !== undefined ? { partialPercentage } : {}),
    };

    const item = await itemsService.updateItem(req.params.itemId, normalizedUpdates);
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
// POST /api/return-transactions/:id/items/:itemId/wine-cellar
// Manually move an existing item to wine cellar
// ============================================================
export const moveToWineCellarHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id: transactionId, itemId } = req.params;
    const body = req.body;

    const existingItem = await itemsService.getItem(itemId);
    if (!existingItem) {
      throw new AppError('Item not found', 404);
    }

    if (existingItem.wineCellarId) {
      throw new AppError('Item is already in wine cellar', 400);
    }

    if (!body.expectedReturnableDate) {
      throw new AppError('expectedReturnableDate is required', 400);
    }

    const transaction = await getReturnTransactionById(transactionId);

    const wineCellarItem = await wcService.addToWineCellar({
      pharmacyId: transaction.pharmacyId,
      transactionItemId: existingItem.id,
      ndc: existingItem.ndc || undefined,
      ndc10: existingItem.ndc10 || undefined,
      productName: existingItem.proprietaryName || existingItem.genericName || undefined,
      manufacturer: existingItem.manufacturer || undefined,
      lotNumber: existingItem.lotNumber || undefined,
      serialNumber: existingItem.serialNumber || undefined,
      expirationDate: existingItem.expirationDate || undefined,
      quantity: existingItem.quantity,
      standardPrice: existingItem.standardPrice ?? undefined,
      isPartial: existingItem.isPartial,
      partialPercentage: existingItem.partialPercentage ?? undefined,
      expectedReturnableDate: body.expectedReturnableDate,
      physicalLocation: body.physicalLocation,
      baggieBarcode: body.baggieBarcode,
      notes: body.notes,
      createdBy: (req as any).adminId || (req as any).processorId,
    });

    // Update item with wine_cellar_id and mark as non_returnable with date reason
    await itemsService.updateItem(itemId, {
      wineCellarId: wineCellarItem.id,
      returnStatus: 'non_returnable',
      nonReturnableReason: 'date',
    } as any);

    res.status(201).json({
      status: 'success',
      data: wineCellarItem,
      message: 'Item moved to wine cellar',
    });
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

    // Use the new RPC function that handles auto-destination assignment
    const result = await itemsService.resolveItemWithAutoDestination(
      itemId,
      new_status,
      reason,
      destination,
      memo
    );

    res.status(200).json({
      status: 'success',
      data: result,
      message: `Item resolved as ${new_status}${result.destination ? ` with destination: ${result.destination}` : ''}`,
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

    // 3. Lookup suggested price from NDC pricing book (with fallback to return reports)
    const resolvedNdc = productInfo?.ndc || gs1.ndcCandidates[0] || null;
    let pricing: {
      suggestedPrice: number | null;
      bestFullPrice: number | null;
      bestPartialPrice: number | null;
      priceSource: string | null;
      distributorPricing: any[] | null;
      estimatedStorePrice: number | null;
      closeOutDestination: string | null;
    } = {
      suggestedPrice: null,
      bestFullPrice: null,
      bestPartialPrice: null,
      priceSource: null,
      distributorPricing: null,
      estimatedStorePrice: null,
      closeOutDestination: null,
    };

    if (resolvedNdc) {
      try {
        // First, try NDC pricing book (our new system)
        const ndcPricing = await resolveNDCPrice(resolvedNdc);
        
        if (ndcPricing.found && ndcPricing.currentPrice && ndcPricing.currentPrice > 0) {
          pricing = {
            suggestedPrice: ndcPricing.currentPrice,
            bestFullPrice: ndcPricing.currentPrice,
            bestPartialPrice: ndcPricing.currentPrice,
            priceSource: ndcPricing.priceSource || 'NDC Pricing Book',
            distributorPricing: null, // NDC pricing book doesn't have distributor breakdown
            estimatedStorePrice: ndcPricing.estimatedStorePrice,
            closeOutDestination: ndcPricing.closeOutDestination,
          };
        } else {
          // Fallback to return_reports if not found in pricing book
          const pricingResult = await getPricingForSingleNDC(resolvedNdc);
          if (pricingResult && (pricingResult.bestFullPrice > 0 || pricingResult.bestPartialPrice > 0)) {
            pricing = {
              suggestedPrice: pricingResult.bestFullPrice > 0
                ? pricingResult.bestFullPrice
                : pricingResult.bestPartialPrice,
              bestFullPrice: pricingResult.bestFullPrice || null,
              bestPartialPrice: pricingResult.bestPartialPrice || null,
              priceSource: pricingResult.recommendedDistributor?.distributorName || 'return_reports',
              distributorPricing: pricingResult.distributors.map(d => ({
                distributorName: d.distributorName,
                fullPrice: d.fullPrice,
                partialPrice: d.partialPrice,
                reportDate: d.reportDate || null,
              })),
              estimatedStorePrice: null,
              closeOutDestination: null,
            };
          }
        }
      } catch (err: any) {
        console.error('Pricing lookup failed (non-blocking):', err.message);
      }
    }

    // 4. Build unified response
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
      pricing,
      autoFill: {
        ndc: resolvedNdc,
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
        standardPrice: pricing.suggestedPrice,
        estimatedValue: pricing.suggestedPrice, // For calculated value
        priceSource: pricing.priceSource,
        destination: pricing.closeOutDestination,
        scanSource: gs1.gtin ? 'gs1_qr' : 'manual',
      },
    };

    res.status(200).json({ status: 'success', data: result });
  }
);
