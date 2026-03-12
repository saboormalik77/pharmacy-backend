import { Router } from 'express';
import { authenticateAdmin } from '../middleware/adminAuth';
import {
  listDebitMemosHandler,
  getDebitMemoHandler,
  updateDebitMemoHandler,
} from '../controllers/debitMemoController';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Debit Memos
 *     description: Debit memo management and tracking (Module 10)
 */

/**
 * @swagger
 * /api/admin/debit-memos:
 *   get:
 *     summary: List debit memos with filters
 *     tags: [Debit Memos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: batch_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: pharmacy_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: destination
 *         schema: { type: string }
 *       - in: query
 *         name: payment_status
 *         schema: { type: string, enum: [pending, partial, paid, disputed] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by memo number, labeler name, RA number, or pharmacy name
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of debit memos
 */
router.get('/', authenticateAdmin, listDebitMemosHandler);

/**
 * @swagger
 * /api/admin/debit-memos/{id}:
 *   get:
 *     summary: Get debit memo with all line items
 *     tags: [Debit Memos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Debit memo with nested items array
 *       404:
 *         description: Debit memo not found
 */
router.get('/:id', authenticateAdmin, getDebitMemoHandler);

/**
 * @swagger
 * /api/admin/debit-memos/{id}:
 *   patch:
 *     summary: Update debit memo (RA info, payment, shipping)
 *     tags: [Debit Memos]
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
 *               raNumber: { type: string }
 *               raRequestedAt: { type: string, format: date-time }
 *               raReceivedAt: { type: string, format: date-time }
 *               ticklerDate: { type: string, format: date }
 *               baggieManifest: { type: string }
 *               outboundTracking: { type: string }
 *               shippedAt: { type: string, format: date-time }
 *               paymentStatus: { type: string, enum: [pending, partial, paid, disputed] }
 *               amountRequested: { type: number }
 *               amountReceived: { type: number }
 *     responses:
 *       200:
 *         description: Updated debit memo
 *       404:
 *         description: Debit memo not found
 */
router.patch('/:id', authenticateAdmin, updateDebitMemoHandler);

export default router;
