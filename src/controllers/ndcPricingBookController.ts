import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import * as svc from '../services/ndcPricingBookService';

// ============================================================
// POST /api/admin/ndc-pricing — Upsert (create or update)
// ============================================================
export const upsertHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { ndc } = req.body;
    if (!ndc) throw new AppError('NDC code is required', 400);

    const userId = (req as any).adminId || (req as any).processorId;
    const result = await svc.upsertNDCPricing({ ...req.body, userId });

    res.status(200).json({ status: 'success', data: result });
  }
);

// ============================================================
// GET /api/admin/ndc-pricing/search — Search / list (paginated)
// ============================================================
export const searchHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { search, q, page, limit, sortBy, sortOrder } = req.query as Record<string, string>;

    const result = await svc.searchNDCPricingBook({
      search: search || q || '',
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 25,
      sortBy: sortBy || 'updated_at',
      sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
    });

    res.status(200).json({ status: 'success', data: result });
  }
);

// ============================================================
// GET /api/admin/ndc-pricing/:ndc — Get by NDC
// ============================================================
export const getByNdcHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { ndc } = req.params;
    if (!ndc) throw new AppError('NDC code is required', 400);

    const result = await svc.getNDCPricingByNdc(ndc);
    res.status(200).json({ status: 'success', data: result });
  }
);

// ============================================================
// DELETE /api/admin/ndc-pricing/:id — Delete
// ============================================================
export const deleteHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    if (!id) throw new AppError('ID is required', 400);

    await svc.deleteNDCPricing(id);
    res.status(200).json({ status: 'success', message: 'Deleted successfully' });
  }
);

// ============================================================
// GET /api/admin/ndc-pricing/resolve/:ndc — Resolve price
// ============================================================
export const resolveHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { ndc } = req.params;
    if (!ndc) throw new AppError('NDC code is required', 400);

    const result = await svc.resolveNDCPrice(ndc);
    res.status(200).json({ status: 'success', data: result });
  }
);

// ============================================================
// POST /api/admin/ndc-pricing/import — Import from return_reports
// ============================================================
export const importHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const userId = (req as any).adminId || (req as any).processorId;
    const result = await svc.importFromReports(userId);
    res.status(200).json({ status: 'success', data: result });
  }
);
