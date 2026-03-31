import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import * as destructionService from '../services/destructionService';

// GET /api/destruction
export const listHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const pharmacyId = req.pharmacyId;
    if (!pharmacyId) throw new AppError('Pharmacy authentication required', 401);
    const { status, search, page, limit } = req.query as Record<string, string>;

    const result = await destructionService.listDestructionRecords({
      pharmacyId,
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

// GET /api/destruction/stats
export const statsHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const pharmacyId = req.pharmacyId;
    if (!pharmacyId) throw new AppError('Pharmacy authentication required', 401);
    const stats = await destructionService.getDestructionStats(pharmacyId);
    res.status(200).json({ status: 'success', data: stats });
  }
);

// PATCH /api/destruction/:id
export const updateHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const pharmacyId = req.pharmacyId;
    if (!pharmacyId) throw new AppError('Pharmacy authentication required', 401);

    const existing = await destructionService.getDestructionRecord(req.params.id);
    if (existing.pharmacyId !== pharmacyId) {
      throw new AppError('You do not have access to this destruction record', 403);
    }

    const record = await destructionService.updateDestructionRecord(req.params.id, {
      status: req.body.status,
      federalFormNumber: req.body.federalFormNumber,
      destructionCompany: req.body.destructionCompany,
      scheduledDate: req.body.scheduledDate,
      pickedUpAt: req.body.pickedUpAt,
      destroyedAt: req.body.destroyedAt,
      formUrl: req.body.formUrl,
      weightLbs: req.body.weightLbs != null ? Number(req.body.weightLbs) : undefined,
      notes: req.body.notes,
    });

    res.status(200).json({ status: 'success', data: record });
  }
);

// GET /api/destruction/pending
export const pendingHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const pharmacyId = req.pharmacyId;
    if (!pharmacyId) throw new AppError('Pharmacy authentication required', 401);
    
    const records = await destructionService.getPendingDestructionItems(pharmacyId);
    
    res.status(200).json({
      status: 'success',
      data: records,
      meta: { total: records.length },
    });
  }
);

// GET /api/destruction/:id
export const getHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const pharmacyId = req.pharmacyId;
    if (!pharmacyId) throw new AppError('Pharmacy authentication required', 401);
    
    const record = await destructionService.getDestructionRecord(req.params.id);
    if (record.pharmacyId !== pharmacyId) {
      throw new AppError('You do not have access to this destruction record', 403);
    }
    
    res.status(200).json({ status: 'success', data: record });
  }
);

// POST /api/destruction
export const createHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const pharmacyId = req.pharmacyId;
    if (!pharmacyId) throw new AppError('Pharmacy authentication required', 401);
    
    const body = req.body;
    
    const record = await destructionService.createDestructionRecord({
      pharmacyId,
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
      createdBy: pharmacyId,
    });
    
    res.status(201).json({ status: 'success', data: record });
  }
);

