import { Router } from 'express';
import { authenticateAdmin } from '../middleware/adminAuth';
import {
  listBatchesHandler,
  createBatchHandler,
  getBatchHandler,
  assignReturnsToBatchHandler,
  closeBatchHandler,
  submitCardinalHandler,
} from '../controllers/batchController';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Batches
 *     description: Monthly batch management and close-out (Module 10)
 */

/**
 * @swagger
 * /api/admin/batches:
 *   get:
 *     summary: List all monthly batches
 *     tags: [Batches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [open, closed, submitted] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of batches
 */
router.get('/', authenticateAdmin, listBatchesHandler);

/**
 * @swagger
 * /api/admin/batches:
 *   post:
 *     summary: Create a new monthly batch
 *     tags: [Batches]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [batchMonth]
 *             properties:
 *               batchMonth: { type: string, format: date, description: "YYYY-MM-DD (first of month)" }
 *               batchName: { type: string, description: "Custom name, e.g. 'March 2026'" }
 *     responses:
 *       201:
 *         description: Batch created
 *       400:
 *         description: Duplicate month or validation error
 */
router.post('/', authenticateAdmin, createBatchHandler);

/**
 * @swagger
 * /api/admin/batches/{id}:
 *   get:
 *     summary: Get batch details with debit memos and assigned returns
 *     tags: [Batches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Batch with nested debitMemos and returns arrays
 *       404:
 *         description: Batch not found
 */
router.get('/:id', authenticateAdmin, getBatchHandler);

/**
 * @swagger
 * /api/admin/batches/{id}/assign:
 *   post:
 *     summary: Assign return transactions to a batch
 *     tags: [Batches]
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
 *             required: [transactionIds]
 *             properties:
 *               transactionIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Returns assigned. Response includes assigned count.
 *       400:
 *         description: Batch not open or validation error
 */
router.post('/:id/assign', authenticateAdmin, assignReturnsToBatchHandler);

/**
 * @swagger
 * /api/admin/batches/{id}/close:
 *   post:
 *     summary: Close a batch — validates and generates debit memos
 *     tags: [Batches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Batch closed with memosGenerated count
 *       400:
 *         description: TBD items, no-destination items, or batch not open
 */
router.post('/:id/close', authenticateAdmin, closeBatchHandler);

/**
 * @swagger
 * /api/admin/batches/{id}/submit-cardinal:
 *   post:
 *     summary: Mark batch as submitted to Cardinal
 *     tags: [Batches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Batch marked as submitted
 *       400:
 *         description: Batch must be closed first
 */
router.post('/:id/submit-cardinal', authenticateAdmin, submitCardinalHandler);

export default router;
