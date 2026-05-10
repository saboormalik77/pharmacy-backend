import { Router } from 'express';
import { authenticateAdmin } from '../middleware/adminAuth';
import { authenticate } from '../middleware/auth';
import {
  calculatePayoutHandler,
  listPaymentsHandler,
  createPaymentHandler,
  paymentSummaryHandler,
  getPaymentHandler,
  updatePaymentHandler,
  myPaymentsHandler,
  checkPdfHandler,
  generateCheckNumberHandler,
} from '../controllers/pharmacyPaymentController';

// ============================================================
// Admin routes: /api/admin/pharmacy-payments
// ============================================================

const adminRouter = Router();

/**
 * @swagger
 * tags:
 *   - name: Pharmacy Payments
 *     description: Pharmacy payout management (Module 13)
 */

/**
 * @swagger
 * /api/admin/pharmacy-payments/summary:
 *   get:
 *     summary: Get payment summary grouped by pharmacy
 *     tags: [Pharmacy Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by pharmacy name, GPO, or store number
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated pharmacy payment summary
 */
adminRouter.get('/summary', authenticateAdmin, paymentSummaryHandler);

/**
 * @swagger
 * /api/admin/pharmacy-payments/calculate:
 *   post:
 *     summary: Calculate payout for a pharmacy and batch
 *     tags: [Pharmacy Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pharmacyId, batchId]
 *             properties:
 *               pharmacyId: { type: string, format: uuid }
 *               batchId: { type: string, format: uuid }
 *               companyFeePercent: { type: number, default: 27.0, description: "Company retained fee %" }
 *               gpoSharePercent: { type: number, default: 0.0, description: "GPO share %" }
 *     responses:
 *       200:
 *         description: Calculated payout breakdown
 */
adminRouter.post('/calculate', authenticateAdmin, calculatePayoutHandler);

/**
 * @swagger
 * /api/admin/pharmacy-payments/generate-check-number:
 *   post:
 *     summary: Generate a unique check number
 *     tags: [Pharmacy Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Generated check number
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: object
 *                   properties:
 *                     checkNumber: { type: string, example: "216461" }
 */
adminRouter.post('/generate-check-number', authenticateAdmin, generateCheckNumberHandler);

/**
 * @swagger
 * /api/admin/pharmacy-payments:
 *   get:
 *     summary: List all pharmacy payments
 *     tags: [Pharmacy Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, processing, paid, failed, disputed] }
 *       - in: query
 *         name: pharmacy
 *         schema: { type: string }
 *         description: Filter by pharmacy name or store number
 *       - in: query
 *         name: batch_id
 *         schema: { type: string, format: uuid }
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
 *         description: Paginated list of pharmacy payments with summary
 */
adminRouter.get('/', authenticateAdmin, listPaymentsHandler);

/**
 * @swagger
 * /api/admin/pharmacy-payments:
 *   post:
 *     summary: Create a pharmacy payment record
 *     tags: [Pharmacy Payments]
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
 *               pharmacyId: { type: string, format: uuid }
 *               batchId: { type: string, format: uuid }
 *               totalCreditReceived: { type: number }
 *               companyFeePercent: { type: number, default: 27.0 }
 *               companyFee: { type: number }
 *               gpoShare: { type: number }
 *               pharmacyPayout: { type: number }
 *               paymentMethod: { type: string, enum: [wire, check, zelle, cash] }
 *               paymentReference: { type: string }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Payment record created
 *       409:
 *         description: Duplicate payment for pharmacy+batch
 */
adminRouter.post('/', authenticateAdmin, createPaymentHandler);

/**
 * @swagger
 * /api/admin/pharmacy-payments/{id}:
 *   get:
 *     summary: Get payment details with associated debit memos
 *     tags: [Pharmacy Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Payment details with debit memos
 *       404:
 *         description: Payment not found
 */
adminRouter.get('/:id', authenticateAdmin, getPaymentHandler);

/**
 * @swagger
 * /api/admin/pharmacy-payments/{id}:
 *   patch:
 *     summary: Update a pharmacy payment record
 *     tags: [Pharmacy Payments]
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
 *             properties:
 *               status: { type: string, enum: [pending, processing, paid, failed, disputed] }
 *               paymentMethod: { type: string, enum: [wire, check, zelle, cash] }
 *               paymentReference: { type: string }
 *               paidAt: { type: string, format: date-time }
 *               notes: { type: string }
 *               companyFee: { type: number }
 *               companyFeePercent: { type: number }
 *               gpoShare: { type: number }
 *               pharmacyPayout: { type: number }
 *               totalCreditReceived: { type: number }
 *     responses:
 *       200:
 *         description: Payment updated
 *       404:
 *         description: Payment not found
 */
adminRouter.patch('/:id', authenticateAdmin, updatePaymentHandler);

/**
 * @swagger
 * /api/admin/pharmacy-payments/check-pdf/{checkNumber}:
 *   get:
 *     summary: Generate check PDF for admin users
 *     tags: [Pharmacy Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: checkNumber
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Check not found
 */
adminRouter.get('/check-pdf/:checkNumber', authenticateAdmin, checkPdfHandler);


// ============================================================
// Pharmacy-facing routes: /api/pharmacy-payments
// ============================================================

const pharmacyRouter = Router();

/**
 * @swagger
 * /api/pharmacy-payments/my-payments:
 *   get:
 *     summary: Get authenticated pharmacy's own payment history
 *     tags: [Pharmacy Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, processing, paid, failed, disputed] }
 *       - in: query
 *         name: dateRange
 *         schema: { type: string, enum: [this_month, last_month, this_quarter, last_quarter, this_year, last_12_months, custom] }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Pharmacy's payment history with summary totals
 */
pharmacyRouter.get('/my-payments', authenticate, myPaymentsHandler);

/**
 * @swagger
 * /api/pharmacy-payments/check-pdf/{checkNumber}:
 *   get:
 *     summary: Generate and download check PDF
 *     tags: [Pharmacy Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: checkNumber
 *         required: true
 *         schema: { type: string }
 *         description: The check number to generate PDF for
 *     responses:
 *       200:
 *         description: Check PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Check not found
 */
pharmacyRouter.get('/check-pdf/:checkNumber', authenticate, checkPdfHandler);

export { adminRouter as pharmacyPaymentAdminRouter, pharmacyRouter as pharmacyPaymentRouter };
