import { Router } from 'express';
import {
  addItemHandler,
  listItemsHandler,
  getItemHandler,
  updateItemHandler,
  deleteItemHandler,
} from '../controllers/returnTransactionItemsController';
import { authenticateAdmin } from '../middleware/adminAuth';
import { authenticateProcessor } from '../middleware/processorAuth';

const router = Router({ mergeParams: true });

// Shared auth: accept both admin and processor tokens
const authenticateAny = async (req: any, res: any, next: any) => {
  try {
    await new Promise<void>((resolve, reject) => {
      authenticateProcessor(req, res, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
    return next();
  } catch {
    // Not a processor — fall through to admin auth
  }
  authenticateAdmin(req, res, next);
};

/**
 * @swagger
 * tags:
 *   - name: Return Transaction Items
 *     description: Product/item management within a return transaction (Module 4)
 */

/**
 * @swagger
 * /api/return-transactions/{transactionId}/items:
 *   post:
 *     summary: Add a scanned/manual item to a return transaction
 *     tags: [Return Transaction Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ndc: { type: string, description: "NDC code (11-digit dashed)" }
 *               ndc10: { type: string }
 *               gtin: { type: string }
 *               proprietaryName: { type: string }
 *               genericName: { type: string }
 *               manufacturer: { type: string }
 *               packageDescription: { type: string }
 *               dosageForm: { type: string }
 *               strength: { type: string }
 *               route: { type: string }
 *               lotNumber: { type: string }
 *               serialNumber: { type: string }
 *               expirationDate: { type: string, format: date }
 *               standardPrice: { type: number }
 *               quantity: { type: integer, default: 1 }
 *               fullPackageSize: { type: integer }
 *               isPartial: { type: boolean, default: false }
 *               partialPercentage: { type: number }
 *               returnStatus: { type: string, enum: [returnable, non_returnable, tbd], default: tbd }
 *               returnReason: { type: string }
 *               destination: { type: string, enum: [inmar, qualanex, pharmalink, other] }
 *               deaSchedule: { type: string }
 *               memo: { type: string }
 *               scanSource: { type: string, enum: [gs1_qr, barcode_1d, manual, ai_parsed], default: manual }
 *     responses:
 *       201:
 *         description: Item added (includes duplicate warning if applicable)
 *       404:
 *         description: Transaction not found
 *       400:
 *         description: Transaction is finalized/closed
 */
router.post('/', authenticateAny, addItemHandler);

/**
 * @swagger
 * /api/return-transactions/{transactionId}/items:
 *   get:
 *     summary: List all items in a return transaction
 *     tags: [Return Transaction Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: returnStatus
 *         schema: { type: string, enum: [returnable, non_returnable, tbd] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by NDC, product name, manufacturer, or lot number
 *     responses:
 *       200:
 *         description: Items list with summary totals
 */
router.get('/', authenticateAny, listItemsHandler);

/**
 * @swagger
 * /api/return-transactions/{transactionId}/items/{itemId}:
 *   get:
 *     summary: Get a single item
 *     tags: [Return Transaction Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Item details
 *       404:
 *         description: Item not found
 */
router.get('/:itemId', authenticateAny, getItemHandler);

/**
 * @swagger
 * /api/return-transactions/{transactionId}/items/{itemId}:
 *   patch:
 *     summary: Update an item
 *     tags: [Return Transaction Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity: { type: integer }
 *               standardPrice: { type: number }
 *               isPartial: { type: boolean }
 *               returnStatus: { type: string, enum: [returnable, non_returnable, tbd] }
 *               returnReason: { type: string }
 *               destination: { type: string }
 *               memo: { type: string }
 *     responses:
 *       200:
 *         description: Updated item
 */
router.patch('/:itemId', authenticateAny, updateItemHandler);

/**
 * @swagger
 * /api/return-transactions/{transactionId}/items/{itemId}:
 *   delete:
 *     summary: Remove an item from the return
 *     tags: [Return Transaction Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Item deleted
 */
router.delete('/:itemId', authenticateAny, deleteItemHandler);

export default router;
