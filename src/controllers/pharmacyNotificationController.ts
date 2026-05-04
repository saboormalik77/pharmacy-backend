import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import {
  listPharmacyNotifications,
  markPharmacyNotificationRead,
  markAllPharmacyNotificationsRead,
} from '../services/pharmacyNotificationService';

/**
 * GET /api/pharmacy/notifications
 * Query params:
 *   - limit:        1..100 (default 20)
 *   - offset:       >= 0    (default 0)
 *   - only_unread:  'true' | 'false' (default 'false')
 *
 * Every response is scoped to the authenticated pharmacy. There is no way
 * for one pharmacy to read another pharmacy's notifications.
 */
export const listNotificationsHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const pharmacyId = req.pharmacyId;
    if (!pharmacyId) throw new AppError('Not authenticated', 401);

    const limit = parseInt(String(req.query.limit ?? '20'), 10) || 20;
    const offset = parseInt(String(req.query.offset ?? '0'), 10) || 0;
    const onlyUnread = String(req.query.only_unread ?? '').toLowerCase() === 'true';

    const result = await listPharmacyNotifications(pharmacyId, {
      limit,
      offset,
      onlyUnread,
    });

    res.status(200).json({
      status: 'success',
      data: result,
    });
  }
);

/**
 * POST /api/pharmacy/notifications/:id/read
 * Marks a single notification as read. Enforces ownership via RPC.
 */
export const markNotificationReadHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const pharmacyId = req.pharmacyId;
    if (!pharmacyId) throw new AppError('Not authenticated', 401);

    const { id } = req.params;
    if (!id) throw new AppError('notification id is required', 400);

    const result = await markPharmacyNotificationRead(id, pharmacyId);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  }
);

/**
 * POST /api/pharmacy/notifications/mark-all-read
 */
export const markAllNotificationsReadHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const pharmacyId = req.pharmacyId;
    if (!pharmacyId) throw new AppError('Not authenticated', 401);

    const result = await markAllPharmacyNotificationsRead(pharmacyId);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  }
);