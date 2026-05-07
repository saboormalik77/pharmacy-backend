import { Router } from 'express';
import { authenticateAdmin, requirePermission } from '../middleware/adminAuth';
import {
  listShippedShipmentGroupsHandler,
  listMemosForGroupShippingHandler,
  createShipmentGroupHandler,
  shipmentGroupShippingLabelHandler,
  scheduleShipmentGroupPickupHandler,
  getShipmentGroupDetailsHandler,
  shipGroupHandler,
  createGroupFedexShipmentHandler,
} from '../controllers/shipmentGroupController';

const router = Router();

router.use(authenticateAdmin);
router.use(requirePermission('warehouse'));

/**
 * @swagger
 * tags:
 *   - name: Shipment Groups
 *     description: Multi-memo shipping to same destination
 */

/**
 * @swagger
 * /api/admin/shipment-groups/available-memos:
 *   get:
 *     summary: List memos available for group shipping
 *     tags: [Shipment Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: destination
 *         schema: { type: string }
 *         description: Filter by destination
 *     responses:
 *       200:
 *         description: List of memos ready for grouping
 */
router.get('/shipped', listShippedShipmentGroupsHandler);

router.get('/available-memos', listMemosForGroupShippingHandler);

/**
 * @swagger
 * /api/admin/shipment-groups:
 *   post:
 *     summary: Create a shipment group for multiple memos
 *     tags: [Shipment Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [memoIds]
 *             properties:
 *               memoIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *                 description: Array of debit memo IDs to group
 *               boxCount:
 *                 type: integer
 *                 default: 1
 *                 description: Number of boxes for this shipment
 *               notes:
 *                 type: string
 *                 description: Optional notes for the shipment
 *     responses:
 *       201:
 *         description: Shipment group created successfully
 *       400:
 *         description: Invalid input or memos not eligible for grouping
 */
router.post('/', createShipmentGroupHandler);

router.get('/:id/shipping-label', shipmentGroupShippingLabelHandler);

router.post('/:id/schedule-pickup', scheduleShipmentGroupPickupHandler);

/**
 * @swagger
 * /api/admin/shipment-groups/{id}:
 *   get:
 *     summary: Get shipment group details with memos
 *     tags: [Shipment Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Shipment group details
 *       404:
 *         description: Shipment group not found
 */
router.get('/:id', getShipmentGroupDetailsHandler);

/**
 * @swagger
 * /api/admin/shipment-groups/{id}/ship:
 *   post:
 *     summary: Ship all memos in a group with manual tracking
 *     tags: [Shipment Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [outboundTracking]
 *             properties:
 *               outboundTracking:
 *                 type: string
 *                 description: Tracking number for the shipment
 *               shippedAt:
 *                 type: string
 *                 format: date-time
 *                 description: Shipped timestamp (defaults to now)
 *     responses:
 *       200:
 *         description: Group shipped successfully
 *       400:
 *         description: Invalid input or group already shipped
 */
router.post('/:id/ship', shipGroupHandler);

/**
 * @swagger
 * /api/admin/shipment-groups/{id}/create-fedex-shipment:
 *   post:
 *     summary: Create FedEx shipment for group and ship all memos
 *     tags: [Shipment Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [boxCount]
 *             properties:
 *               boxCount:
 *                 type: integer
 *                 minimum: 1
 *                 description: Number of boxes/packages
 *               packageWeight:
 *                 type: number
 *                 default: 5.0
 *                 description: Weight per package in pounds
 *               serviceType:
 *                 type: string
 *                 default: FEDEX_GROUND
 *                 description: FedEx service type
 *     responses:
 *       200:
 *         description: FedEx shipment created and group shipped
 *       400:
 *         description: Invalid input or configuration error
 */
router.post('/:id/create-fedex-shipment', createGroupFedexShipmentHandler);

export default router;