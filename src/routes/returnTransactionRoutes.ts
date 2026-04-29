import { Router, Request, Response, NextFunction } from 'express';
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
  manifestHtmlHandler,
  manifestDataHandler,
  deaForm222Handler,
  deleteHandler,
  updateFinalizeStepsHandler,
} from '../controllers/returnTransactionController';
import { unassignSingleReturnHandler, downloadPharmacyItemizedReturnHandler } from '../controllers/batchController';
import {
  createShipmentHandler,
  schedulePickupHandler,
  cancelShipmentHandler,
  getLabelsHandler,
  downloadLabelHandler,
} from '../controllers/fedexController';
import {
  generateTrackingBarcodes,
  generateSpecificTrackingBarcode,
} from '../controllers/barcodeController';
import {
  generateJobSheetHandler,
  printJobSheetHandler,
  shippingLabelHandler,
  allShippingLabelsHandler,
} from '../controllers/jobSheetController';
import { authenticateAdmin } from '../middleware/adminAuth';
import { catchAsync } from '../utils/catchAsync';
import * as returnTransactionService from '../services/returnTransactionService';
import { authenticateProcessor } from '../middleware/processorAuth';
import { authenticate as authenticatePharmacy } from '../middleware/auth';

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
// PATCH  /api/return-transactions/:id/finalize-steps
// ============================================================
router.patch('/:id/finalize-steps', authenticateAny, updateFinalizeStepsHandler);

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
// GET    /api/return-transactions/:id/manifest-html — Itemized manifest HTML (print dialog)
// ============================================================
router.get('/:id/manifest-html', authenticateAny, manifestHtmlHandler);

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
// GET    /api/return-transactions/:id/itemized-return — Pharmacy Itemized Return XLSX
// ============================================================
/**
 * @swagger
 * /api/return-transactions/{id}/itemized-return:
 *   get:
 *     summary: Download Pharmacy Itemized Return as XLSX
 *     description: |
 *       Generates a Pharmacy Itemized Return XLSX in the Cardinal Invoice format.
 *       Includes manufacturer summary with CVN, debit memo numbers, amounts, and pieces.
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
 *         description: XLSX file
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema: { type: string, format: binary }
 *       404:
 *         description: Return not found
 */
router.get('/:id/itemized-return', authenticateAny, downloadPharmacyItemizedReturnHandler);

// ============================================================
// POST   /api/return-transactions/:id/create-shipment — FedEx API
// ============================================================
/**
 * @swagger
 * /api/return-transactions/{id}/create-shipment:
 *   post:
 *     summary: Create FedEx shipment via API
 *     description: |
 *       Creates a multi-piece FedEx Ground shipment for this return.
 *       Obtains tracking numbers and shipping labels from FedEx API.
 *       Saves all data to the return transaction.
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
 *               boxCount: { type: integer, description: Number of boxes }
 *               packageWeight: { type: number, description: Weight per box in LB }
 *               serviceType: { type: string, default: FEDEX_GROUND }
 *     responses:
 *       200:
 *         description: Shipment created with tracking numbers and labels
 */
router.post('/:id/create-shipment', authenticateAny, createShipmentHandler);

// ============================================================
// POST   /api/return-transactions/:id/schedule-pickup — FedEx API
// ============================================================
/**
 * @swagger
 * /api/return-transactions/{id}/schedule-pickup:
 *   post:
 *     summary: Schedule FedEx pickup at pharmacy
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
 *               readyTime: { type: string, description: "HH:MM format", default: "09:00" }
 *               closeTime: { type: string, description: "HH:MM format", default: "17:00" }
 *               pickupDate: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Pickup scheduled
 */
router.post('/:id/schedule-pickup', authenticateAny, schedulePickupHandler);

// ============================================================
// DELETE /api/return-transactions/:id/cancel-shipment — FedEx API
// ============================================================
/**
 * @swagger
 * /api/return-transactions/{id}/cancel-shipment:
 *   delete:
 *     summary: Cancel FedEx shipment
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
 *         description: Shipment cancelled
 */
router.delete('/:id/cancel-shipment', authenticateAny, cancelShipmentHandler);

// ============================================================
// GET    /api/return-transactions/:id/labels — Shipping labels
// ============================================================
/**
 * @swagger
 * /api/return-transactions/{id}/labels:
 *   get:
 *     summary: Get shipping label info or download specific label
 *     tags: [Return Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: packageNumber
 *         schema: { type: integer }
 *         description: If provided, returns the PDF label for that package
 *     responses:
 *       200:
 *         description: Label data
 */
router.get('/:id/labels', authenticateAny, getLabelsHandler);

// ============================================================
// GET    /api/return-transactions/:id/labels/:packageNumber/download
// ============================================================
/**
 * @swagger
 * /api/return-transactions/{id}/labels/{packageNumber}/download:
 *   get:
 *     summary: Download a specific package label as PDF
 *     tags: [Return Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: packageNumber
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: PDF label file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/:id/labels/:packageNumber/download', authenticateAny, downloadLabelHandler);

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

// ============================================================
// POST /api/return-transactions/:id/unassign — Unassign from batch
// ============================================================
/**
 * @swagger
 * /api/return-transactions/{id}/unassign:
 *   post:
 *     summary: Unassign return from its current batch
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
 *         description: Return unassigned from batch
 *       400:
 *         description: Return not assigned to batch or batch not open
 *       404:
 *         description: Return not found
 */
router.post('/:id/unassign', authenticateAny, unassignSingleReturnHandler);

// ============================================================
// GET /api/return-transactions/:id/lock-status
// Check if return is locked for editing
// ============================================================
export const checkLockStatusHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const transactionId = req.params.id;
    
    const lockStatus = await returnTransactionService.checkReturnLockStatus(transactionId);
    
    res.status(200).json({
      success: true,
      data: lockStatus,
    });
  }
);

router.get('/:id/lock-status', authenticateAny, checkLockStatusHandler);

// ============================================================
// Barcode Generation Routes
// ============================================================

/**
 * @swagger
 * /return-transactions/{id}/barcodes/tracking:
 *   get:
 *     summary: Generate barcodes for all tracking numbers
 *     tags: [Return Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [zip, single] }
 *         description: Output format (zip for multiple, single for one barcode)
 *     responses:
 *       200:
 *         description: Barcode file(s)
 *         content:
 *           image/png:
 *             description: Single barcode image
 *           application/zip:
 *             description: ZIP file containing multiple barcodes
 */
router.get('/:id/barcodes/tracking', authenticateAny, generateTrackingBarcodes);

/**
 * @swagger
 * /return-transactions/{id}/barcodes/tracking/{trackingNumber}:
 *   get:
 *     summary: Generate barcode for specific tracking number
 *     tags: [Return Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: trackingNumber
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Barcode image
 *         content:
 *           image/png:
 *             description: PNG barcode image
 */
router.get('/:id/barcodes/tracking/:trackingNumber', authenticateAny, generateSpecificTrackingBarcode);

// ============================================================
// Job Sheet Routes
// ============================================================

/**
 * @swagger
 * /return-transactions/{id}/job-sheet:
 *   get:
 *     summary: Generate printable job sheet
 *     tags: [Return Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [html, pdf] }
 *         description: Output format (html for browser printing)
 *     responses:
 *       200:
 *         description: Job sheet HTML or PDF
 *         content:
 *           text/html:
 *             description: HTML job sheet for printing
 *           application/pdf:
 *             description: PDF job sheet (future implementation)
 */
router.get('/:id/job-sheet', authenticateAny, generateJobSheetHandler);

/**
 * @swagger
 * /return-transactions/{id}/job-sheet/print:
 *   get:
 *     summary: Open job sheet in print-ready window
 *     tags: [Return Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: HTML job sheet with auto-print functionality
 *         content:
 *           text/html:
 *             description: Print-ready HTML job sheet
 */
router.get('/:id/job-sheet/print', authenticateAny, printJobSheetHandler);

/**
 * @swagger
 * /return-transactions/{id}/shipping-labels:
 *   get:
 *     summary: Print all shipping labels (FROM/TO + barcode)
 *     tags: [Return Transactions]
 */
router.get('/:id/shipping-labels', authenticateAny, allShippingLabelsHandler);

/**
 * @swagger
 * /return-transactions/{id}/shipping-label/{packageNumber}:
 *   get:
 *     summary: Print shipping label for a specific package
 *     tags: [Return Transactions]
 */
router.get('/:id/shipping-label/:packageNumber', authenticateAny, shippingLabelHandler);

/**
 * @swagger
 * /return-transactions/{id}/unassign:
 *   post:
 *     summary: Unassign return from its current batch
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
 *         description: Return unassigned from batch
 *       400:
 *         description: Return not assigned to batch or batch not open
 *       404:
 *         description: Return not found
 */
router.post('/:id/unassign', authenticateAdmin, unassignSingleReturnHandler);

export default router;
