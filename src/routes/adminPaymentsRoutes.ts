import { Router } from 'express';
import {
  getPaymentsListHandler,
  getPaymentByIdHandler,
} from '../controllers/adminPaymentsController';
import { authenticateAdmin, requirePermission } from '../middleware/adminAuth';

const router = Router();

// Apply admin authentication middleware to all routes
router.use(authenticateAdmin);
router.use(requirePermission('payments'));

/**
 * @swagger
 * components:
 *   schemas:
 *     PaymentListItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Document UUID
 *         paymentId:
 *           type: string
 *           description: Generated payment ID (PAY-xxxxxxxx)
 *           example: "PAY-12345678"
 *         pharmacyId:
 *           type: string
 *           format: uuid
 *         pharmacyName:
 *           type: string
 *           example: "HealthFirst Pharmacy"
 *         pharmacyEmail:
 *           type: string
 *           nullable: true
 *         amount:
 *           type: number
 *           description: Total credit amount
 *           example: 15850.00
 *         date:
 *           type: string
 *           format: date
 *           description: Report date or upload date
 *         uploadedAt:
 *           type: string
 *           format: date-time
 *         reportDate:
 *           type: string
 *           format: date
 *           nullable: true
 *         method:
 *           type: string
 *           description: Human-readable source (Manual Upload, Email Forward, etc.)
 *           example: "Manual Upload"
 *         source:
 *           type: string
 *           description: Raw source value
 *           enum: [manual_upload, email_forward, portal_fetch, api]
 *         transactionId:
 *           type: string
 *           description: Generated transaction ID
 *           example: "TXN-123456789abc"
 *         distributorId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         distributorName:
 *           type: string
 *           example: "Return Solutions, Inc."
 *         distributorCode:
 *           type: string
 *           nullable: true
 *         fileName:
 *           type: string
 *         fileType:
 *           type: string
 *           nullable: true
 *         fileUrl:
 *           type: string
 *           nullable: true
 *         extractedItems:
 *           type: integer
 *         processedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *     PaymentsStats:
 *       type: object
 *       properties:
 *         totalPayments:
 *           type: integer
 *           example: 150
 *         totalAmount:
 *           type: number
 *           example: 125430.50
 *     PaginationInfo:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 10
 *         totalCount:
 *           type: integer
 *           example: 50
 *         totalPages:
 *           type: integer
 *           example: 5
 *         hasNextPage:
 *           type: boolean
 *         hasPreviousPage:
 *           type: boolean
 */

/**
 * @swagger
 * /api/admin/payments:
 *   get:
 *     summary: Get list of payments with pagination and stats
 *     description: |
 *       Fetches payments from uploaded documents where total_credit_amount > 0.
 *       Supports search by pharmacy name, document ID, or distributor name.
 *       Results are ordered by upload date (newest first).
 *       **Stats are included in the response** (totalPayments, totalAmount).
 *     tags: [Admin Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by pharmacy name, document ID, or distributor name
 *       - in: query
 *         name: pharmacy_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by pharmacy ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter payments from this date onwards. Format YYYY-MM-DD
 *         example: "2025-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter payments up to this date. Format YYYY-MM-DD
 *         example: "2025-12-31"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Payments list with stats retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     payments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PaymentListItem'
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationInfo'
 *                     stats:
 *                       $ref: '#/components/schemas/PaymentsStats'
 *       400:
 *         description: Bad request - invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', getPaymentsListHandler);

/**
 * @swagger
 * /api/admin/payments/{id}:
 *   get:
 *     summary: Get single payment details
 *     description: Returns full details of a payment including pharmacy and distributor information.
 *     tags: [Admin Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Payment ID (document UUID)
 *     responses:
 *       200:
 *         description: Payment details retrieved successfully
 *       400:
 *         description: Bad request - missing ID
 *       404:
 *         description: Payment not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', getPaymentByIdHandler);

export default router;
