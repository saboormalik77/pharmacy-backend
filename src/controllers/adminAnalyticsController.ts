import { Request, Response, NextFunction } from 'express';
import { getAnalytics } from '../services/adminAnalyticsService';
import { catchAsync } from '../utils/catchAsync';

/**
 * Get all analytics data for admin dashboard
 * GET /api/admin/analytics
 *
 * Scoped to the authenticated admin's buying group:
 * - MainAdmin (req.adminBuyingGroupId === null) sees global analytics.
 * - Buying-group admins (super_admin / manager / reviewer / support with a
 *   buying_group_id) only see analytics for pharmacies owned by their group
 *   (pharmacy.created_by = req.adminBuyingGroupId).
 */
export const getAnalyticsHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const buyingGroupId = req.adminBuyingGroupId ?? null;

    const result = await getAnalytics(buyingGroupId);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  }
);

