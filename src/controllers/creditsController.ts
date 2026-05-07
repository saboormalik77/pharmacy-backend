import { Request, Response, NextFunction } from 'express';
import { estimateCredits } from '../services/creditsService';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';

export const estimateCreditsHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new AppError('Items array is required', 400);
    }

    const result = await estimateCredits(items);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  }
);

