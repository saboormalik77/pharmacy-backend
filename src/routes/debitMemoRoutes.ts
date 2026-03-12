import { Router } from 'express';
import { authenticateAdmin } from '../middleware/adminAuth';
import {
  listDebitMemosHandler,
  getDebitMemoHandler,
  updateDebitMemoHandler,
} from '../controllers/debitMemoController';
import {
  requestRAHandler,
  receiveRAHandler,
  resendRAHandler,
  shipDebitMemoHandler,
  emailPreviewHandler,
} from '../controllers/raController';

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
router.post('/:id/request-ra', authenticateAdmin, requestRAHandler);

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
router.post('/:id/receive-ra', authenticateAdmin, receiveRAHandler);

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
router.post('/:id/resend-ra', authenticateAdmin, resendRAHandler);

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
router.post('/:id/ship', authenticateAdmin, shipDebitMemoHandler);

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
router.get('/:id/email-preview', authenticateAdmin, emailPreviewHandler);

export default router;
