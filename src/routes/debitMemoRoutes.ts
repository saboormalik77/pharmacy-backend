import { Router } from 'express';
import { authenticateAdmin, requirePermission } from '../middleware/adminAuth';
import { upload } from '../middleware/upload';
import {
  listDebitMemosHandler,
  listDebitMemosGroupedByReturnHandler,
  getDebitMemoHandler,
  updateDebitMemoHandler,
  downloadDebitMemoPdfHandler,
  downloadDebitMemoSummaryHandler,
  analyzeCreditMemoHandler,
} from '../controllers/debitMemoController';
import {
  requestRAHandler,
  receiveRAHandler,
  resendRAHandler,
  shipDebitMemoHandler,
  createDebitMemoFedexShipmentHandler,
  scheduleDebitMemoPickupHandler,
  emailPreviewHandler,
  debitMemoShippingLabelHandler,
} from '../controllers/raController';
import {
  listUnpaidHandler,
  listUnpaidGroupedByReturnHandler,
  listPaidGroupedByReturnHandler,
  recordPaymentHandler,
  updatePaymentHandler,
  sendReminderHandler,
  downloadCreditMemoHandler,
} from '../controllers/paymentTrackingController';

const router = Router();

router.use(authenticateAdmin);
router.use(requirePermission('warehouse'));

/**
 * @swagger
 * tags:
 *   - name: Debit Memos
 *     description: Debit memo management and tracking (Module 10)
 *   - name: Payment Tracking
 *     description: Manufacturer payment tracking (Module 12)
 */

/**
 * @swagger
 * /api/admin/debit-memos/unpaid:
 *   get:
 *     summary: List unpaid debit memos with outstanding amounts
 *     tags: [Payment Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: manufacturer
 *         schema: { type: string }
 *         description: Filter by manufacturer (labeler name or ID)
 *       - in: query
 *         name: destination
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by memo number, labeler name, or pharmacy name
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of unpaid debit memos with summary
 */
router.get('/unpaid', listUnpaidHandler);

/**
 * @swagger
 * /api/admin/debit-memos/unpaid/grouped-by-return:
 *   get:
 *     summary: List unpaid debit memos grouped by return transaction
 *     tags: [Payment Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: manufacturer
 *         schema: { type: string }
 *       - in: query
 *         name: destination
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Unpaid memos grouped by return transaction
 */
router.get('/unpaid/grouped-by-return', listUnpaidGroupedByReturnHandler);

/**
 * @swagger
 * /api/admin/debit-memos/paid/grouped-by-return:
 *   get:
 *     summary: List paid debit memos grouped by return transaction
 *     tags: [Payment Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: destination
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Paid memos grouped by return transaction
 */
router.get('/paid/grouped-by-return', listPaidGroupedByReturnHandler);

router.get('/:id/credit-memo/download', downloadCreditMemoHandler);

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
router.get('/', listDebitMemosHandler);

/**
 * @swagger
 * /api/admin/debit-memos/grouped-by-return:
 *   get:
 *     summary: List debit memos grouped by return transaction (return-based pagination)
 *     tags: [Debit Memos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: destination
 *         schema: { type: string }
 *       - in: query
 *         name: payment_status
 *         schema: { type: string, enum: [pending, partial, paid, disputed] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by memo number, labeler name, RA number, license plate, or pharmacy name
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *         description: Number of returns per page
 *     responses:
 *       200:
 *         description: Returns with their nested debit memos, paginated by return
 */
router.get('/grouped-by-return', listDebitMemosGroupedByReturnHandler);

/**
 * @swagger
 * /api/admin/debit-memos/summary/{returnId}/{batchId}:
 *   get:
 *     summary: Download debit memo summary PDF for a return transaction
 *     tags: [Debit Memos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: returnId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Return transaction ID
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Batch ID
 *     responses:
 *       200:
 *         description: Debit memo summary PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Return transaction or batch not found
 */
router.get('/summary/:returnId/:batchId', downloadDebitMemoSummaryHandler);

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
router.get('/:id', getDebitMemoHandler);

/**
 * @swagger
 * /api/admin/debit-memos/{id}/download:
 *   get:
 *     summary: Download debit memo as PDF
 *     tags: [Debit Memos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Debit memo ID
 *     responses:
 *       200:
 *         description: Debit memo PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Debit memo not found
 */
router.get('/:id/download', downloadDebitMemoPdfHandler);

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
router.patch('/:id', updateDebitMemoHandler);

/**
 * @swagger
 * /api/admin/debit-memos/{id}/request-ra:
 *   post:
 *     summary: Send RA request for a debit memo
 *     tags: [Debit Memos, RA Tracking]
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
 *               sentBy: { type: string, description: Name/email of the admin sending the request }
 *               emailOverride: { type: string, description: Override destination email }
 *     responses:
 *       200:
 *         description: RA request sent, returns memo + request log
 *       400:
 *         description: No email found for labeler
 *       404:
 *         description: Debit memo not found
 */
router.post('/:id/request-ra', requestRAHandler);

/**
 * @swagger
 * /api/admin/debit-memos/{id}/receive-ra:
 *   post:
 *     summary: Record RA received for a debit memo
 *     tags: [Debit Memos, RA Tracking]
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
 *             required: [raNumber]
 *             properties:
 *               raNumber: { type: string, description: The RA number received }
 *               pdfUrl: { type: string, description: URL of the RA PDF document }
 *     responses:
 *       200:
 *         description: RA received recorded
 *       400:
 *         description: raNumber is required
 *       404:
 *         description: Debit memo not found
 */
router.post('/:id/receive-ra', receiveRAHandler);

/**
 * @swagger
 * /api/admin/debit-memos/{id}/resend-ra:
 *   post:
 *     summary: Resend/remind RA request for a debit memo
 *     tags: [Debit Memos, RA Tracking]
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
 *               sentBy: { type: string }
 *               emailOverride: { type: string }
 *     responses:
 *       200:
 *         description: RA reminder sent
 */
router.post('/:id/resend-ra', resendRAHandler);

/**
 * @swagger
 * /api/admin/debit-memos/{id}/ship:
 *   post:
 *     summary: Record outbound shipment to destination
 *     tags: [Debit Memos, RA Tracking]
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
 *             required: [outboundTracking]
 *             properties:
 *               outboundTracking: { type: string, description: FedEx/UPS tracking number }
 *               shippedAt: { type: string, format: date-time, description: Ship date (defaults to now) }
 *     responses:
 *       200:
 *         description: Shipment recorded
 *       400:
 *         description: Tracking number required / RA number required first
 */
router.post('/:id/ship', shipDebitMemoHandler);

/**
 * @swagger
 * /api/admin/debit-memos/{id}/create-fedex-shipment:
 *   post:
 *     summary: Create FedEx shipment from warehouse to reverse distributor
 *     tags: [Debit Memos, Shipping]
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
 *               boxCount: { type: integer, default: 1 }
 *               packageWeight: { type: number, default: 10 }
 *               serviceType: { type: string, default: FEDEX_GROUND }
 *     responses:
 *       200:
 *         description: FedEx shipment created with tracking and labels
 *       400:
 *         description: Missing RA number or address issues
 */
router.post('/:id/create-fedex-shipment', createDebitMemoFedexShipmentHandler);

/**
 * @swagger
 * /api/admin/debit-memos/{id}/schedule-pickup:
 *   post:
 *     summary: Schedule FedEx pickup for a debit memo shipment
 *     tags: [Debit Memos, Shipping]
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
 *               readyTime: { type: string, default: '09:00' }
 *               closeTime: { type: string, default: '17:00' }
 *               pickupDate: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Pickup scheduled
 *       400:
 *         description: No shipment exists yet
 */
router.post('/:id/schedule-pickup', scheduleDebitMemoPickupHandler);

/**
 * @swagger
 * /api/admin/debit-memos/{id}/analyze-credit-memo:
 *   post:
 *     summary: Analyze credit memo PDF and calculate matched amount
 *     tags: [Payment Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Debit memo ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [creditMemo]
 *             properties:
 *               creditMemo: { type: string, format: binary, description: Credit memo PDF file }
 *     responses:
 *       200:
 *         description: Analysis result with total matched amount
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalAmount: { type: number, nullable: true }
 *                     confidence: { type: number }
 *                     analysisStatus: { type: string }
 *                     manufacturerName: { type: string, nullable: true }
 *                     lineItemsCount: { type: number }
 *                     errorMessage: { type: string, nullable: true }
 *       400:
 *         description: Credit memo file is required
 *       404:
 *         description: Debit memo not found
 */
router.post('/:id/analyze-credit-memo', upload.single('creditMemo') as any, analyzeCreditMemoHandler);

/**
 * @swagger
 * /api/admin/debit-memos/{id}/record-payment:
 *   post:
 *     summary: Record payment received for a debit memo
 *     tags: [Payment Tracking]
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
 *             required: [amountReceived]
 *             properties:
 *               amountReceived: { type: number, description: Amount received from manufacturer }
 *               paymentDate: { type: string, format: date-time, description: Date payment was received (defaults to now) }
 *               reference: { type: string, description: Check/wire reference number }
 *               notes: { type: string, description: Payment notes }
 *     responses:
 *       200:
 *         description: Payment recorded, returns updated debit memo
 *       400:
 *         description: Invalid amount
 *       404:
 *         description: Debit memo not found
 */
router.post('/:id/record-payment', upload.single('creditMemo') as any, recordPaymentHandler);

/**
 * @swagger
 * /api/admin/debit-memos/{id}/update-payment:
 *   patch:
 *     summary: Update payment record for a debit memo
 *     tags: [Payment Tracking]
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [amountReceived]
 *             properties:
 *               amountReceived: { type: number, description: Amount received from manufacturer }
 *               paymentDate: { type: string, format: date-time, description: Date payment was received }
 *               reference: { type: string, description: Check/wire reference number }
 *               notes: { type: string, description: Payment notes }
 *               creditMemo: { type: string, format: binary, description: New credit memo PDF (optional) }
 *     responses:
 *       200:
 *         description: Payment updated, returns updated debit memo
 *       400:
 *         description: Invalid amount
 *       404:
 *         description: Debit memo not found
 */
router.patch('/:id/update-payment', upload.single('creditMemo') as any, updatePaymentHandler);

/**
 * @swagger
 * /api/admin/debit-memos/{id}/send-reminder:
 *   post:
 *     summary: Send payment reminder email to manufacturer
 *     tags: [Payment Tracking]
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
 *               sentBy: { type: string, description: Name/email of the admin sending }
 *               emailOverride: { type: string, description: Override destination email }
 *     responses:
 *       200:
 *         description: Reminder sent successfully
 *       400:
 *         description: Memo already paid or no email found
 *       404:
 *         description: Debit memo not found
 */
router.post('/:id/send-reminder', sendReminderHandler);

/**
 * @swagger
 * /api/admin/debit-memos/{id}/email-preview:
 *   get:
 *     summary: Preview RA request or reminder email content
 *     tags: [Debit Memos, RA Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [request, reminder], default: request }
 *       - in: query
 *         name: emailOverride
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Email template with to, subject, body, item details
 */
router.get('/:id/email-preview', emailPreviewHandler);

router.get('/:id/shipping-label', debitMemoShippingLabelHandler);

export default router;
