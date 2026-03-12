import { Router } from 'express';
import { authenticateAdmin } from '../middleware/adminAuth';
import {
  listHandler,
  dueHandler,
  statsHandler,
  checkReadyHandler,
  getHandler,
  createHandler,
  updateHandler,
  returnHandler,
} from '../controllers/wineCellarController';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Wine Cellar
 *     description: Aging inventory for items awaiting future return eligibility (Module 7)
 */

// ── Static routes MUST come before /:id ─────────────────────

/**
 * @swagger
 * /api/admin/wine-cellar:
 *   get:
 *     summary: List wine cellar items
 *     tags: [Wine Cellar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: pharmacy_id
 *         schema: { type: string, format: uuid }
 *         description: Filter by pharmacy
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [shelved, ready_to_return, returned, destroyed] }
 *         description: Filter by status
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by NDC, product name, manufacturer, lot number, or baggie barcode
 *       - in: query
 *         name: expected_month
 *         schema: { type: string }
 *         description: Filter by expected returnable month (format YYYY-MM)
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: Paginated list of wine cellar items with summary stats
 */
router.get('/', authenticateAdmin, listHandler);

/**
 * @swagger
 * /api/admin/wine-cellar/due:
 *   get:
 *     summary: Get items due for return this month (ready_to_return status)
 *     tags: [Wine Cellar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: pharmacy_id
 *         schema: { type: string, format: uuid }
 *         description: Filter by pharmacy
 *     responses:
 *       200:
 *         description: Items that are ready to be added back to a return
 */
router.get('/due', authenticateAdmin, dueHandler);

/**
 * @swagger
 * /api/admin/wine-cellar/stats:
 *   get:
 *     summary: Get wine cellar statistics (counts by status + total value)
 *     tags: [Wine Cellar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: pharmacy_id
 *         schema: { type: string, format: uuid }
 *         description: Filter stats by pharmacy
 *     responses:
 *       200:
 *         description: Stats object with totalItems, shelved, readyToReturn, returned, destroyed, totalValue
 */
router.get('/stats', authenticateAdmin, statsHandler);

/**
 * @swagger
 * /api/admin/wine-cellar/check-ready:
 *   post:
 *     summary: Surface items whose expected returnable date has passed
 *     description: |
 *       Finds all shelved items whose expected_returnable_date <= today
 *       and promotes them to ready_to_return status. Can be called manually
 *       or triggered by a cron job on the 1st of each month.
 *     tags: [Wine Cellar]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Number of items surfaced and their details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: object
 *                   properties:
 *                     surfacedCount: { type: integer }
 *                     items: { type: array, items: { type: object } }
 */
router.post('/check-ready', authenticateAdmin, checkReadyHandler);

// ── Parameterized routes ────────────────────────────────────

/**
 * @swagger
 * /api/admin/wine-cellar/{id}:
 *   get:
 *     summary: Get a single wine cellar item
 *     tags: [Wine Cellar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Wine cellar item details
 *       404:
 *         description: Item not found
 */
router.get('/:id', authenticateAdmin, getHandler);

/**
 * @swagger
 * /api/admin/wine-cellar:
 *   post:
 *     summary: Add an item to the wine cellar
 *     description: |
 *       Shelves a pharmaceutical item for future return. Typically called when
 *       the policy engine determines an item is too early to return but will
 *       become eligible later.
 *     tags: [Wine Cellar]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pharmacyId]
 *             properties:
 *               pharmacyId: { type: string, format: uuid }
 *               transactionItemId: { type: string, format: uuid, description: Original return item routed here }
 *               ndc: { type: string }
 *               ndc10: { type: string }
 *               productName: { type: string }
 *               manufacturer: { type: string }
 *               lotNumber: { type: string }
 *               serialNumber: { type: string }
 *               expirationDate: { type: string, format: date }
 *               quantity: { type: integer, default: 1 }
 *               standardPrice: { type: number }
 *               isPartial: { type: boolean, default: false }
 *               partialPercentage: { type: number }
 *               expectedReturnableDate: { type: string, format: date, description: When the item becomes eligible for return }
 *               physicalLocation: { type: string, description: Box label or shelf location }
 *               baggieBarcode: { type: string, description: Barcode on the baggie }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Item added to wine cellar
 *       400:
 *         description: Validation error
 *       404:
 *         description: Pharmacy or transaction item not found
 *       409:
 *         description: Item already in wine cellar
 */
router.post('/', authenticateAdmin, createHandler);

/**
 * @swagger
 * /api/admin/wine-cellar/{id}:
 *   patch:
 *     summary: Update a wine cellar item (location, notes, quantity, price)
 *     description: Cannot update items with status returned or destroyed.
 *     tags: [Wine Cellar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               physicalLocation: { type: string }
 *               baggieBarcode: { type: string }
 *               notes: { type: string }
 *               quantity: { type: integer }
 *               standardPrice: { type: number }
 *               expectedReturnableDate: { type: string, format: date }
 *               isPartial: { type: boolean }
 *               partialPercentage: { type: number }
 *     responses:
 *       200:
 *         description: Updated wine cellar item
 *       400:
 *         description: Cannot update returned/destroyed items
 *       404:
 *         description: Item not found
 */
router.patch('/:id', authenticateAdmin, updateHandler);

/**
 * @swagger
 * /api/admin/wine-cellar/{id}/return:
 *   post:
 *     summary: Mark a wine cellar item as returned (added back to a return transaction)
 *     description: |
 *       Only items with status shelved or ready_to_return can be marked as returned.
 *       Links the item to the return transaction it was added to.
 *     tags: [Wine Cellar]
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
 *             required: [transactionId]
 *             properties:
 *               transactionId: { type: string, format: uuid, description: The return transaction this item is being added to }
 *     responses:
 *       200:
 *         description: Item marked as returned
 *       400:
 *         description: Item cannot be returned from current status
 *       404:
 *         description: Item or transaction not found
 */
router.post('/:id/return', authenticateAdmin, returnHandler);

export default router;
