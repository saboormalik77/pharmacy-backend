import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import * as batchService from '../services/batchService';

// ============================================================
// GET /api/admin/batches — List batches
// ============================================================
export const listBatchesHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const {
      status,
      page,
      limit,
      allMemosShipped,
      excludeCompletePharmacyPayouts,
      allDebitMemosPaid,
    } = req.query as Record<string, string>;

    const truthy = (v: string | undefined) =>
      typeof v === 'string' && ['true', '1', 'yes'].includes(v.toLowerCase());

    const result = await batchService.listBatches(
      status,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
      {
        allDebitMemosShipped: truthy(allMemosShipped),
        excludeIfNoRemainingPharmacyPayout: truthy(excludeCompletePharmacyPayouts),
        allDebitMemosPaidOrPartial: truthy(allDebitMemosPaid),
      }
    );

    res.status(200).json({
      status: 'success',
      data: result.data,
      pagination: result.pagination,
    });
  }
);

// ============================================================
// GET /api/admin/batches/used-months — Months that already have a batch
// ============================================================
export const listUsedBatchMonthsHandler = catchAsync(
  async (_req: Request, res: Response, _next: NextFunction) => {
    const months = await batchService.listUsedBatchMonths();
    res.status(200).json({ status: 'success', data: months });
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
// POST /api/admin/batches/:id/close — Close batch (no memos, Step 3 generates them)
// ============================================================
export const closeBatchHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const result = await batchService.closeBatch(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Batch closed. Generate debit memos in Step 3 of the workflow.',
      data: result.batch,
      memosGenerated: 0,
    });
  }
);

// ============================================================
// POST /api/admin/batches/:id/generate-memos — Generate debit memos (Step 3)
// ============================================================
export const generateBatchMemosHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const result = await batchService.generateBatchMemos(req.params.id);

    res.status(200).json({
      status: 'success',
      message: `${result.memosGenerated} debit memo(s) generated.`,
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

// ============================================================
// POST /api/admin/batches/:id/fix-destinations — Fix missing destinations
// ============================================================
export const fixBatchDestinationsHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const result = await batchService.fixBatchDestinations(req.params.id);

    res.status(200).json({
      status: 'success',
      message: result.message,
      data: result,
    });
  }
);

// ============================================================
// Batch Management Operations (FCR-32)
// ============================================================

// DELETE /api/admin/batches/:id — Delete batch
export const deleteBatchHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const result = await batchService.deleteBatch(req.params.id);

    res.status(200).json({
      status: 'success',
      message: result.message,
      data: {
        deletedBatch: result.deletedBatch,
        unassignedReturns: result.unassignedReturns,
      },
    });
  }
);

// POST /api/admin/batches/:id/unassign — Unassign returns from batch
export const unassignReturnsFromBatchHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { transactionIds } = req.body;

    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      throw new AppError('transactionIds array is required', 400);
    }

    const result = await batchService.unassignReturnsFromBatch(req.params.id, transactionIds);

    res.status(200).json({
      status: 'success',
      message: result.message,
      data: {
        batch: result.batch,
        unassignedCount: result.unassignedCount,
        skippedCount: result.skippedCount,
      },
    });
  }
);

// POST /api/admin/return-transactions/:id/unassign — Unassign single return
export const unassignSingleReturnHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const result = await batchService.unassignSingleReturn(req.params.id);

    res.status(200).json({
      status: 'success',
      message: result.message,
      data: {
        batch: result.batch,
        return: result.return,
      },
    });
  }
);

// GET /api/admin/batches/:id/permissions — Get batch permissions
export const getBatchPermissionsHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const permissions = await batchService.getBatchPermissions(req.params.id);

    res.status(200).json({
      status: 'success',
      data: permissions,
    });
  }
);

// ============================================================
// Batch Workflow Operations (FCR-36)
// ============================================================

// GET /api/admin/batches/:id/workflow — Get workflow state
export const getBatchWorkflowHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const workflow = await batchService.getBatchWorkflow(req.params.id);
    res.status(200).json({ status: 'success', data: workflow });
  }
);

// POST /api/admin/batches/:id/workflow/complete — Mark a step as complete
export const completeBatchWorkflowStepHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { step, metadata } = req.body;
    if (!step) throw new AppError('step is required', 400);

    const workflow = await batchService.completeBatchWorkflowStep(
      req.params.id,
      step,
      metadata
    );
    res.status(200).json({
      status: 'success',
      message: `Step '${step}' marked as complete`,
      data: workflow,
    });
  }
);
