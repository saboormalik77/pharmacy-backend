import { Router } from 'express';
import { authenticateProcessor } from '../middleware/processorAuth';
import {
  listNotificationsHandler,
  markNotificationReadHandler,
  markAllNotificationsReadHandler,
} from '../controllers/processorNotificationController';

const router = Router();

router.use(authenticateProcessor);

/**
 * @swagger
 * tags:
 *   - name: Processor Notifications
 *     description: Per-processor in-app notifications (service requests, reassignments, etc.)
 */

/**
 * @swagger
 * /api/processors/notifications:
 *   get:
 *     summary: List notifications for the authenticated processor
 *     tags: [Processor Notifications]
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
 * /api/processors/notifications/mark-all-read:
 *   post:
 *     summary: Mark every unread notification for this processor as read
 *     tags: [Processor Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.post('/mark-all-read', markAllNotificationsReadHandler);

/**
 * @swagger
 * /api/processors/notifications/{id}/read:
 *   post:
 *     summary: Mark a single notification as read
 *     tags: [Processor Notifications]
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
