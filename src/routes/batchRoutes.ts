import { Router } from 'express';
import { authenticateAdmin, requirePermission } from '../middleware/adminAuth';
import {
  listBatchesHandler,
  createBatchHandler,
  getBatchHandler,
  assignReturnsToBatchHandler,
  closeBatchHandler,
  generateBatchMemosHandler,
  submitCardinalHandler,
  fixBatchDestinationsHandler,
  deleteBatchHandler,
  unassignReturnsFromBatchHandler,
  unassignSingleReturnHandler,
  getBatchPermissionsHandler,
  getBatchWorkflowHandler,
  completeBatchWorkflowStepHandler,
  listUsedBatchMonthsHandler,
} from '../controllers/batchController';

const router = Router();
router.use(authenticateAdmin);
router.use(requirePermission('warehouse'));

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
 *       - in: query
 *         name: allMemosShipped
 *         description: If true, only batches that have debit memos and where every memo has ra_status shipped
 *         schema: { type: boolean, default: false }
 *       - in: query
 *         name: excludeCompletePharmacyPayouts
 *         description: If true, exclude batches where every pharmacy with debit memos already has a non-failed pharmacy_payments row for that batch
 *         schema: { type: boolean, default: false }
 *       - in: query
 *         name: allDebitMemosPaid
 *         description: With excludeCompletePharmacyPayouts, requires at least one pharmacy whose memos in the batch are all paid/partial and who has no payout record (not whole-batch paid)
 *         schema: { type: boolean, default: false }
 *     responses:
 *       200:
 *         description: Paginated list of batches
 */
router.get('/', listBatchesHandler);

/**
 * @swagger
 * /api/admin/batches/used-months:
 *   get:
 *     summary: List calendar months (YYYY-MM) that already have a batch
 *     tags: [Batches]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of YYYY-MM strings
 */
router.get('/used-months', listUsedBatchMonthsHandler);

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
router.post('/', createBatchHandler);

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
router.get('/:id', getBatchHandler);

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
router.post('/:id/assign', assignReturnsToBatchHandler);

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
router.post('/:id/close', closeBatchHandler);
router.post('/:id/generate-memos', generateBatchMemosHandler);

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
router.post('/:id/submit-cardinal', submitCardinalHandler);

/**
 * @swagger
 * /api/admin/batches/{id}/fix-destinations:
 *   post:
 *     summary: Fix missing destinations for returnable items in batch
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
 *         description: Destinations fixed successfully
 *       404:
 *         description: Batch not found
 */
router.post('/:id/fix-destinations', fixBatchDestinationsHandler);

// ============================================================
// Batch Management Routes (FCR-32)
// ============================================================

/**
 * @swagger
 * /api/admin/batches/{id}:
 *   delete:
 *     summary: Delete a batch (only if open and no debit memos)
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
 *         description: Batch deleted successfully
 *       400:
 *         description: Cannot delete batch (not open or has debit memos)
 *       404:
 *         description: Batch not found
 */
router.delete('/:id', deleteBatchHandler);

/**
 * @swagger
 * /api/admin/batches/{id}/unassign:
 *   post:
 *     summary: Unassign returns from a batch
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
 *         description: Returns unassigned successfully
 *       400:
 *         description: Batch not open or validation error
 *       404:
 *         description: Batch not found
 */
router.post('/:id/unassign', unassignReturnsFromBatchHandler);

/**
 * @swagger
 * /api/admin/batches/{id}/permissions:
 *   get:
 *     summary: Get batch permissions (what operations are allowed)
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
 *         description: Batch permissions
 *       404:
 *         description: Batch not found
 */
router.get('/:id/permissions', getBatchPermissionsHandler);

// ============================================================
// Batch Workflow Routes (FCR-36)
// ============================================================

/**
 * @swagger
 * /api/admin/batches/{id}/workflow:
 *   get:
 *     summary: Get post-closeout workflow state for a batch
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
 *         description: Workflow state with boolean flags for each step
 */
router.get('/:id/workflow', getBatchWorkflowHandler);

/**
 * @swagger
 * /api/admin/batches/{id}/workflow/complete:
 *   post:
 *     summary: Mark a workflow step as complete
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
 *             required: [step]
 *             properties:
 *               step:
 *                 type: string
 *                 enum: [cardinal_generated, cardinal_sent, debit_memos_created, ra_requested]
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Step marked complete, returns updated workflow state
 */
router.post('/:id/workflow/complete', completeBatchWorkflowStepHandler);

export default router;
