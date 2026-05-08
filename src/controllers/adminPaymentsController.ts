import { Request, Response, NextFunction } from 'express';
import {
  getPaymentsList,
  getPaymentById,
} from '../services/adminPaymentsService';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';

/**
 * Get list of payments with pagination AND stats
 * GET /api/admin/payments
 */
export const getPaymentsListHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const search = req.query.search as string | undefined;
    const pharmacyId = req.query.pharmacy_id as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (page < 1) {
      throw new AppError('Page must be greater than 0', 400);
    }
    if (limit < 1 || limit > 100) {
      throw new AppError('Limit must be between 1 and 100', 400);
    }

    // Validate date formats if provided
    if (startDate && isNaN(Date.parse(startDate))) {
      throw new AppError('Invalid startDate format. Use YYYY-MM-DD', 400);
    }
    if (endDate && isNaN(Date.parse(endDate))) {
      throw new AppError('Invalid endDate format. Use YYYY-MM-DD', 400);
    }

    const result = await getPaymentsList(search, pharmacyId, page, limit, startDate, endDate);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  }
);

/**
 * Get single payment details
 * GET /api/admin/payments/:id
 */
export const getPaymentByIdHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const paymentId = req.params.id;

    if (!paymentId) {
      throw new AppError('Payment ID is required', 400);
    }

    const result = await getPaymentById(paymentId);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  }
);
