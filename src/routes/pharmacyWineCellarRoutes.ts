import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { catchAsync } from '../utils/catchAsync';
import * as wcService from '../services/wineCellarService';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
    const pharmacyId = req.pharmacyId!;
    const { status, search, expected_month, page, limit } = req.query as Record<string, string>;

    const result = await wcService.listWineCellarItems({
      pharmacyId,
      status: status || undefined,
      search: search || undefined,
      expectedMonth: expected_month || undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });

    res.status(200).json({ status: 'success', data: result });
  })
);

router.get(
  '/stats',
  catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
    const pharmacyId = req.pharmacyId!;
    const result = await wcService.getWineCellarStats(pharmacyId);
    res.status(200).json({ status: 'success', data: result });
  })
);

export default router;
