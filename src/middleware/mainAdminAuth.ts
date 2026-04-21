import { Request, Response, NextFunction } from 'express';
import { verifyMainAdminToken } from '../services/mainAdminService';
import { AppError } from '../utils/appError';

declare global {
  namespace Express {
    interface Request {
      mainAdminId?: string;
      mainAdminEmail?: string;
      mainAdminName?: string;
      mainAdminRole?: string;
      mainAdminPermissions?: string[];
    }
  }
}

export const authenticateMainAdmin = async (
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

    const adminData = await verifyMainAdminToken(token);

    req.mainAdminId = adminData.id;
    req.mainAdminEmail = adminData.email;
    req.mainAdminName = adminData.name;
    req.mainAdminRole = adminData.role;
    req.mainAdminPermissions = adminData.permissions;

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Authentication failed', 401));
    }
  }
};
