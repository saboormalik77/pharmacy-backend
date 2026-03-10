import { Router } from 'express';
import {
  createHandler,
  listHandler,
  getByIdHandler,
  updateHandler,
  pauseHandler,
  resumeHandler,
  completeHandler,
  finalizeHandler,
  deleteHandler,
} from '../controllers/returnTransactionController';
import { authenticateAdmin } from '../middleware/adminAuth';
import { authenticateProcessor } from '../middleware/processorAuth';

const router = Router();

// ============================================================
// Shared middleware:  accept BOTH admin and processor tokens.
// The controller layer does per-endpoint authorisation checks.
// ============================================================
const authenticateAny = async (req: any, res: any, next: any) => {
  // Try processor auth first (it's more specific)
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

// ============================================================
// Swagger tag
// ============================================================
/**
 * @swagger
 * tags:
 *   - name: Return Transactions
 *     description: FCR return transaction lifecycle (Module 3)
 */

// ============================================================
// POST   /api/return-transactions
// ============================================================
/**
 * @swagger
 * /api/return-transactions:
 *   post:
 *     summary: Create a new return transaction
 *     description: |
 *       Creates a return for a selected pharmacy and generates a unique license plate.
 *       If the pharmacy already has an active (in_progress/paused) return, the request
 *       is rejected unless `forceCreate` is true.
 *     tags: [Return Transactions]
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
 *               pharmacyId:
 *                 type: string
 *                 format: uuid
 *               serviceType:
 *                 type: string
 *                 enum: [in_store, self_service, express]
 *                 default: in_store
 *               notes:
 *                 type: string
 *               forceCreate:
 *                 type: boolean
 *                 default: false
 *                 description: Allow creating a second active return for the same pharmacy
 *     responses:
 *       201:
 *         description: Return transaction created
 *       409:
 *         description: Pharmacy already has an active return
 */
router.post('/', authenticateAny, createHandler);

// ============================================================
// GET    /api/return-transactions
// ============================================================
/**
 * @swagger
 * /api/return-transactions:
 *   get:
 *     summary: List return transactions
 *     description: |
 *       Returns a paginated, filterable list.
 *       Processors automatically see only their own returns.
 *     tags: [Return Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: pharmacyId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [in_progress, paused, completed, finalized, received, closed_out] }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by license plate
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of return transactions
 */
router.get('/', authenticateAny, listHandler);

// ============================================================
// GET    /api/return-transactions/:id
// ============================================================
/**
 * @swagger
 * /api/return-transactions/{id}:
 *   get:
 *     summary: Get a single return transaction
 *     tags: [Return Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Return transaction details
 *       404:
 *         description: Not found
 */
router.get('/:id', authenticateAny, getByIdHandler);

// ============================================================
// PATCH  /api/return-transactions/:id
// ============================================================
/**
 * @swagger
 * /api/return-transactions/{id}:
 *   patch:
 *     summary: Update return transaction fields
 *     description: Update tracking, notes, or service type. Cannot update finalized returns.
 *     tags: [Return Transactions]
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
 *               fedexTracking: { type: string }
 *               fedexPickupConfirmation: { type: string }
 *               notes: { type: string }
 *               serviceType: { type: string, enum: [in_store, self_service, express] }
 *     responses:
 *       200:
 *         description: Updated return transaction
 */
router.patch('/:id', authenticateAny, updateHandler);

// ============================================================
// POST   /api/return-transactions/:id/pause
// ============================================================
/**
 * @swagger
 * /api/return-transactions/{id}/pause:
 *   post:
 *     summary: Pause an in-progress return
 *     tags: [Return Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Return paused
 */
router.post('/:id/pause', authenticateAny, pauseHandler);

// ============================================================
// POST   /api/return-transactions/:id/resume
// ============================================================
/**
 * @swagger
 * /api/return-transactions/{id}/resume:
 *   post:
 *     summary: Resume a paused return
 *     tags: [Return Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Return resumed
 */
router.post('/:id/resume', authenticateAny, resumeHandler);

// ============================================================
// POST   /api/return-transactions/:id/complete
// ============================================================
/**
 * @swagger
 * /api/return-transactions/{id}/complete:
 *   post:
 *     summary: Mark return as completed (all items scanned)
 *     tags: [Return Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Return completed
 */
router.post('/:id/complete', authenticateAny, completeHandler);

// ============================================================
// POST   /api/return-transactions/:id/finalize
// ============================================================
/**
 * @swagger
 * /api/return-transactions/{id}/finalize:
 *   post:
 *     summary: Finalize a return — locks it permanently
 *     description: Only completed returns can be finalized. No further edits allowed after this.
 *     tags: [Return Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Return finalized
 */
router.post('/:id/finalize', authenticateAny, finalizeHandler);

// ============================================================
// DELETE  /api/return-transactions/:id
// ============================================================
/**
 * @swagger
 * /api/return-transactions/{id}:
 *   delete:
 *     summary: Delete a return transaction
 *     description: Only allowed for non-finalized, non-received, and non-closed returns.
 *     tags: [Return Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Return deleted
 */
router.delete('/:id', authenticateAny, deleteHandler);

export default router;
