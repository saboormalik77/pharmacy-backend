import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import * as warehouseService from '../services/warehouseService';

// ============================================================
// POST /api/admin/warehouse/receive
// ============================================================
export const receiveHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { fedexTracking } = req.body;

    if (!fedexTracking || !fedexTracking.trim()) {
      throw new AppError('fedexTracking is required', 400);
    }

    const transaction = await warehouseService.receiveReturn(fedexTracking.trim());

    res.status(200).json({
      status: 'success',
      message: 'Return received in warehouse',
      data: transaction,
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
    const { search, page, limit } = req.query as Record<string, string>;

    const result = await warehouseService.listReceived(
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
