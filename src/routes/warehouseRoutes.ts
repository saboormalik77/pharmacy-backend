import { Router } from 'express';
import { authenticateAdmin, requirePermission } from '../middleware/adminAuth';
import {
  receiveHandler,
  scanBoxHandler,
  pendingHandler,
  receivedHandler,
  verifyReturnHandler,
  verifyItemHandler,
  reportDiscrepancyHandler,
  listDiscrepanciesHandler,
  startVerificationHandler,
  verifyItemV2Handler,
  addSurplusHandler,
  completeVerificationHandler,
  resolveDiscrepancyHandler,
  verificationSummaryHandler,
  listSurplusHandler,
  listAllSurplusHandler,
} from '../controllers/warehouseController';

const router = Router();

router.use(authenticateAdmin);
router.use(requirePermission('warehouse'));

/**
 * @swagger
 * tags:
 *   - name: Warehouse Receiving
 *     description: Warehouse check-in, verification, and discrepancy handling (Module 9)
 */

/**
 * @swagger
 * /api/admin/warehouse/receive:
 *   post:
 *     summary: Receive a return in the warehouse by scanning FedEx tracking
 *     tags: [Warehouse Receiving]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fedexTracking]
 *             properties:
 *               fedexTracking: { type: string, description: FedEx tracking number }
 *     responses:
 *       200:
 *         description: Return received — transaction details returned
 *       400:
 *         description: Invalid status or already received
 *       404:
 *         description: No return found with that tracking number
 */
router.post('/receive', receiveHandler);

/**
 * @swagger
 * /api/admin/warehouse/scan-box:
 *   post:
 *     summary: Scan a single box tracking number for warehouse receiving
 *     description: |
 *       Scans one tracking number at a time. Matches against any package
 *       tracking number in the return. When ALL packages have been scanned,
 *       the return status automatically changes to 'received'.
 *     tags: [Warehouse Receiving]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [trackingNumber]
 *             properties:
 *               trackingNumber: { type: string, description: Individual box tracking number }
 *     responses:
 *       200:
 *         description: Box scanned — returns scan progress and transaction details
 *       400:
 *         description: Invalid or missing tracking number
 *       404:
 *         description: No finalized return found with that tracking number
 */
router.post('/scan-box', scanBoxHandler);

/**
 * @swagger
 * /api/admin/warehouse/pending:
 *   get:
 *     summary: List returns awaiting warehouse check-in (finalized, not received)
 *     tags: [Warehouse Receiving]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by license plate, tracking, or pharmacy name
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of pending returns
 */
router.get('/pending', pendingHandler);

/**
 * @swagger
 * /api/admin/warehouse/received:
 *   get:
 *     summary: List returns received in warehouse, awaiting verification
 *     tags: [Warehouse Receiving]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by license plate, tracking, or pharmacy name
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of received returns
 */
router.get('/received', receivedHandler);

/**
 * @swagger
 * /api/admin/warehouse/{id}/verify:
 *   post:
 *     summary: Mark a received return as verified
 *     tags: [Warehouse Receiving]
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
 *               piecesReceived: { type: integer, description: Number of pieces/boxes received }
 *               verifiedIntegrity: { type: boolean, default: true }
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Return verified with verification summary
 *       400:
 *         description: Return not in received status
 *       404:
 *         description: Return not found
 */
router.post('/:id/verify', verifyReturnHandler);

/**
 * @swagger
 * /api/admin/warehouse/{id}/items/{itemId}/verify:
 *   patch:
 *     summary: Verify a single item within a received return
 *     tags: [Warehouse Receiving]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Return transaction ID
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Transaction item ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               verified: { type: boolean, default: true }
 *               actualQuantity: { type: integer, description: Actual quantity received }
 *               conditionNotes: { type: string, description: Damage or condition notes }
 *     responses:
 *       200:
 *         description: Item verification updated
 *       400:
 *         description: Return not in received status
 *       404:
 *         description: Transaction or item not found
 */
router.patch('/:id/items/:itemId/verify', verifyItemHandler);

/**
 * @swagger
 * /api/admin/warehouse/{id}/discrepancy:
 *   post:
 *     summary: Report a discrepancy during warehouse verification
 *     tags: [Warehouse Receiving]
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
 *             required: [type]
 *             properties:
 *               type: { type: string, enum: [missing, extra, damaged, wrong_store, other] }
 *               itemId: { type: string, format: uuid, description: Related item ID (optional) }
 *               ndc: { type: string }
 *               productName: { type: string }
 *               expectedQuantity: { type: integer }
 *               actualQuantity: { type: integer }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Discrepancy recorded
 *       400:
 *         description: Invalid type
 *       404:
 *         description: Transaction not found
 */
router.post('/:id/discrepancy', reportDiscrepancyHandler);

/**
 * @swagger
 * /api/admin/warehouse/{id}/discrepancies:
 *   get:
 *     summary: List discrepancies for a return transaction
 *     tags: [Warehouse Receiving]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [open, resolved, dismissed] }
 *     responses:
 *       200:
 *         description: List of discrepancies
 */
router.get('/:id/discrepancies', listDiscrepanciesHandler);


// ─── New Verification Flow (v2) ────────────────────────────

/**
 * @swagger
 * /api/admin/warehouse/surplus:
 *   get:
 *     summary: List all surplus items across all returns
 *     tags: [Warehouse Receiving]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [stored, assigned_to_return, disposed, other] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of all surplus items
 */
router.get('/surplus', listAllSurplusHandler);

/**
 * @swagger
 * /api/admin/warehouse/discrepancies/{discrepancyId}/resolve:
 *   patch:
 *     summary: Resolve or dismiss an open discrepancy
 *     tags: [Warehouse Receiving]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: discrepancyId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [resolution]
 *             properties:
 *               resolution: { type: string, enum: [resolved, dismissed] }
 *               resolutionNotes: { type: string }
 *     responses:
 *       200:
 *         description: Discrepancy resolved
 *       400:
 *         description: Invalid resolution or discrepancy already resolved
 *       404:
 *         description: Discrepancy not found
 */
router.patch('/discrepancies/:discrepancyId/resolve', resolveDiscrepancyHandler);

/**
 * @swagger
 * /api/admin/warehouse/{id}/start-verification:
 *   post:
 *     summary: Start verification for a received return — record physical box count
 *     tags: [Warehouse Receiving]
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
 *               boxCount: { type: integer, description: Number of boxes physically received }
 *     responses:
 *       200:
 *         description: Verification started with box count comparison
 *       400:
 *         description: Invalid box count or return not in received status
 *       404:
 *         description: Return not found
 */
router.post('/:id/start-verification', startVerificationHandler);

/**
 * @swagger
 * /api/admin/warehouse/{id}/items/{itemId}/verify-v2:
 *   patch:
 *     summary: Verify an item with status — correct, damaged, missing, or wrong_item
 *     tags: [Warehouse Receiving]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Return transaction ID
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
 *             required: [verificationStatus]
 *             properties:
 *               verificationStatus: { type: string, enum: [correct, damaged, missing, wrong_item] }
 *               actualQuantity: { type: integer }
 *               conditionNotes: { type: string }
 *     responses:
 *       200:
 *         description: Item verification updated (discrepancy auto-created if not correct)
 *       400:
 *         description: Invalid status or return not in received status
 *       404:
 *         description: Transaction or item not found
 */
router.patch('/:id/items/:itemId/verify-v2', verifyItemV2Handler);

/**
 * @swagger
 * /api/admin/warehouse/{id}/surplus:
 *   post:
 *     summary: Add a surplus item found during verification
 *     tags: [Warehouse Receiving]
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
 *             required: [warehouseLocation]
 *             properties:
 *               ndc: { type: string }
 *               productName: { type: string }
 *               manufacturer: { type: string }
 *               lotNumber: { type: string }
 *               expirationDate: { type: string, format: date }
 *               quantity: { type: integer, default: 1 }
 *               warehouseLocation: { type: string, description: Where in the warehouse this is stored }
 *               condition: { type: string, enum: [good, damaged, unknown], default: good }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Surplus item recorded
 *       400:
 *         description: Missing warehouse location or invalid data
 *       404:
 *         description: Transaction not found
 */
router.post('/:id/surplus', addSurplusHandler);

/**
 * @swagger
 * /api/admin/warehouse/{id}/surplus:
 *   get:
 *     summary: List surplus items for a specific return
 *     tags: [Warehouse Receiving]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [stored, assigned_to_return, disposed, other] }
 *     responses:
 *       200:
 *         description: List of surplus items
 */
router.get('/:id/surplus', listSurplusHandler);

/**
 * @swagger
 * /api/admin/warehouse/{id}/complete-verification:
 *   post:
 *     summary: Complete verification — only correct items proceed, damaged/missing excluded
 *     tags: [Warehouse Receiving]
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
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Verification completed with summary of all items
 *       400:
 *         description: Unverified items remain or return not in received status
 *       404:
 *         description: Return not found
 */
router.post('/:id/complete-verification', completeVerificationHandler);

/**
 * @swagger
 * /api/admin/warehouse/{id}/verification-summary:
 *   get:
 *     summary: Get full verification summary for a return
 *     tags: [Warehouse Receiving]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Full verification summary with items, surplus, discrepancies, and counts
 *       404:
 *         description: Return not found
 */
router.get('/:id/verification-summary', verificationSummaryHandler);

export default router;
