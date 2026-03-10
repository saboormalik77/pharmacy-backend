import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import * as processorsService from '../services/processorsService';

// ============================================================
// GET /api/admin/processors — List all processors
// ============================================================
export const getProcessorsHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const {
      page = '1',
      limit = '20',
      search,
      status,
    } = req.query;

    const result = await processorsService.getProcessors(
      parseInt(page as string, 10) || 1,
      Math.min(parseInt(limit as string, 10) || 20, 100),
      search as string | undefined,
      status as string | undefined
    );

    res.status(200).json({
      status: 'success',
      data: result,
    });
  }
);

// ============================================================
// GET /api/admin/processors/:id — Get single processor
// ============================================================
export const getProcessorByIdHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;

    if (!id) {
      throw new AppError('Processor ID is required', 400);
    }

    const processor = await processorsService.getProcessorById(id);

    res.status(200).json({
      status: 'success',
      data: { processor },
    });
  }
);

// ============================================================
// POST /api/admin/processors — Create processor (+ admin login)
// ============================================================
export const createProcessorHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { name, email, password, phone, notes } = req.body;

    if (!name) {
      throw new AppError('Processor name is required', 400);
    }

    if (!email) {
      throw new AppError('Processor email is required (used for login)', 400);
    }

    if (!password || password.length < 8) {
      throw new AppError('Password is required and must be at least 8 characters', 400);
    }

    const processor = await processorsService.createProcessor({
      name,
      email,
      password,
      phone,
      notes,
    });

    res.status(201).json({
      status: 'success',
      message: 'Processor created successfully. They can now log in to the admin panel with the provided email and password.',
      data: { processor },
    });
  }
);

// ============================================================
// PATCH /api/admin/processors/:id — Update processor
// ============================================================
export const updateProcessorHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const { name, email, phone, status, notes } = req.body;

    if (!id) {
      throw new AppError('Processor ID is required', 400);
    }

    const processor = await processorsService.updateProcessor(id, {
      name,
      email,
      phone,
      status,
      notes,
    });

    res.status(200).json({
      status: 'success',
      message: 'Processor updated successfully',
      data: { processor },
    });
  }
);

// ============================================================
// DELETE /api/admin/processors/:id — Deactivate (soft-delete)
// ============================================================
export const deleteProcessorHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;

    if (!id) {
      throw new AppError('Processor ID is required', 400);
    }

    await processorsService.deactivateProcessor(id);

    res.status(200).json({
      status: 'success',
      message: 'Processor deactivated successfully',
    });
  }
);

// ============================================================
// GET /api/admin/processors/:id/stores — Get assigned stores
// ============================================================
export const getProcessorStoresHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;

    if (!id) {
      throw new AppError('Processor ID is required', 400);
    }

    const stores = await processorsService.getProcessorStores(id);

    res.status(200).json({
      status: 'success',
      data: { stores, total: stores.length },
    });
  }
);

// ============================================================
// POST /api/admin/processors/:id/assign-stores — Assign stores
// ============================================================
export const assignStoresHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const { pharmacyIds } = req.body;

    if (!id) {
      throw new AppError('Processor ID is required', 400);
    }

    if (!pharmacyIds || !Array.isArray(pharmacyIds) || pharmacyIds.length === 0) {
      throw new AppError('pharmacyIds must be a non-empty array of UUIDs', 400);
    }

    const result = await processorsService.assignStoresToProcessor(id, pharmacyIds);

    res.status(200).json({
      status: 'success',
      message: `Assigned ${result.assigned} store(s), skipped ${result.skipped} already-assigned`,
      data: result,
    });
  }
);

// ============================================================
// GET /api/processors/my-stores — Processor's own assigned stores
// ============================================================
export const getMyStoresHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const processorId = req.processorId;

    if (!processorId) {
      throw new AppError('Processor ID not found on request. Are you authenticated as a processor?', 401);
    }

    const stores = await processorsService.getMyStores(processorId);

    res.status(200).json({
      status: 'success',
      data: { stores, total: stores.length },
    });
  }
);

// ============================================================
// DELETE /api/admin/processors/:id/stores/:pharmacyId — Unassign
// ============================================================
export const unassignStoreHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id, pharmacyId } = req.params;

    if (!id || !pharmacyId) {
      throw new AppError('Processor ID and Pharmacy ID are required', 400);
    }

    await processorsService.unassignStoreFromProcessor(id, pharmacyId);

    res.status(200).json({
      status: 'success',
      message: 'Store unassigned from processor',
    });
  }
);
