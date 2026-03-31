import { Router } from 'express';
import { authenticateAdmin, requirePermission } from '../middleware/adminAuth';
import { outboundShipmentsHandler } from '../controllers/raController';

const router = Router();

router.use(authenticateAdmin);
router.use(requirePermission('warehouse'));

/**
 * @swagger
 * tags:
 *   - name: Shipments
 *     description: Outbound shipment tracking (Module 11)
 */

/**
 * @swagger
 * /api/admin/shipments/outbound:
 *   get:
 *     summary: List all outbound shipments (shipped debit memos)
 *     tags: [Shipments, RA Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by memo number, tracking, labeler, pharmacy
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of shipped debit memos
 */
router.get('/outbound', outboundShipmentsHandler);

export default router;
