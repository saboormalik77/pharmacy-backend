import { Request, Response, NextFunction } from 'express';
import {
  resolveTenant,
  extractHostname,
  isLocalDev,
  TenantInfo,
} from '../services/tenantService';
import { AppError } from '../utils/appError';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenant?: TenantInfo | null;
    }
  }
}

/**
 * Resolves the tenant from the request hostname and attaches it to req.tenant.
 *
 * Localhost  -> req.tenant = null (no enforcement)
 * Production -> req.tenant = TenantInfo  (or 403 thrown on unknown domain)
 */
export const resolveTenantMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const hostname = extractHostname(req);

    if (!hostname) {
      throw new AppError('Unable to determine request origin', 400);
    }

    if (isLocalDev(hostname)) {
      req.tenant = null;
      return next();
    }

    // Accept an optional `role` query param sent by the calling portal.
    // When the same hostname is shared by both admin and pharmacy portals,
    // this hint is the only reliable way to resolve the correct portalType.
    const rawRole = req.query?.role;
    const roleHint =
      rawRole === 'admin' || rawRole === 'pharmacy' ? rawRole : undefined;

    const tenant = await resolveTenant(hostname, roleHint);
    req.tenant = tenant;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Tenant resolution failed', 500));
    }
  }
};
