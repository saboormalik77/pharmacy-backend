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
  manifestHandler,
  manifestDataHandler,
  deaForm222Handler,
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
 *     description: |
 *       Validates and finalizes a completed return:
 *       - Status must be 'completed'
 *       - No TBD items remaining (all classified)
 *       - FedEx tracking required (pass in body or set via PATCH first)
 *       - Sets status to 'finalized', sets finalized_at timestamp
 *       - No further edits allowed after this
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
 *               fedexTracking:
 *                 type: string
 *                 description: FedEx tracking number (can also be set via PATCH before finalizing)
 *               boxCount:
 *                 type: integer
 *                 description: Number of boxes in the shipment
 *     responses:
 *       200:
 *         description: Return finalized successfully
 *       400:
 *         description: Validation failed (TBD items, missing tracking, wrong status)
 */
router.post('/:id/finalize', authenticateAny, finalizeHandler);

// ============================================================
// GET    /api/return-transactions/:id/manifest — PDF manifest
// ============================================================
/**
 * @swagger
 * /api/return-transactions/{id}/manifest:
 *   get:
 *     summary: Download return manifest as PDF
 *     description: |
 *       Generates and returns a PDF manifest containing:
 *       pharmacy info, license plate, FedEx tracking,
 *       returnable items list, non-returnable items list,
 *       and summary totals. Also marks manifest_generated_at.
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
 *         description: PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Return transaction not found
 */
router.get('/:id/manifest', authenticateAny, manifestHandler);

// ============================================================
// GET    /api/return-transactions/:id/manifest-data — Raw manifest JSON
// ============================================================
/**
 * @swagger
 * /api/return-transactions/{id}/manifest-data:
 *   get:
 *     summary: Get manifest data as JSON
 *     description: |
 *       Returns the raw manifest data (pharmacy info, items, totals)
 *       without generating a PDF. Useful for frontend preview.
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
 *         description: Manifest data
 *       404:
 *         description: Return transaction not found
 */
router.get('/:id/manifest-data', authenticateAny, manifestDataHandler);

// ============================================================
// GET    /api/return-transactions/:id/dea-form-222 — DEA Form 222 PDF
// ============================================================
/**
 * @swagger
 * /api/return-transactions/{id}/dea-form-222:
 *   get:
 *     summary: Download DEA Form 222 as PDF
 *     description: |
 *       Generates a DEA Form 222 PDF for Schedule II controlled substances.
 *       Only includes items where dea_form_222_required = true.
 *       Returns 404 if no CII items exist in the return.
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
 *         description: PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: No CII items found or return not found
 */
router.get('/:id/dea-form-222', authenticateAny, deaForm222Handler);

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
