import { Request, Response, NextFunction } from 'express';
import { verifyAdminToken } from '../services/adminService';
import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';

declare global {
  namespace Express {
    interface Request {
      processorId?: string;
      assignedStoreIds?: string[];
    }
  }
}

/**
 * Authenticate a processor user.
 * Processors log in via the admin login (same JWT), but have role = 'processor'.
 * This middleware verifies the JWT, checks the role, resolves the processor record,
 * and loads their assigned store IDs.
 */
export const authenticateProcessor = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authorization token is required', 401);
    }

    const token = authHeader.substring(7);
    if (!token) {
      throw new AppError('Authorization token is required', 401);
    }

    const adminData = await verifyAdminToken(token);

    if (adminData.role !== 'processor') {
      throw new AppError('Access denied. This endpoint is for processors only.', 403);
    }

    req.adminId = adminData.id;
    req.adminEmail = adminData.email;
    req.adminName = adminData.name;
    req.adminRole = adminData.role;

    if (!supabaseAdmin) {
      throw new AppError('Supabase admin client not configured', 500);
    }

    const { data: processor, error: procError } = await supabaseAdmin
      .from('processors')
      .select('id, status')
      .eq('admin_user_id', adminData.id)
      .single();

    if (procError || !processor) {
      const { data: procByEmail } = await supabaseAdmin
        .from('processors')
        .select('id, status')
        .eq('email', adminData.email)
        .single();

      if (!procByEmail) {
        throw new AppError('No processor profile found for this account', 403);
      }

      if (procByEmail.status !== 'active') {
        throw new AppError('Processor account is inactive', 403);
      }

      req.processorId = procByEmail.id;
    } else {
      if (processor.status !== 'active') {
        throw new AppError('Processor account is inactive', 403);
      }
      req.processorId = processor.id;
    }

    const { data: assignments } = await supabaseAdmin
      .from('processor_store_assignments')
      .select('pharmacy_id')
      .eq('processor_id', req.processorId);

    req.assignedStoreIds = (assignments || []).map((a: any) => a.pharmacy_id);

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Processor authentication failed', 401));
    }
  }
};

/**
 * Middleware that checks whether the processor is assigned to the requested store.
 * Reads pharmacy_id from params, query, or body (in that order).
 * Must be used AFTER authenticateProcessor.
 */
export const checkProcessorStoreAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.adminRole && req.adminRole !== 'processor') {
      return next();
    }

    const pharmacyId =
      req.params.pharmacyId ||
      req.params.pharmacy_id ||
      (req.query.pharmacy_id as string) ||
      (req.query.pharmacyId as string) ||
      req.body?.pharmacyId ||
      req.body?.pharmacy_id;

    if (!pharmacyId) {
      throw new AppError('pharmacy_id is required', 400);
    }

    if (!req.assignedStoreIds || !req.assignedStoreIds.includes(pharmacyId)) {
      throw new AppError('You are not assigned to this store', 403);
    }

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Store access check failed', 403));
    }
  }
};
