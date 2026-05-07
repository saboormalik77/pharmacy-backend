import { Router } from 'express';
import { authenticateAdmin, requirePermission } from '../middleware/adminAuth';
import {
  raTrackingDashboardHandler,
  raOutstandingHandler,
  raOverdueHandler,
} from '../controllers/raController';

const router = Router();

router.use(authenticateAdmin);
router.use(requirePermission('warehouse'));

/**
 * @swagger
 * tags:
 *   - name: RA Tracking
 *     description: Return Authorization request tracking and shipment management (Module 11)
 */

/**
 * @swagger
 * /api/admin/ra-tracking:
 *   get:
 *     summary: RA tracking dashboard — all debit memos with RA status
 *     tags: [RA Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ra_status
 *         schema: { type: string, enum: [pending, requested, received, shipped, overdue] }
 *       - in: query
 *         name: destination
 *         schema: { type: string }
 *       - in: query
 *         name: date_from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: date_to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: RA tracking dashboard with summary counts
 */
router.get('/', raTrackingDashboardHandler);

/**
 * @swagger
 * /api/admin/ra-tracking/outstanding:
 *   get:
 *     summary: List outstanding (pending) RA requests
 *     tags: [RA Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Outstanding RA requests
 */
router.get('/outstanding', raOutstandingHandler);

/**
 * @swagger
 * /api/admin/ra-tracking/overdue:
 *   get:
 *     summary: List overdue RA requests (past tickler date)
 *     tags: [RA Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Overdue RA requests
 */
router.get('/overdue', raOverdueHandler);

export default router;
