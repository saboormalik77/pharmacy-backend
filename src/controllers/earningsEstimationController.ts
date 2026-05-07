import { Request, Response, NextFunction } from 'express';
import { getEarningsEstimation } from '../services/earningsEstimationService';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';

/**
 * Get earnings estimation and optimization analysis for a pharmacy
 * Analyzes return reports and compares with best available distributor prices
 * 
 * NOTE: pharmacy_id is obtained from the authenticated user's token (req.pharmacyId)
 * This endpoint requires authentication via Bearer token
 */
export const getEarningsEstimationHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // Get pharmacy ID from authenticated user token (set by auth middleware)
    const pharmacyId = req.pharmacyId;
    
    if (!pharmacyId) {
      throw new AppError('Pharmacy ID is required. Please authenticate with a valid token.', 400);
    }

    const periodType = (req.query.period_type as 'monthly' | 'yearly') || 'monthly';
    const periods = parseInt(req.query.periods as string) || 12;

    // Validate period type
    if (periodType !== 'monthly' && periodType !== 'yearly') {
      throw new AppError('period_type must be either "monthly" or "yearly"', 400);
    }

    // Validate periods
    if (periods < 1 || periods > 60) {
      throw new AppError('periods must be between 1 and 60', 400);
    }

    console.log(`📊 Getting earnings estimation for pharmacy ${pharmacyId} (${periodType}, ${periods} periods)`);

    const estimationData = await getEarningsEstimation(pharmacyId, periodType, periods);

    res.status(200).json({
      status: 'success',
      message: 'Earnings estimation retrieved successfully',
      data: estimationData,
    });
  }
);

