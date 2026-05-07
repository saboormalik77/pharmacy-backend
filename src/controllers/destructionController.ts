import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import * as destructionService from '../services/destructionService';

// ============================================================
// GET /api/admin/destruction — List destruction records
// ============================================================
export const listHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { pharmacy_id, status, search, page, limit } = req.query as Record<string, string>;
    const scopedPharmacyId = req.pharmacyId || pharmacy_id;

    const result = await destructionService.listDestructionRecords({
      pharmacyId: scopedPharmacyId,
      status,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    res.status(200).json({
      status: 'success',
      data: result.records,
      meta: {
        total: result.total,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 50,
      },
    });
  }
);

// ============================================================
// GET /api/admin/destruction/pending — Pending items
// ============================================================
export const pendingHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { pharmacy_id } = req.query as Record<string, string>;
    const scopedPharmacyId = req.pharmacyId || pharmacy_id;

    const records = await destructionService.getPendingDestructionItems(scopedPharmacyId);

    res.status(200).json({
      status: 'success',
      data: records,
      meta: { total: records.length },
    });
  }
);

// ============================================================
// GET /api/admin/destruction/stats — Destruction statistics
// ============================================================
export const statsHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { pharmacy_id } = req.query as Record<string, string>;
    const scopedPharmacyId = req.pharmacyId || pharmacy_id;

    const stats = await destructionService.getDestructionStats(scopedPharmacyId);

    res.status(200).json({
      status: 'success',
      data: stats,
    });
  }
);

// ============================================================
// GET /api/admin/destruction/:id — Get single record
// ============================================================
export const getHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const record = await destructionService.getDestructionRecord(req.params.id);
    if (req.pharmacyId && record.pharmacyId !== req.pharmacyId) {
      throw new AppError('You do not have access to this destruction record', 403);
    }
    res.status(200).json({ status: 'success', data: record });
  }
);

// ============================================================
// POST /api/admin/destruction — Create destruction record
// ============================================================
export const createHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const body = req.body;
    const scopedPharmacyId = req.pharmacyId || body.pharmacyId || body.pharmacy_id;

    if (!scopedPharmacyId) {
      throw new AppError('pharmacyId is required', 400);
    }

    const record = await destructionService.createDestructionRecord({
      pharmacyId: scopedPharmacyId,
      transactionItemId: body.transactionItemId,
      ndc: body.ndc,
      productName: body.productName,
      manufacturer: body.manufacturer,
      lotNumber: body.lotNumber,
      quantity: body.quantity != null ? Number(body.quantity) : undefined,
      weightLbs: body.weightLbs != null ? Number(body.weightLbs) : undefined,
      destructionReason: body.destructionReason || 'non_returnable',
      destructionCompany: body.destructionCompany,
      scheduledDate: body.scheduledDate,
      notes: body.notes,
      createdBy: (req as any).adminId || req.pharmacyId || (req as any).userId,
    });

    res.status(201).json({ status: 'success', data: record });
  }
);

// ============================================================
// PATCH /api/admin/destruction/:id — Update destruction record
// ============================================================
export const updateHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    if (req.pharmacyId) {
      const existing = await destructionService.getDestructionRecord(req.params.id);
      if (existing.pharmacyId !== req.pharmacyId) {
        throw new AppError('You do not have access to this destruction record', 403);
      }
    }

    const record = await destructionService.updateDestructionRecord(
      req.params.id,
      {
        status: req.body.status,
        federalFormNumber: req.body.federalFormNumber,
        destructionCompany: req.body.destructionCompany,
        scheduledDate: req.body.scheduledDate,
        pickedUpAt: req.body.pickedUpAt,
        destroyedAt: req.body.destroyedAt,
        formUrl: req.body.formUrl,
        weightLbs: req.body.weightLbs != null ? Number(req.body.weightLbs) : undefined,
        notes: req.body.notes,
      }
    );

    res.status(200).json({ status: 'success', data: record });
  }
);
