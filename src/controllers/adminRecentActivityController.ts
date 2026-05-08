import { Request, Response, NextFunction } from 'express';
import { getAdminRecentActivity, markAllActivitiesAsRead, markActivityAsRead } from '../services/adminRecentActivityService';
import { catchAsync } from '../utils/catchAsync';

/**
 * Get admin recent activity
 * Returns activity records for:
 * - Document uploads by pharmacies
 * - Product additions by pharmacies
 * - Pharmacy registrations
 * 
 * Supports filtering by activity type and pharmacy
 * Supports pagination via limit and offset
 * Supports filter parameter: 'notifications' (only registrations) or 'recentactivity' (all)
 * Scoped to authenticated admin's buying group
 */
export const getAdminRecentActivityHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // Get filter parameter: 'notifications' or 'recentactivity'
    const filter = req.query.filter as string | undefined;
    
    // Validate filter if provided
    if (filter && !['notifications', 'recentactivity'].includes(filter)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid filter. Must be "notifications" or "recentactivity"',
      });
      return;
    }

    // Get optional activity type filter
    let activityType = req.query.activityType as string | undefined;
    
    // If filter is 'notifications', override activityType to 'pharmacy_registered'
    if (filter === 'notifications') {
      activityType = 'pharmacy_registered';
    }
    
    // Validate activity type if provided (and not overridden by filter)
    if (activityType && !['document_uploaded', 'product_added', 'pharmacy_registered'].includes(activityType)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid activity type. Must be "document_uploaded", "product_added", or "pharmacy_registered"',
      });
      return;
    }

    // Get pagination parameters
    let limit = parseInt(req.query.limit as string, 10) || 20;
    let offset = parseInt(req.query.offset as string, 10) || 0;
    
    // Validate and cap limit
    if (limit < 1) limit = 1;
    if (limit > 100) limit = 100;
    
    // Validate offset
    if (offset < 0) offset = 0;

    // Get optional pharmacy ID filter
    const pharmacyId = req.query.pharmacyId as string | undefined;

    // Scope to authenticated admin's buying group
    const buyingGroupId = req.adminBuyingGroupId ?? null;

    const activityData = await getAdminRecentActivity(activityType, limit, offset, pharmacyId, filter, buyingGroupId);

    res.status(200).json({
      status: 'success',
      data: activityData,
    });
  }
);

/**
 * Mark all admin activities as read (scoped to buying group)
 */
export const markAllActivitiesAsReadHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // Scope to authenticated admin's buying group
    const buyingGroupId = req.adminBuyingGroupId ?? null;

    const result = await markAllActivitiesAsRead(buyingGroupId);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  }
);

/**
 * Mark a single admin activity as read (with access check)
 */
export const markActivityAsReadHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    // Scope access check to authenticated admin's buying group
    const buyingGroupId = req.adminBuyingGroupId ?? null;

    const result = await markActivityAsRead(id, buyingGroupId);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  }
);

