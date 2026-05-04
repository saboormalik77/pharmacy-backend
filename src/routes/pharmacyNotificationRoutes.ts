import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  listNotificationsHandler,
  markNotificationReadHandler,
  markAllNotificationsReadHandler,
} from '../controllers/pharmacyNotificationController';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Pharmacy Notifications
 *     description: Per-pharmacy in-app notifications (service request updates, etc.)
 */

/**
 * @swagger
 * /api/pharmacy/notifications:
 *   get:
 *     summary: List notifications for the authenticated pharmacy
 *     tags: [Pharmacy Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, minimum: 0, default: 0 }
 *       - in: query
 *         name: only_unread
 *         schema: { type: boolean, default: false }
 *     responses:
 *       200: { description: OK }
 */
router.get('/', listNotificationsHandler);

/**
 * @swagger
 * /api/pharmacy/notifications/mark-all-read:
 *   post:
 *     summary: Mark every unread notification for this pharmacy as read
 *     tags: [Pharmacy Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.post('/mark-all-read', markAllNotificationsReadHandler);

/**
 * @swagger
 * /api/pharmacy/notifications/{id}/read:
 *   post:
 *     summary: Mark a single notification as read
 *     tags: [Pharmacy Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 */
router.post('/:id/read', markNotificationReadHandler);

export default router;