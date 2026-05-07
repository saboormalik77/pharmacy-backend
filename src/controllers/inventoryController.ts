import { Request, Response, NextFunction } from 'express';
import {
  createInventoryItem,
  getInventoryItems,
  getInventoryItemById,
  updateInventoryItem,
  deleteInventoryItem,
  getInventoryMetrics,
} from '../services/inventoryService';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';

// Helper to get pharmacy_id from request (assuming it's set by auth middleware)
const getPharmacyId = (req: Request): string => {
  // In production, this would come from JWT token or session
  // For now, we'll get it from request body or query params
  return (req.body.pharmacy_id || req.query.pharmacy_id) as string;
};

export const createInventoryItemHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const pharmacyId = getPharmacyId(req);
    if (!pharmacyId) {
      throw new AppError('Pharmacy ID is required', 400);
    }

    const { ndc, product_name, lot_number, expiration_date, quantity, unit, location, boxes, tablets_per_box } = req.body;

    if (!ndc || !product_name || !lot_number || !expiration_date || !quantity) {
      throw new AppError('NDC, product name, lot number, expiration date, and quantity are required', 400);
    }

    const item = await createInventoryItem({
      pharmacy_id: pharmacyId,
      ndc,
      product_name,
      lot_number,
      expiration_date,
      quantity,
      unit,
      location,
      boxes,
      tablets_per_box,
    });

    res.status(201).json({
      status: 'success',
      data: item,
    });
  }
);

export const getInventoryItemsHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const pharmacyId = getPharmacyId(req);
    if (!pharmacyId) {
      throw new AppError('Pharmacy ID is required', 400);
    }

    const status = req.query.status as 'active' | 'expiring_soon' | 'expired' | undefined;
    const search = req.query.search as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

    const result = await getInventoryItems(pharmacyId, {
      status,
      search,
      limit,
      offset,
    });

    res.status(200).json({
      status: 'success',
      data: result.items,
      total: result.total,
    });
  }
);

export const getInventoryItemByIdHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const pharmacyId = getPharmacyId(req);
    if (!pharmacyId) {
      throw new AppError('Pharmacy ID is required', 400);
    }

    const { id } = req.params;
    const item = await getInventoryItemById(pharmacyId, id);

    res.status(200).json({
      status: 'success',
      data: item,
    });
  }
);

export const updateInventoryItemHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const pharmacyId = getPharmacyId(req);
    if (!pharmacyId) {
      throw new AppError('Pharmacy ID is required', 400);
    }

    const { id } = req.params;
    const { lot_number, expiration_date, quantity, location, boxes, tablets_per_box } = req.body;

    const item = await updateInventoryItem(pharmacyId, id, {
      lot_number,
      expiration_date,
      quantity,
      location,
      boxes,
      tablets_per_box,
    });

    res.status(200).json({
      status: 'success',
      data: item,
    });
  }
);

export const deleteInventoryItemHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const pharmacyId = getPharmacyId(req);
    if (!pharmacyId) {
      throw new AppError('Pharmacy ID is required', 400);
    }

    const { id } = req.params;
    await deleteInventoryItem(pharmacyId, id);

    res.status(204).json({
      status: 'success',
      data: null,
    });
  }
);

export const getInventoryMetricsHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const pharmacyId = getPharmacyId(req);
    if (!pharmacyId) {
      throw new AppError('Pharmacy ID is required', 400);
    }

    const metrics = await getInventoryMetrics(pharmacyId);

    res.status(200).json({
      status: 'success',
      data: metrics,
    });
  }
);

