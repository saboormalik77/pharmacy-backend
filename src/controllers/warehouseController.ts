import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import * as warehouseService from '../services/warehouseService';

// ============================================================
// POST /api/admin/warehouse/receive  (legacy — kept for compat)
// ============================================================
export const receiveHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { fedexTracking } = req.body;

    if (!fedexTracking || !fedexTracking.trim()) {
      throw new AppError('fedexTracking is required', 400);
    }

    const result = await warehouseService.scanBox(fedexTracking.trim());

    res.status(200).json({
      status: 'success',
      message: result.message,
      data: result.transaction,
      scanProgress: result.scanProgress,
      alreadyScanned: result.alreadyScanned,
    });
  }
);

// ============================================================
// POST /api/admin/warehouse/scan-box
// ============================================================
export const scanBoxHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { trackingNumber } = req.body;

    if (!trackingNumber || !trackingNumber.trim()) {
      throw new AppError('trackingNumber is required', 400);
    }

    const result = await warehouseService.scanBox(trackingNumber.trim());

    res.status(200).json({
      status: 'success',
      message: result.message,
      data: result.transaction,
      scanProgress: result.scanProgress,
      alreadyScanned: result.alreadyScanned,
    });
  }
);

// ============================================================
// GET /api/admin/warehouse/pending
// ============================================================
export const pendingHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { search, page, limit } = req.query as Record<string, string>;

    const result = await warehouseService.listPending(
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
// GET /api/admin/warehouse/received
// ============================================================
export const receivedHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { search, page, limit, verificationStatus } = req.query as Record<string, string>;

    const result = await warehouseService.listReceived(
      search,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
      verificationStatus
    );

    res.status(200).json({
      status: 'success',
      data: result.data,
      pagination: result.pagination,
    });
  }
);

// ============================================================
// POST /api/admin/warehouse/:id/verify
// ============================================================
export const verifyReturnHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const { piecesReceived, verifiedIntegrity, notes } = req.body;

    const verifiedBy = (req as any).adminId || (req as any).userId;

    const result = await warehouseService.verifyReturn(
      id,
      piecesReceived != null ? Number(piecesReceived) : undefined,
      verifiedIntegrity,
      notes,
      verifiedBy
    );

    res.status(200).json({
      status: 'success',
      message: 'Return verified',
      data: result.transaction,
      verification: result.verification,
    });
  }
);

// ============================================================
// PATCH /api/admin/warehouse/:id/items/:itemId/verify
// ============================================================
export const verifyItemHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id: transactionId, itemId } = req.params;
    const { verified, actualQuantity, conditionNotes } = req.body;

    const item = await warehouseService.verifyItem(
      transactionId,
      itemId,
      verified,
      actualQuantity != null ? Number(actualQuantity) : undefined,
      conditionNotes
    );

    res.status(200).json({
      status: 'success',
      data: item,
    });
  }
);

// ============================================================
// POST /api/admin/warehouse/:id/discrepancy
// ============================================================
export const reportDiscrepancyHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id: transactionId } = req.params;
    const body = req.body;

    if (!body.type) {
      throw new AppError('type is required (missing, extra, damaged, wrong_store, other)', 400);
    }

    const reportedBy = (req as any).adminId || (req as any).userId;

    const discrepancy = await warehouseService.reportDiscrepancy({
      transactionId,
      type: body.type,
      itemId: body.itemId,
      ndc: body.ndc,
      productName: body.productName,
      expectedQuantity: body.expectedQuantity != null ? Number(body.expectedQuantity) : undefined,
      actualQuantity: body.actualQuantity != null ? Number(body.actualQuantity) : undefined,
      notes: body.notes,
      reportedBy,
    });

    res.status(201).json({
      status: 'success',
      data: discrepancy,
    });
  }
);

// ============================================================
// GET /api/admin/warehouse/:id/discrepancies
// ============================================================
export const listDiscrepanciesHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id: transactionId } = req.params;
    const { status } = req.query as Record<string, string>;

    const result = await warehouseService.listDiscrepancies(transactionId, status);

    res.status(200).json({
      status: 'success',
      data: result.data,
      total: result.total,
    });
  }
);

// ============================================================
// POST /api/admin/warehouse/:id/start-verification
// ============================================================
export const startVerificationHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id: transactionId } = req.params;
    const { boxCount } = req.body;

    if (boxCount == null || boxCount < 0) {
      throw new AppError('boxCount is required and must be a non-negative integer', 400);
    }

    const verifiedBy = (req as any).adminId || (req as any).userId;

    const result = await warehouseService.startVerification(
      transactionId,
      Number(boxCount),
      verifiedBy
    );

    res.status(200).json({
      status: 'success',
      data: result,
    });
  }
);

// ============================================================
// PATCH /api/admin/warehouse/:id/items/:itemId/verify-v2
// ============================================================
export const verifyItemV2Handler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id: transactionId, itemId } = req.params;
    const { verificationStatus, actualQuantity, conditionNotes } = req.body;

    if (!verificationStatus) {
      throw new AppError('verificationStatus is required (correct, damaged, missing, wrong_item)', 400);
    }

    const reportedBy = (req as any).adminId || (req as any).userId;

    const item = await warehouseService.verifyItemV2(
      transactionId,
      itemId,
      verificationStatus,
      actualQuantity != null ? Number(actualQuantity) : undefined,
      conditionNotes,
      reportedBy
    );

    res.status(200).json({
      status: 'success',
      data: item,
    });
  }
);

// ============================================================
// POST /api/admin/warehouse/:id/surplus
// ============================================================
export const addSurplusHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id: transactionId } = req.params;
    const body = req.body;

    if (!body.warehouseLocation || !body.warehouseLocation.trim()) {
      throw new AppError('warehouseLocation is required for surplus items', 400);
    }

    const reportedBy = (req as any).adminId || (req as any).userId;

    const surplus = await warehouseService.addSurplus({
      transactionId,
      ndc: body.ndc,
      productName: body.productName,
      manufacturer: body.manufacturer,
      lotNumber: body.lotNumber,
      expirationDate: body.expirationDate,
      quantity: body.quantity != null ? Number(body.quantity) : undefined,
      warehouseLocation: body.warehouseLocation.trim(),
      condition: body.condition,
      notes: body.notes,
      reportedBy,
    });

    res.status(201).json({
      status: 'success',
      data: surplus,
    });
  }
);

// ============================================================
// POST /api/admin/warehouse/:id/complete-verification
// ============================================================
export const completeVerificationHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id: transactionId } = req.params;
    const { notes } = req.body;

    const verifiedBy = (req as any).adminId || (req as any).userId;

    const result = await warehouseService.completeVerification(
      transactionId,
      notes,
      verifiedBy
    );

    res.status(200).json({
      status: 'success',
      data: result.transaction,
      summary: result.summary,
    });
  }
);

// ============================================================
// PATCH /api/admin/warehouse/discrepancies/:discrepancyId/resolve
// ============================================================
export const resolveDiscrepancyHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { discrepancyId } = req.params;
    const { resolution, resolutionNotes } = req.body;

    if (!resolution || !['resolved', 'dismissed'].includes(resolution)) {
      throw new AppError('resolution is required (resolved or dismissed)', 400);
    }

    const resolvedBy = (req as any).adminId || (req as any).userId;

    const discrepancy = await warehouseService.resolveDiscrepancy(
      discrepancyId,
      resolution,
      resolutionNotes,
      resolvedBy
    );

    res.status(200).json({
      status: 'success',
      data: discrepancy,
    });
  }
);

// ============================================================
// GET /api/admin/warehouse/:id/verification-summary
// ============================================================
export const verificationSummaryHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id: transactionId } = req.params;

    const summary = await warehouseService.getVerificationSummary(transactionId);

    res.status(200).json({
      status: 'success',
      data: summary,
    });
  }
);

// ============================================================
// GET /api/admin/warehouse/:id/surplus
// ============================================================
export const listSurplusHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id: transactionId } = req.params;
    const { status } = req.query as Record<string, string>;

    const result = await warehouseService.listSurplus(transactionId, status);

    res.status(200).json({
      status: 'success',
      data: result.data,
      total: result.total,
    });
  }
);

// ============================================================
// GET /api/admin/warehouse/surplus
// ============================================================
export const listAllSurplusHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { status, search, page, limit } = req.query as Record<string, string>;

    const result = await warehouseService.listAllSurplus(
      status,
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
