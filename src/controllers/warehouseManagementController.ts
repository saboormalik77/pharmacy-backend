import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import * as warehouseManagementService from '../services/warehouseManagementService';

// ============================================================
// Extended Request interface for admin authentication
// ============================================================
interface AdminRequest extends Request {
  adminId?: string;
  adminEmail?: string;
  adminName?: string;
  adminRole?: string;
  adminBuyingGroupId?: string | null;
}

// ============================================================
// GET /api/admin/warehouse-management - Get all warehouses (MainAdmin only)
// ============================================================
export const getWarehousesHandler = catchAsync(
  async (req: AdminRequest, res: Response, _next: NextFunction) => {
    // Restrict to MainAdmin only
    if (req.adminBuyingGroupId !== null) {
      throw new AppError('Access denied. Warehouse management is restricted to MainAdmin.', 403);
    }

    const warehouses = await warehouseManagementService.getAllWarehouses();

    res.status(200).json({
      status: 'success',
      data: {
        warehouses,
      },
    });
  }
);

// ============================================================
// GET /api/admin/warehouse-management/default - Get default warehouse
// ============================================================
export const getDefaultWarehouseHandler = catchAsync(
  async (req: AdminRequest, res: Response, _next: NextFunction) => {
    // Allow any authenticated admin to get default warehouse for shipment operations
    const warehouse = await warehouseManagementService.getDefaultWarehouse();

    if (!warehouse) {
      throw new AppError('No default warehouse found', 404);
    }

    res.status(200).json({
      status: 'success',
      data: {
        warehouse,
      },
    });
  }
);

// ============================================================
// POST /api/admin/warehouse-management - Create new warehouse (MainAdmin only)
// ============================================================
export const createWarehouseHandler = catchAsync(
  async (req: AdminRequest, res: Response, _next: NextFunction) => {
    // Restrict to MainAdmin only
    if (req.adminBuyingGroupId !== null) {
      throw new AppError('Access denied. Warehouse management is restricted to MainAdmin.', 403);
    }

    const {
      name,
      contactName,
      phone,
      street,
      city,
      state,
      zip,
      country,
      isActive,
      isDefault,
    } = req.body;

    if (!name || name.trim() === '') {
      throw new AppError('Warehouse name is required', 400);
    }

    const warehouse = await warehouseManagementService.createWarehouse(
      {
        name: name.trim(),
        contactName,
        phone,
        street,
        city,
        state,
        zip,
        country,
        isActive,
        isDefault,
      },
      req.adminId
    );

    res.status(201).json({
      status: 'success',
      message: 'Warehouse created successfully',
      data: {
        warehouse,
      },
    });
  }
);

// ============================================================
// PATCH /api/admin/warehouse-management/:id - Update warehouse (MainAdmin only)
// ============================================================
export const updateWarehouseHandler = catchAsync(
  async (req: AdminRequest, res: Response, _next: NextFunction) => {
    // Restrict to MainAdmin only
    if (req.adminBuyingGroupId !== null) {
      throw new AppError('Access denied. Warehouse management is restricted to MainAdmin.', 403);
    }

    const { id } = req.params;
    const {
      name,
      contactName,
      phone,
      street,
      city,
      state,
      zip,
      country,
      isActive,
      isDefault,
    } = req.body;

    if (!id) {
      throw new AppError('Warehouse ID is required', 400);
    }

    const warehouse = await warehouseManagementService.updateWarehouse(
      id,
      {
        name,
        contactName,
        phone,
        street,
        city,
        state,
        zip,
        country,
        isActive,
        isDefault,
      },
      req.adminId
    );

    res.status(200).json({
      status: 'success',
      message: 'Warehouse updated successfully',
      data: {
        warehouse,
      },
    });
  }
);

// ============================================================
// DELETE /api/admin/warehouse-management/:id - Delete warehouse (MainAdmin only)
// ============================================================
export const deleteWarehouseHandler = catchAsync(
  async (req: AdminRequest, res: Response, _next: NextFunction) => {
    // Restrict to MainAdmin only
    if (req.adminBuyingGroupId !== null) {
      throw new AppError('Access denied. Warehouse management is restricted to MainAdmin.', 403);
    }

    const { id } = req.params;
    const { hardDelete } = req.query;

    if (!id) {
      throw new AppError('Warehouse ID is required', 400);
    }

    await warehouseManagementService.deleteWarehouse(id, hardDelete === 'true');

    res.status(200).json({
      status: 'success',
      message: 'Warehouse deleted successfully',
    });
  }
);