import { Request, Response, NextFunction } from 'express';
import { getAdminDashboardStats } from '../services/adminDashboardService';
import { catchAsync } from '../utils/catchAsync';

/**
 * Get admin dashboard statistics
 * Returns:
 * - Total Pharmacies (with % change vs last month)
 * - Active Distributors (with % change vs last month)
 * - Returns Value (with % change vs last month)
 * - Returns Value Trend (graph data)
 * - All pharmacy names with IDs
 * 
 * When pharmacyId is provided, returns graph data for that pharmacy only
 * Other stats remain overall (not filtered by pharmacy)
 */
export const getAdminDashboardHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // Get optional pharmacy ID for filtering graph data
    const pharmacyId = req.query.pharmacyId as string | undefined;

    // Get period type (monthly or yearly, default monthly)
    const periodTypeParam = (req.query.periodType as string) || 'monthly';
    const periodType = periodTypeParam === 'yearly' ? 'yearly' : 'monthly';

    // Get periods parameter (default 12, max 60 for monthly, max 10 for yearly)
    let periods = parseInt(req.query.periods as string, 10) || 12;
    if (periods < 1) periods = 1;
    if (periodType === 'yearly') {
      if (periods > 10) periods = 10; // Max 10 years
    } else {
      if (periods > 60) periods = 60; // Max 60 months (5 years)
    }

    // Scope all data to the authenticated admin's buying group (null = MainAdmin, sees everything)
    const buyingGroupId = req.adminBuyingGroupId ?? undefined;

    const dashboardData = await getAdminDashboardStats(pharmacyId, periodType, periods, buyingGroupId);

    res.status(200).json({
      status: 'success',
      data: dashboardData,
    });
  }
);

