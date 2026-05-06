import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import * as itemsService from '../services/returnTransactionItemsService';
import { parseGS1 } from '../services/gs1ParserService';
import { lookupNDC, lookupNDCFromCandidates, extractPackageSizeFromDescription } from '../services/ndcLookupService';
import { getPricingForSingleNDC } from '../services/pricingService';
import { resolveNDCPrice } from '../services/ndcPricingBookService';
import * as wcService from '../services/wineCellarService';
import * as destructionService from '../services/destructionService';
import { getReturnTransactionById } from '../services/returnTransactionService';
import { isValidNonReturnableReason } from '../constants/nonReturnableReasons';

const parseBooleanInput = (value: unknown): boolean => value === true || value === 'true';

const parsePartialPercentage = (value: unknown): number | undefined => {
  if (value == null || value === '') return undefined;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 100) {
    throw new AppError('partialPercentage must be between 1 and 100', 400);
  }

  return parsed;
};

// const POLICY_REASON_TO_DB: Record<string, string> = {
//   too_early: 'date',
//   too_late: 'date',
//   deferred_inside_policy_period: 'date',
//   policy_exception: 'policy',
//   no_partials: 'policy',
//   dosage_form_not_accepted: 'policy',
//   not_returnable_in_policy_window: 'policy',
// };

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

    // Duplicate check: block if NDC + serial number already exist in this return transaction
    if (body.ndc && body.serialNumber) {
      const existing = await itemsService.listItems(transactionId);
      const isDuplicate = (existing.items || []).some(
        (item: any) =>
          item.ndc === body.ndc &&
          item.serialNumber === body.serialNumber
      );
      if (isDuplicate) {
        throw new AppError(
          `Duplicate item: NDC "${body.ndc}" with serial number "${body.serialNumber}" has already been added to this return.`,
          409
        );
      }
    }

    let returnStatus = body.returnStatus;
    let nonReturnableReason = body.nonReturnableReason;
    let destination = body.destination;
    const policyResult = null;

    // if (returnStatus === 'non_returnable') {
    //   if (!nonReturnableReason || !isValidNonReturnableReason(nonReturnableReason)) {
    //     throw new AppError(
    //       'A valid nonReturnableReason is required when adding an item as non-returnable',
    //       400
    //     );
    //   }
    // }

    /*
     * Policy auto-classification for add-item is intentionally disabled.
     * Pharmacy and processor portals should only add items, and warehouse
     * verification is now responsible for policy, wine cellar, and destruction.
     */
    // const shouldAutoClassify =
    //   (!returnStatus || returnStatus === 'tbd') && body.ndc && body.expirationDate;
    //
    // if (body.ndc && body.expirationDate) {
    //   try {
    //     policyResult = await checkReturnability({
    //       ndc: body.ndc,
    //       expirationDate: body.expirationDate,
    //       isPartial,
    //       dosageForm: body.dosageForm,
    //     });
    //
    //     if (shouldAutoClassify) {
    //       returnStatus = policyResult.status;
    //       destination = policyResult.destination || destination;
    //
    //       if (policyResult.status === 'non_returnable' && policyResult.reason) {
    //         nonReturnableReason = POLICY_REASON_TO_DB[policyResult.reason] || 'policy';
    //       }
    //     } else if (
    //       returnStatus === 'non_returnable' &&
    //       !nonReturnableReason &&
    //       policyResult.status === 'non_returnable' &&
    //       policyResult.reason
    //     ) {
    //       nonReturnableReason = POLICY_REASON_TO_DB[policyResult.reason] || 'policy';
    //     }
    //   } catch (err: any) {
    //     console.error('Policy engine check failed (add item):', err.message);
    //     policyResult = null;
    //     if (shouldAutoClassify) {
    //       returnStatus = 'tbd';
    //     }
    //   }
    // }

    /*
     * Wine cellar auto-shelving during add-item is intentionally disabled.
     * Warehouse verification now decides this route and calls the existing
     * move-to-wine-cellar APIs when needed.
     */
    // const wcAutoReason =
    //   policyResult?.reason === 'too_early' || policyResult?.reason === 'deferred_inside_policy_period';
    // const shouldShelveWineCellarOnly =
    //   policyResult &&
    //   wcAutoReason &&
    //   policyResult.expectedReturnableDate &&
    //   returnStatus === 'non_returnable' &&
    //   body.ndc &&
    //   body.expirationDate;
    //
    // if (shouldShelveWineCellarOnly && policyResult) {
    //   const expectedDate = policyResult.expectedReturnableDate;
    //   if (!expectedDate) {
    //     throw new AppError('Policy check did not provide expectedReturnableDate for wine cellar', 500);
    //   }
    //   const transaction = await getReturnTransactionById(transactionId);
    //   const wineCellarItem = await wcService.addToWineCellar({
    //     pharmacyId: transaction.pharmacyId,
    //     sourceReturnTransactionId: transactionId,
    //     ndc: body.ndc,
    //     ndc10: body.ndc10,
    //     productName: body.proprietaryName || body.genericName,
    //     manufacturer: body.manufacturer,
    //     lotNumber: body.lotNumber,
    //     serialNumber: body.serialNumber,
    //     expirationDate: body.expirationDate,
    //     quantity: body.quantity != null ? Number(body.quantity) : 1,
    //     standardPrice: body.standardPrice != null ? Number(body.standardPrice) : undefined,
    //     isPartial,
    //     partialPercentage,
    //     expectedReturnableDate: expectedDate,
    //     notes:
    //       body.memo ||
    //       `Shelved from return ${transactionId} (${policyResult.reason?.replace(/_/g, ' ') || 'policy'})`,
    //     createdBy: (req as any).adminId || (req as any).processorId,
    //   });
    //
    //   return res.status(201).json({
    //     status: 'success',
    //     data: null,
    //     wineCellarOnly: true,
    //     wineCellarItem,
    //     policyCheck: policyResult,
    //   });
    // }

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
      fullPackageQtyReturned: body.fullPackageQtyReturned != null ? Number(body.fullPackageQtyReturned) : undefined,
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

    /*
     * Auto-creating destruction records during add-item is intentionally disabled.
     * Warehouse verification now routes non-returnables to destruction via
     * the existing resolve endpoint.
     */
    // const normalizedDestination = String(result.item.destination || '').trim().toLowerCase();
    // console.log('🔍 [Add Item] Status:', result.item.returnStatus, 'Destination:', normalizedDestination, 'Item ID:', result.item.id);
    // if (result.item.returnStatus === 'non_returnable' && normalizedDestination === 'destruction') {
    //   console.log('💥 [Add Item] Creating destruction record for item:', result.item.id);
    //   try {
    //     await destructionService.createDestructionRecordForTransactionItem(
    //       result.item.id,
    //       (req as any).adminId || (req as any).processorId || (req as any).pharmacyId,
    //       body.memo
    //     );
    //     console.log('✅ [Add Item] Destruction record created successfully');
    //   } catch (err: any) {
    //     console.error('❌ [Add Item] Failed to create destruction record:', err.message);
    //     // Don't fail the item creation if destruction record fails
    //   }
    // }

    const response: any = {
      status: 'success',
      data: result.item,
    };

    if (policyResult) {
      response.policyCheck = policyResult;
    }

    res.status(201).json(response);
  }
);

// ============================================================
// GET /api/return-transactions/:id/items — List items
// ============================================================
//
// FCR-52: Non-returnable items must appear alongside returnable items
// in every return-detail list (pharmacy + admin warehouse). The legacy
// destruction filter was overly aggressive — it hid both:
//   • Returnable items that somehow ended up with destination='destruction'
//   • Non-returnable items routed to destruction
//
// We keep the filter for returnable rows only (defensive; that scenario
// is unexpected and would likely be a bug) but always show
// non-returnable rows so admins / warehouse / pharmacies have full
// visibility.
//
// Pricing in the summary still uses the historical rule:
//   totalReturnableValue → returnable rows only
//   totalNonReturnableValue → non_returnable rows only
//   totalValue → returnable rows only (unchanged for back-compat)
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

    const filteredItems = (result.items || []).filter((item: any) => {
      const normalizedDestination = String(item?.destination || '').trim().toLowerCase();
      const normalizedStatus = String(item?.returnStatus || '').trim().toLowerCase();
      // Only hide returnable rows accidentally routed to destruction.
      // Non-returnable items routed to destruction must still be visible.
      if (normalizedStatus === 'returnable' && normalizedDestination === 'destruction') {
        return false;
      }
      return true;
    });

    const totalReturnableValue = filteredItems
      .filter((item: any) => item.returnStatus === 'returnable')
      .reduce((sum: number, item: any) => sum + (Number(item.estimatedValue) || 0), 0);
    const totalNonReturnableValue = filteredItems
      .filter((item: any) => item.returnStatus === 'non_returnable')
      .reduce((sum: number, item: any) => sum + (Number(item.estimatedValue) || 0), 0);

    res.status(200).json({
      status: 'success',
      data: {
        ...result,
        items: filteredItems,
        summary: {
          totalItems: filteredItems.length,
          totalReturnableValue,
          totalNonReturnableValue,
          totalValue: totalReturnableValue,
          returnableCount: filteredItems.filter((item: any) => item.returnStatus === 'returnable').length,
          nonReturnableCount: filteredItems.filter((item: any) => item.returnStatus === 'non_returnable').length,
        },
      },
    });
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
// FCR-52: If returnStatus is being set to 'non_returnable', a valid
// nonReturnableReason must be supplied (either in this request or
// already present on the row).
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

    if (body.returnStatus === 'non_returnable') {
      // const incomingReason = body.nonReturnableReason;
      // const effectiveReason =
      //   (incomingReason && String(incomingReason).trim()) ||
      //   (existingItem.nonReturnableReason || '').trim();
      // if (!effectiveReason || !isValidNonReturnableReason(effectiveReason)) {
      //   throw new AppError(
      //     'A valid nonReturnableReason is required when marking an item as non-returnable',
      //     400
      //   );
      // }
    }

    // Only include isPartial/partialPercentage in the update if they were explicitly provided in the request
    // This prevents the RPC from thinking we're trying to update core fields when we're just updating classification fields
    const normalizedUpdates: Record<string, any> = { ...body };
    
    // Only add isPartial if it was explicitly provided in the request
    if (hasIsPartial) {
      normalizedUpdates.isPartial = isPartial;
    }
    
    // Only add partialPercentage if it was explicitly provided in the request
    if (hasPartialPercentage) {
      normalizedUpdates.partialPercentage = partialPercentage;
    }

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
// PATCH /api/return-transactions/:id/items/:itemId/price
// Set the item's standardPrice — bypasses the locked-return guard so the
// verification flow can back-propagate a freshly-added NDC Pricing Book price
// onto the item row (so close-out totals are correct).
// ============================================================
export const setItemPriceHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { itemId } = req.params;
    const raw = (req.body || {}).standardPrice;

    if (raw == null || raw === '') {
      throw new AppError('standardPrice is required', 400);
    }

    const price = Number(raw);
    if (!Number.isFinite(price) || price < 0) {
      throw new AppError('standardPrice must be a non-negative number', 400);
    }

    const item = await itemsService.setItemPrice(itemId, price);
    res.status(200).json({ status: 'success', data: item });
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
// FCR-52: When `new_status` is `non_returnable`, a `reason` from the
// canonical RSI list (or a legacy value) is REQUIRED — except for the
// wine cellar route where the reason is implicitly 'date' (item is
// being shelved because it's too early).
// ============================================================
export const resolveItemHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id: transactionId, itemId } = req.params;
    const { new_status, reason, destination, memo, non_returnable_route, expected_returnable_date } = req.body;

    if (!new_status || !['returnable', 'non_returnable'].includes(new_status)) {
      throw new AppError('new_status must be "returnable" or "non_returnable"', 400);
    }

    // Non-returnable route: Wine Cellar flow (pharmacy-side aging).
    if (new_status === 'non_returnable' && non_returnable_route === 'wine_cellar') {
      if (!expected_returnable_date) {
        throw new AppError('expected_returnable_date is required for wine cellar route', 400);
      }

      const existingItem = await itemsService.getItem(itemId);
      if (!existingItem) {
        throw new AppError('Item not found', 404);
      }
      if (existingItem.wineCellarId) {
        throw new AppError('Item is already in wine cellar', 400);
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
        expectedReturnableDate: expected_returnable_date,
        notes: memo || undefined,
        createdBy: (req as any).adminId || (req as any).processorId || (req as any).userId,
      });

      const updated = await itemsService.updateItem(itemId, {
        wineCellarId: wineCellarItem.id,
        returnStatus: 'non_returnable',
        nonReturnableReason: reason && isValidNonReturnableReason(reason) ? reason : 'date',
        memo: memo || undefined,
      } as any);

      return res.status(200).json({
        status: 'success',
        data: updated,
        message: `Item moved to wine cellar (eligible ${expected_returnable_date})`,
      });
    }

    if (new_status === 'non_returnable') {
      if (!reason || !isValidNonReturnableReason(reason)) {
        throw new AppError(
          'A valid non-returnable reason is required when marking an item as non-returnable',
          400
        );
      }
    }

    const destinationForResolve =
      new_status === 'non_returnable' && non_returnable_route === 'destruction'
        ? 'destruction'
        : destination;

    // Use the new RPC function that handles auto-destination assignment
    const result = await itemsService.resolveItemWithAutoDestination(
      itemId,
      new_status,
      reason,
      destinationForResolve,
      memo
    );

    const normalizedDestination = String(result.destination || destinationForResolve || '')
      .trim()
      .toLowerCase();
    console.log('🔍 [Add Item] Status:', new_status, 'Destination:', normalizedDestination, 'Item ID:', itemId);
    if (new_status === 'non_returnable' && normalizedDestination === 'destruction') {
      console.log('💥 [Add Item] Creating destruction record for item:', itemId);
      await destructionService.createDestructionRecordForTransactionItem(
        itemId,
        (req as any).adminId || (req as any).processorId || (req as any).userId,
        memo
      );
      console.log('✅ [Add Item] Destruction record created successfully');
    }

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
      fullQuantity: number | null;
      partialQuantity: number | null;
      priceSource: string | null;
      distributorPricing: any[] | null;
      estimatedStorePrice: number | null;
      closeOutDestination: string | null;
    } = {
      suggestedPrice: null,
      bestFullPrice: null,
      bestPartialPrice: null,
      fullQuantity: null,
      partialQuantity: null,
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
          // Also fetch return_reports quantities even when NDC pricing book has a price
          const pricingResult = await getPricingForSingleNDC(resolvedNdc);
          pricing = {
            suggestedPrice: ndcPricing.currentPrice,
            bestFullPrice: ndcPricing.currentPrice,
            bestPartialPrice: ndcPricing.currentPrice,
            fullQuantity: pricingResult?.totalFullQuantity || null,
            partialQuantity: pricingResult?.totalPartialQuantity || null,
            priceSource: ndcPricing.priceSource || 'NDC Pricing Book',
            distributorPricing: null,
            estimatedStorePrice: ndcPricing.estimatedStorePrice,
            closeOutDestination: ndcPricing.closeOutDestination,
          };
        } else {
          // Fallback to return_reports if not found in pricing book
          const pricingResult = await getPricingForSingleNDC(resolvedNdc);
          if (pricingResult && (pricingResult.bestFullPrice > 0 || pricingResult.bestPartialPrice > 0 || pricingResult.totalFullQuantity > 0 || pricingResult.totalPartialQuantity > 0)) {
            pricing = {
              suggestedPrice: pricingResult.bestFullPrice > 0
                ? pricingResult.bestFullPrice
                : pricingResult.bestPartialPrice,
              bestFullPrice: pricingResult.bestFullPrice || null,
              bestPartialPrice: pricingResult.bestPartialPrice || null,
              fullQuantity: pricingResult.totalFullQuantity || null,
              partialQuantity: pricingResult.totalPartialQuantity || null,
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
