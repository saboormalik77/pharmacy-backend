import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import * as svc from '../services/serviceRequestService';

// =====================================================================
// Small input parsing helpers
// =====================================================================

const parsePagination = (req: Request) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const rawLimit = parseInt(String(req.query.limit ?? '20'), 10) || 20;
  const limit = Math.min(Math.max(1, rawLimit), 100);
  return { page, limit };
};

const pickStatus = (req: Request): string | null => {
  const v = (req.query.status as string | undefined)?.trim();
  if (!v || v === 'all') return null;
  return v;
};

// =====================================================================
// PHARMACY endpoints  (authenticate middleware → req.pharmacyId)
// =====================================================================

// POST /api/on-site-service
export const createHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const pharmacyId = req.pharmacyId;
    if (!pharmacyId) throw new AppError('Not authenticated', 401);

    const {
      requested_date,
      branch_id,
      purpose,
      special_instructions,
    } = req.body || {};

    if (!requested_date) throw new AppError('requested_date is required', 400);

    // Date validation (not in past)
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const reqDate = new Date(String(requested_date));
    if (Number.isNaN(reqDate.getTime())) {
      throw new AppError('Invalid requested_date format (expected YYYY-MM-DD)', 400);
    }
    if (reqDate < today) {
      throw new AppError('requested_date cannot be in the past', 400);
    }

    // Purpose is optional now, but if provided, must be valid
    if (purpose && !['return_pickup', 'training', 'inventory_review', 'destruction_pickup', 'other'].includes(purpose)) {
      throw new AppError('Invalid purpose value', 400);
    }

    if (special_instructions && String(special_instructions).length > 2000) {
      throw new AppError('special_instructions cannot exceed 2000 characters', 400);
    }

    const data = await svc.createServiceRequest({
      pharmacyId,
      branchId: branch_id || null,
      requestedDate: String(requested_date).slice(0, 10),
      purpose: purpose || null,
      specialInstructions: special_instructions || null,
      requestedByUserId: pharmacyId,
    });

    res.status(201).json({ status: 'success', data });
  }
);

// GET /api/on-site-service
export const listPharmacyHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const pharmacyId = req.pharmacyId;
    if (!pharmacyId) throw new AppError('Not authenticated', 401);
    const { page, limit } = parsePagination(req);
    const data = await svc.listPharmacyServiceRequests(pharmacyId, {
      status: pickStatus(req),
      page,
      limit,
    });
    res.status(200).json({ status: 'success', data });
  }
);

// GET /api/on-site-service/:id
export const getPharmacyByIdHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const pharmacyId = req.pharmacyId;
    if (!pharmacyId) throw new AppError('Not authenticated', 401);
    const { id } = req.params;
    await svc.assertPharmacyOwnsRequest(id, pharmacyId);
    const data = await svc.getServiceRequestDetail(id);
    res.status(200).json({ status: 'success', data });
  }
);

// POST /api/on-site-service/:id/cancel
export const cancelPharmacyHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const pharmacyId = req.pharmacyId;
    if (!pharmacyId) throw new AppError('Not authenticated', 401);
    const { id } = req.params;
    const { reason } = req.body || {};
    const data = await svc.cancelPharmacyServiceRequest(id, pharmacyId, reason || null);
    res.status(200).json({ status: 'success', data });
  }
);

// =====================================================================
// PROCESSOR endpoints  (authenticateProcessor middleware → req.processorId)
// =====================================================================

// GET /api/processors/service-requests
export const listProcessorHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const processorId = req.processorId;
    if (!processorId) throw new AppError('Not authenticated as processor', 401);
    const { page, limit } = parsePagination(req);
    const data = await svc.listProcessorServiceRequests(processorId, {
      status: pickStatus(req),
      page,
      limit,
    });
    res.status(200).json({ status: 'success', data });
  }
);

// GET /api/processors/service-requests/:id
export const getProcessorByIdHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const processorId = req.processorId;
    if (!processorId) throw new AppError('Not authenticated as processor', 401);
    const { id } = req.params;
    await svc.assertProcessorAssignedToRequest(id, processorId);
    const data = await svc.getServiceRequestDetail(id);
    res.status(200).json({ status: 'success', data });
  }
);

// POST /api/processors/service-requests/:id/schedule
export const processorScheduleHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const processorId = req.processorId;
    if (!processorId) throw new AppError('Not authenticated as processor', 401);
    const { id } = req.params;
    const { scheduled_date, notes } = req.body || {};
    if (!scheduled_date) throw new AppError('scheduled_date is required', 400);
    const data = await svc.claimServiceRequest({
      requestId: id,
      processorId,
      action: 'schedule',
      scheduledDate: String(scheduled_date).slice(0, 10),
      notes: notes || null,
    });
    res.status(200).json({ status: 'success', data });
  }
);

// POST /api/processors/service-requests/:id/complete
export const processorCompleteHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const processorId = req.processorId;
    if (!processorId) throw new AppError('Not authenticated as processor', 401);
    const { id } = req.params;
    const { notes } = req.body || {};
    const data = await svc.claimServiceRequest({
      requestId: id,
      processorId,
      action: 'complete',
      notes: notes || null,
    });
    res.status(200).json({ status: 'success', data });
  }
);

// POST /api/processors/service-requests/:id/cancel
export const processorCancelHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const processorId = req.processorId;
    if (!processorId) throw new AppError('Not authenticated as processor', 401);
    const { id } = req.params;
    const { reason } = req.body || {};
    const data = await svc.claimServiceRequest({
      requestId: id,
      processorId,
      action: 'cancel',
      notes: reason || null,
    });
    res.status(200).json({ status: 'success', data });
  }
);

// POST /api/processors/service-requests/:id/release
export const processorReleaseHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const processorId = req.processorId;
    if (!processorId) throw new AppError('Not authenticated as processor', 401);
    const { id } = req.params;
    const data = await svc.claimServiceRequest({
      requestId: id,
      processorId,
      action: 'release',
      notes: null,
    });
    res.status(200).json({ status: 'success', data });
  }
);

// =====================================================================
// ADMIN endpoints  (authenticateAdmin middleware → req.adminBuyingGroupId)
// =====================================================================

// GET /api/admin/service-requests
export const listAdminHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { page, limit } = parsePagination(req);
    const buyingGroupId = req.adminBuyingGroupId ?? null;
    const data = await svc.listAdminServiceRequests(buyingGroupId, {
      status: pickStatus(req),
      search: (req.query.search as string) || null,
      page,
      limit,
    });
    res.status(200).json({ status: 'success', data });
  }
);

// GET /api/admin/service-requests/:id
export const getAdminByIdHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const data = await svc.getServiceRequestDetail(id);
    res.status(200).json({ status: 'success', data });
  }
);

// POST /api/admin/service-requests/:id/reassign
export const adminReassignHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const { processor_ids } = req.body || {};
    if (!Array.isArray(processor_ids)) {
      throw new AppError('processor_ids must be an array of UUIDs', 400);
    }
    const data = await svc.adminReassignServiceRequest(id, processor_ids);
    res.status(200).json({ status: 'success', data });
  }
);
