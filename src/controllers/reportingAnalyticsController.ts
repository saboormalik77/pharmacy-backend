import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import * as reportingService from '../services/reportingAnalyticsService';

// ============================================================
// GET /api/admin/analytics/returns-summary
// ============================================================
export const returnsSummaryHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { period_start, period_end, pharmacy_id, group_by } =
      req.query as Record<string, string>;

    const result = await reportingService.getReturnsSummary({
      periodStart: period_start,
      periodEnd: period_end,
      pharmacyId: pharmacy_id,
      groupBy: group_by,
    });

    res.status(200).json({ status: 'success', data: result });
  }
);

// ============================================================
// GET /api/admin/analytics/fcr-ask-vs-received
// ============================================================
export const fcrAskVsReceivedHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { group_by, batch_id, period, page, limit } =
      req.query as Record<string, string>;

    const result = await reportingService.getAskVsReceived({
      groupBy: group_by,
      batchId: batch_id,
      period,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    res.status(200).json({
      status: 'success',
      data: result.data,
      totals: result.totals,
      pagination: result.pagination,
    });
  }
);

// ============================================================
// GET /api/admin/analytics/aging-inventory
// ============================================================
export const agingInventoryHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { pharmacy_id, status, page, limit } =
      req.query as Record<string, string>;

    const result = await reportingService.getAgingInventory({
      pharmacyId: pharmacy_id,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    res.status(200).json({
      status: 'success',
      data: result.data,
      summary: result.summary,
      agingBuckets: result.agingBuckets,
      pagination: result.pagination,
    });
  }
);

// ============================================================
// GET /api/admin/analytics/outstanding-ra
// ============================================================
export const outstandingRaHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { destination, search, page, limit } =
      req.query as Record<string, string>;

    const result = await reportingService.getOutstandingRA({
      destination,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    res.status(200).json({
      status: 'success',
      data: result.data,
      summary: result.summary,
      agingBuckets: result.agingBuckets,
      pagination: result.pagination,
    });
  }
);

// ============================================================
// GET /api/admin/analytics/unpaid-memos
// ============================================================
export const unpaidMemosHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { manufacturer, destination, search, page, limit } =
      req.query as Record<string, string>;

    const result = await reportingService.getUnpaidMemos({
      manufacturer,
      destination,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    res.status(200).json({
      status: 'success',
      data: result.data,
      summary: result.summary,
      agingBuckets: result.agingBuckets,
      pagination: result.pagination,
    });
  }
);

// ============================================================
// GET /api/admin/analytics/price-audit
// ============================================================
export const priceAuditHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { ndc, source, search, page, limit } =
      req.query as Record<string, string>;

    const result = await reportingService.getPriceAudit({
      ndc,
      source,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    res.status(200).json({
      status: 'success',
      data: result.data,
      summary: result.summary,
      pagination: result.pagination,
    });
  }
);

// ============================================================
// GET /api/admin/analytics/pharmacy-performance
// ============================================================
export const pharmacyPerformanceHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { search, sort_by, sort_dir, page, limit } =
      req.query as Record<string, string>;

    const result = await reportingService.getPharmacyPerformance({
      search,
      sortBy: sort_by,
      sortDir: sort_dir,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    res.status(200).json({
      status: 'success',
      data: result.data,
      overall: result.overall,
      pagination: result.pagination,
    });
  }
);

// ============================================================
// GET /api/admin/analytics/gpo-summary
// ============================================================
export const gpoSummaryHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { search, page, limit } = req.query as Record<string, string>;

    const result = await reportingService.getGpoSummary({
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    res.status(200).json({
      status: 'success',
      data: result.data,
      pagination: result.pagination,
    });
  }
);

// ============================================================
// GET /api/analytics/pharmacy-dashboard (pharmacy-facing)
// ============================================================
export const pharmacyDashboardHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const pharmacyId = (req as any).pharmacyId;
    const { period_start, period_end } = req.query as Record<string, string>;

    const result = await reportingService.getPharmacyDashboard(
      pharmacyId,
      period_start,
      period_end
    );

    res.status(200).json({ status: 'success', data: result });
  }
);
