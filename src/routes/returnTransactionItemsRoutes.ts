import { Router, Request, Response, NextFunction } from 'express';
import {
  addItemHandler,
  listItemsHandler,
  getItemHandler,
  updateItemHandler,
  deleteItemHandler,
  resolveItemHandler,
  moveToWineCellarHandler,
} from '../controllers/returnTransactionItemsController';
import { catchAsync } from '../utils/catchAsync';
import * as itemsService from '../services/returnTransactionItemsService';
import { authenticateAdmin } from '../middleware/adminAuth';
import { authenticateProcessor } from '../middleware/processorAuth';
import { authenticate as authenticatePharmacy } from '../middleware/auth';

const router = Router({ mergeParams: true });

// Shared auth: accept admin, processor, and pharmacy tokens
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
    // Not a processor — try pharmacy auth
  }
  
  try {
    await new Promise<void>((resolve, reject) => {
      authenticatePharmacy(req, res, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
    return next();
  } catch {
    // Not a pharmacy — fall through to admin auth
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
 * /api/return-transactions/{transactionId}/items/{itemId}/resolve:
 *   patch:
 *     summary: Resolve a TBD item (manual classification after research)
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [new_status]
 *             properties:
 *               new_status: { type: string, enum: [returnable, non_returnable] }
 *               reason: { type: string, description: "Reason for non-returnable classification" }
 *               destination: { type: string, enum: [inmar, qualanex, pharmalink, other] }
 *               memo: { type: string, description: "Staff notes on the resolution" }
 *     responses:
 *       200:
 *         description: Item resolved successfully
 *       400:
 *         description: Invalid status or item already classified
 *       404:
 *         description: Item not found
 */
router.patch('/:itemId/resolve', authenticateAny, resolveItemHandler);

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

/**
 * @swagger
 * /api/return-transactions/{transactionId}/items/{itemId}/wine-cellar:
 *   post:
 *     summary: Move an existing item to wine cellar
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [expectedReturnableDate]
 *             properties:
 *               expectedReturnableDate:
 *                 type: string
 *                 format: date
 *               physicalLocation:
 *                 type: string
 *               baggieBarcode:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Item moved to wine cellar
 */
router.post('/:itemId/wine-cellar', authenticateAny, moveToWineCellarHandler);

// ============================================================
// GET /api/return-transactions/:id/items/lock-status
// Check if return is locked for editing
// ============================================================
export const checkLockStatusHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const transactionId = req.params.id;
    
    const lockStatus = await itemsService.checkReturnLockStatus(transactionId);
    
    res.status(200).json({
      success: true,
      data: lockStatus,
    });
  }
);

router.get('/lock-status', authenticateAny, checkLockStatusHandler);

export default router;
