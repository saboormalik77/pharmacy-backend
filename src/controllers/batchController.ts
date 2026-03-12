import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import * as batchService from '../services/batchService';

// ============================================================
// GET /api/admin/batches — List batches
// ============================================================
export const listBatchesHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { status, page, limit } = req.query as Record<string, string>;

    const result = await batchService.listBatches(
      status,
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
// POST /api/admin/batches — Create batch
// ============================================================
export const createBatchHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { batchMonth, batchName } = req.body;

    if (!batchMonth) throw new AppError('batchMonth is required (YYYY-MM-DD)', 400);

    const batch = await batchService.createBatch(batchMonth, batchName);

    res.status(201).json({ status: 'success', data: batch });
  }
);

// ============================================================
// GET /api/admin/batches/:id — Get batch with memos + returns
// ============================================================
export const getBatchHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const result = await batchService.getBatch(req.params.id);

    res.status(200).json({ status: 'success', data: result });
  }
);

// ============================================================
// POST /api/admin/batches/:id/assign — Assign returns
// ============================================================
export const assignReturnsToBatchHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { transactionIds } = req.body;

    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      throw new AppError('transactionIds array is required', 400);
    }

    const result = await batchService.assignReturnsToBatch(req.params.id, transactionIds);

    res.status(200).json({
      status: 'success',
      data: result.batch,
      assigned: result.assigned,
    });
  }
);

// ============================================================
// POST /api/admin/batches/:id/close — Close batch
// ============================================================
export const closeBatchHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const result = await batchService.closeBatch(req.params.id);

    res.status(200).json({
      status: 'success',
      message: `Batch closed. ${result.memosGenerated} debit memo(s) generated.`,
      data: result.batch,
      memosGenerated: result.memosGenerated,
    });
  }
);

// ============================================================
// POST /api/admin/batches/:id/submit-cardinal — Mark submitted
// ============================================================
export const submitCardinalHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const batch = await batchService.submitCardinal(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Batch marked as submitted to Cardinal.',
      data: batch,
    });
  }
);
