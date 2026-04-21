import { Request, Response, NextFunction } from 'express';
import { verifyAdminToken, ALL_ADMIN_PERMISSIONS } from '../services/adminService';
import { verifyMainAdminToken } from '../services/mainAdminService';
import { AppError } from '../utils/appError';

// Extend Express Request type to include admin info
declare global {
  namespace Express {
    interface Request {
      adminId?: string;
      adminEmail?: string;
      adminName?: string;
      adminRole?: string;
      adminPermissions?: string[];
      // Buying group ID this admin belongs to.
      // - super_admin (buying-group owner): equals adminId
      // - sub-admin / processor: their owning buying-group's id
      // - MainAdmin / localhost fallback: null (global scope, no filter)
      adminBuyingGroupId?: string | null;
    }
  }
}

/**
 * Authentication middleware for admin routes
 * Verifies JWT tokens from admin login OR main admin login
 */
export const authenticateAdmin = async (
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

    try {
      const adminData = await verifyAdminToken(token);
      req.adminId = adminData.id;
      req.adminEmail = adminData.email;
      req.adminName = adminData.name;
      req.adminRole = adminData.role;
      req.adminPermissions = adminData.permissions;
      req.adminBuyingGroupId = adminData.buyingGroupId;
      return next();
    } catch {
      // If admin token fails, try main admin token
    }

    try {
      const mainAdminData = await verifyMainAdminToken(token);
      req.adminId = mainAdminData.id;
      req.adminEmail = mainAdminData.email;
      req.adminName = mainAdminData.name;
      req.adminRole = 'super_admin';
      req.adminPermissions = [...ALL_ADMIN_PERMISSIONS];
      // MainAdmin is a platform-wide operator; no buying group scope.
      req.adminBuyingGroupId = null;
      return next();
    } catch {
      throw new AppError('Authentication failed', 401);
    }
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Authentication failed', 401));
    }
  }
};

/**
 * Permission-checking middleware factory.
 * super_admin always passes; other roles must have the permission in their list.
 */
export const requirePermission = (permission: string) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (req.adminRole === 'super_admin') return next();

    const perms: string[] = req.adminPermissions || [];
    if (!perms.includes(permission)) {
      return next(new AppError('You do not have permission to access this resource', 403));
    }
    next();
  };
};

