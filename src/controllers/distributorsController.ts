import { Request, Response, NextFunction } from 'express';
import { getTopDistributors } from '../services/reverseDistributorsService';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';

// Get top distributors for a pharmacy
export const getTopDistributorsHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const pharmacyId = req.pharmacyId;
    
    if (!pharmacyId) {
      throw new AppError('Pharmacy ID is required', 400);
    }

    const topDistributors = await getTopDistributors(pharmacyId);

    res.status(200).json({
      status: 'success',
      data: topDistributors,
    });
  }
);

