import { Router } from 'express';
import { getDashboardSummaryHandler, getHistoricalEarningsHandler, getReturnStatsHandler, getReturnsListHandler, getReturnDetailHandler } from '../controllers/dashboardController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * @swagger
 * /api/dashboard/summary:
 *   get:
 *     summary: Get dashboard summary statistics for authenticated pharmacy
 *     description: Returns dashboard summary with total pharmacy added products count, top distributor count, and package statistics. Top distributors count includes all active distributors (matching the top distributors API which returns all active distributors regardless of documents). Package statistics are calculated using the same logic as /api/optimization/custom-packages. Pharmacy ID is automatically determined from authentication token.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard summary data
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
 *                     totalPharmacyAddedProducts:
 *                       type: number
 *                       example: 15
 *                       description: Total number of products added by the pharmacy (from product_list_items)
 *                     topDistributorCount:
 *                       type: number
 *                       example: 4
 *                       description: Count of all active distributors (all active distributors in the system, not filtered by pharmacy documents)
 *                     totalPackages:
 *                       type: number
 *                       example: 10
 *                       description: Total number of custom packages (delivered + non-delivered)
 *                     deliveredPackages:
 *                       type: number
 *                       example: 6
 *                       description: Number of packages with status true (delivered)
 *                     nonDeliveredPackages:
 *                       type: number
 *                       example: 4
 *                       description: Number of packages with status false (non-delivered)
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/summary', getDashboardSummaryHandler);

/**
 * @swagger
 * /api/dashboard/earnings/history:
 *   get:
 *     summary: Get historical earnings graph data for authenticated pharmacy
 *     description: |
 *       Returns monthly or yearly earnings data from return reports over the specified period.
 *       Data is sourced from uploaded_documents.total_credit_amount grouped by report_date.
 *       
 *       Use this endpoint to display:
 *       - Line/bar chart of monthly or yearly earnings over time
 *       - Total earnings summary
 *       - Earnings breakdown by distributor
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: periodType
 *         schema:
 *           type: string
 *           enum: [monthly, yearly]
 *           default: monthly
 *         description: Group earnings by month or year (default monthly)
 *         example: monthly
 *       - in: query
 *         name: periods
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 60
 *           default: 12
 *         description: Number of periods to fetch (default 12, max 60 for monthly, max 10 for yearly)
 *         example: 12
 *     responses:
 *       200:
 *         description: Historical earnings data for graphing
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
 *                     periodEarnings:
 *                       type: array
 *                       description: Array of period earnings data points for the graph
 *                       items:
 *                         type: object
 *                         properties:
 *                           period:
 *                             type: string
 *                             example: "2025-12"
 *                             description: Period identifier (YYYY-MM for monthly, YYYY for yearly)
 *                           label:
 *                             type: string
 *                             example: "December 2025"
 *                             description: Human-readable period label
 *                           earnings:
 *                             type: number
 *                             example: 12500.50
 *                             description: Total earnings for this period
 *                           documentsCount:
 *                             type: number
 *                             example: 15
 *                             description: Number of return reports for this period
 *                     totalEarnings:
 *                       type: number
 *                       example: 157500.25
 *                       description: Total earnings over the entire period
 *                     averagePeriodEarnings:
 *                       type: number
 *                       example: 13125.02
 *                       description: Average earnings per period (only counting periods with earnings)
 *                     totalDocuments:
 *                       type: number
 *                       example: 180
 *                       description: Total number of return reports in the period
 *                     byDistributor:
 *                       type: array
 *                       description: Earnings breakdown by distributor (sorted by earnings desc)
 *                       items:
 *                         type: object
 *                         properties:
 *                           distributorId:
 *                             type: string
 *                             format: uuid
 *                             example: "2da2ca2e-c3c9-4ffa-9a06-a226631a9b4f"
 *                           distributorName:
 *                             type: string
 *                             example: "Return Solutions, Inc."
 *                           totalEarnings:
 *                             type: number
 *                             example: 85000.00
 *                           documentsCount:
 *                             type: number
 *                             example: 100
 *                     period:
 *                       type: object
 *                       description: The date range and type of the query
 *                       properties:
 *                         startDate:
 *                           type: string
 *                           format: date
 *                           example: "2024-12-01"
 *                         endDate:
 *                           type: string
 *                           format: date
 *                           example: "2025-12-31"
 *                         type:
 *                           type: string
 *                           enum: [monthly, yearly]
 *                           example: "monthly"
 *                         periods:
 *                           type: number
 *                           example: 12
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/earnings/history', getHistoricalEarningsHandler);

/**
 * @swagger
 * /api/dashboard/return-stats:
 *   get:
 *     summary: Get return statistics for authenticated pharmacy
 *     description: |
 *       Returns comprehensive return statistics for a pharmacy including:
 *       - Total returns count (all returns for this pharmacy, whether created by pharmacy itself or by processor on its behalf)
 *       - Breakdown of pharmacy-created vs processor-created returns
 *       - Total return value (sum of returnable + non-returnable values)
 *       - Total credits (sum of totalCreditReceived from pharmacy_payments table - same as Credits tab)
 *       
 *       Note: In the processor flow, processors log into a separate portal, select a pharmacy they're assigned to, 
 *       and create returns on behalf of that pharmacy. These processor-created returns have pharmacy_id = selected pharmacy
 *       and processor_id = the processor who created it.
 *       
 *       This endpoint provides key metrics for the dashboard summary cards.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Return statistics data
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
 *                     totalReturns:
 *                       type: number
 *                       example: 125
 *                       description: Total number of returns for this pharmacy (pharmacy-created + processor-created)
 *                     totalPharmacyCreatedReturns:
 *                       type: number
 *                       example: 100
 *                       description: Number of returns created by the pharmacy itself (processor_id is NULL)
 *                     totalProcessorHandledReturns:
 *                       type: number
 *                       example: 25
 *                       description: Number of returns created by a processor on behalf of this pharmacy (processor_id is NOT NULL)
 *                     totalReturnValue:
 *                       type: number
 *                       example: 60616.13
 *                       description: Sum of all returnable and non-returnable values from all returns for this pharmacy
 *                     totalCredits:
 *                       type: number
 *                       example: 45320.50
 *                       description: Sum of totalCreditReceived from pharmacy_payments table (same as displayed in Credits tab)
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/return-stats', getReturnStatsHandler);

/**
 * @swagger
 * /api/dashboard/returns-list:
 *   get:
 *     summary: Get list of all returns for dropdown selection
 *     description: Returns all return transactions for the authenticated pharmacy with id, license plate, date, and values. Used to populate the Select Return Reference dropdown on the dashboard.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of return transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       licensePlate:
 *                         type: string
 *                         example: "042726-23HA-9C54"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       status:
 *                         type: string
 *                       totalReturnableValue:
 *                         type: number
 *                       totalNonReturnableValue:
 *                         type: number
 */
router.get('/returns-list', getReturnsListHandler);

/**
 * @swagger
 * /api/dashboard/return-detail/{returnId}:
 *   get:
 *     summary: Get detailed dashboard data for a specific return
 *     description: |
 *       Returns credit summary, product value breakdown, non-returnable reasons,
 *       and product values over time for a specific return transaction.
 *       - Credit Summary: FCR OneCheck (included credits via RSI check) and Manufacturer Direct credits from pharmacy_payments
 *       - Product Value Breakdown: returnable vs non-returnable from the return transaction
 *       - Non-Returnable Reasons: breakdown by reason (date/expired, policy, no_data, manual)
 *       - Product Values Over Time: all returns for timeline chart
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: returnId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The return transaction ID
 *     responses:
 *       200:
 *         description: Return detail data
 *       404:
 *         description: Return transaction not found
 */
router.get('/return-detail/:returnId', getReturnDetailHandler);

export default router;

