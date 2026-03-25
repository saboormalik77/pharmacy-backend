import { Request, Response, NextFunction } from 'express';
import {
  createReturn,
  getReturns,
  getReturnById,
  updateReturn,
  deleteReturn,
  checkReturnLockStatus,
} from '../services/returnsService';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';

const getPharmacyId = (req: Request): string => {
  return (req.body.pharmacy_id || req.query.pharmacy_id) as string;
};

export const createReturnHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const pharmacyId = getPharmacyId(req);
    if (!pharmacyId) {
      throw new AppError('Pharmacy ID is required', 400);
    }

    const { items, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new AppError('At least one return item is required', 400);
    }

    const returnData = await createReturn({
      pharmacy_id: pharmacyId,
      items,
      notes,
    });

    res.status(201).json({
      status: 'success',
      data: returnData,
    });
  }
);

export const getReturnsHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const pharmacyId = getPharmacyId(req);
    if (!pharmacyId) {
      throw new AppError('Pharmacy ID is required', 400);
    }

    const status = req.query.status as any;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

    const result = await getReturns(pharmacyId, {
      status,
      limit,
      offset,
    });

    res.status(200).json({
      status: 'success',
      data: result.returns,
      total: result.total,
    });
  }
);

export const getReturnByIdHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const pharmacyId = getPharmacyId(req);
    if (!pharmacyId) {
      throw new AppError('Pharmacy ID is required', 400);
    }

    const { id } = req.params;
    const returnData = await getReturnById(pharmacyId, id);

    res.status(200).json({
      status: 'success',
      data: returnData,
    });
  }
);

export const updateReturnHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const pharmacyId = getPharmacyId(req);
    if (!pharmacyId) {
      throw new AppError('Pharmacy ID is required', 400);
    }

    const { id } = req.params;
    const { status, notes, shipment_id } = req.body;

    const returnData = await updateReturn(pharmacyId, id, {
      status,
      notes,
      shipment_id,
    });

    res.status(200).json({
      status: 'success',
      data: returnData,
    });
  }
);

export const deleteReturnHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const pharmacyId = getPharmacyId(req);
    if (!pharmacyId) {
      throw new AppError('Pharmacy ID is required', 400);
    }

    const { id } = req.params;
    await deleteReturn(pharmacyId, id);

    res.status(204).json({
      status: 'success',
      data: null,
    });
  }
);

export const checkLockStatusHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const returnId = req.params.id;
    
    const lockStatus = await checkReturnLockStatus(returnId);
    
    res.status(200).json({
      status: 'success',
      data: lockStatus,
    });
  }
);

