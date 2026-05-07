/**
 * Notification Routes
 * 
 * API endpoints for pharmacy notifications
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getPharmacyNotifications,
  markNotificationAsRead,
  dismissNotification,
  getUnreadNotificationCount,
  checkExpiringProductsAndNotify,
} from '../services/notificationCronService';
import { AppError } from '../utils/appError';

const router = Router();

// All routes require authentication (authenticate middleware also checks pharmacy status)
router.use(authenticate);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get pharmacy notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [unread, read, dismissed, acted_on]
 *         description: Filter by notification status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [expiring_product, monthly_reminder, price_update, return_opportunity]
 *         description: Filter by notification type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of notifications to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: List of notifications
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pharmacyId = req.pharmacyId;
    if (!pharmacyId) {
      throw new AppError('Pharmacy ID not found', 400);
    }

    const { status, type, limit, offset } = req.query;

    const result = await getPharmacyNotifications(pharmacyId, {
      status: status as string,
      type: type as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.json({
      status: 'success',
      data: result.notifications,
      total: result.total,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread notification count
 */
router.get('/unread-count', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pharmacyId = req.pharmacyId;
    if (!pharmacyId) {
      throw new AppError('Pharmacy ID not found', 400);
    }

    const count = await getUnreadNotificationCount(pharmacyId);

    res.json({
      status: 'success',
      count,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 */
router.put('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pharmacyId = req.pharmacyId;
    if (!pharmacyId) {
      throw new AppError('Pharmacy ID not found', 400);
    }

    const { id } = req.params;

    await markNotificationAsRead(pharmacyId, id);

    res.json({
      status: 'success',
      message: 'Notification marked as read',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/notifications/{id}/dismiss:
 *   put:
 *     summary: Dismiss notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification dismissed
 */
router.put('/:id/dismiss', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pharmacyId = req.pharmacyId;
    if (!pharmacyId) {
      throw new AppError('Pharmacy ID not found', 400);
    }

    const { id } = req.params;

    await dismissNotification(pharmacyId, id);

    res.json({
      status: 'success',
      message: 'Notification dismissed',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/notifications/trigger-check:
 *   post:
 *     summary: Manually trigger expiring products check (admin only)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Check completed
 */
router.post('/trigger-check', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Only allow in development mode for testing
    if (process.env.NODE_ENV !== 'development') {
      throw new AppError('This endpoint is only available in development mode', 403);
    }

    console.log('🔔 Manual trigger of expiring products check');
    const result = await checkExpiringProductsAndNotify();

    res.json({
      status: 'success',
      message: 'Expiring products check completed',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

