import { Router } from 'express';
import { getAnalyticsHandler } from '../controllers/adminAnalyticsController';
import {
  askVsReceivedHandler,
  manufacturerPaymentsHandler,
} from '../controllers/paymentTrackingController';
import { authenticateAdmin } from '../middleware/adminAuth';

const router = Router();

// Apply admin authentication middleware to all routes
router.use(authenticateAdmin);

/**
 * @swagger
 * components:
 *   schemas:
 *     MetricWithChange:
 *       type: object
 *       properties:
 *         value:
 *           type: number
 *           description: Current metric value
 *           example: 2456890
 *         change:
 *           type: number
 *           description: Percentage change vs last month
 *           example: 15.8
 *         changeLabel:
 *           type: string
 *           description: Label for the change comparison
 *           example: "vs last month"
 *     
 *     KeyMetrics:
 *       type: object
 *       properties:
 *         totalReturnsValue:
 *           $ref: '#/components/schemas/MetricWithChange'
 *         totalReturns:
 *           $ref: '#/components/schemas/MetricWithChange'
 *         avgReturnValue:
 *           $ref: '#/components/schemas/MetricWithChange'
 *         activePharmacies:
 *           $ref: '#/components/schemas/MetricWithChange'
 *     
 *     MonthlyTrendItem:
 *       type: object
 *       properties:
 *         month:
 *           type: string
 *           description: Month label (e.g., "Jan 2025")
 *           example: "Jan 2025"
 *         monthKey:
 *           type: string
 *           description: Month key for sorting (YYYY-MM)
 *           example: "2025-01"
 *         totalValue:
 *           type: number
 *           description: Total returns value for the month
 *           example: 125430.50
 *         itemsCount:
 *           type: integer
 *           description: Number of items returned in the month
 *           example: 245
 *     
 *     TopProductItem:
 *       type: object
 *       properties:
 *         productName:
 *           type: string
 *           description: Product/item name
 *           example: "Lisinopril 10mg Tablets"
 *         totalValue:
 *           type: number
 *           description: Total credit value for this product
 *           example: 45678.90
 *         totalQuantity:
 *           type: integer
 *           description: Total quantity returned
 *           example: 1250
 *         returnCount:
 *           type: integer
 *           description: Number of times this product was returned
 *           example: 156
 *     
 *     DistributorBreakdownItem:
 *       type: object
 *       properties:
 *         distributorId:
 *           type: string
 *           format: uuid
 *           description: Distributor ID
 *         distributorName:
 *           type: string
 *           description: Distributor name
 *           example: "Stericycle Returns"
 *         pharmaciesCount:
 *           type: integer
 *           description: Number of pharmacies using this distributor
 *           example: 45
 *         totalReturns:
 *           type: integer
 *           description: Total number of return items
 *           example: 1245
 *         avgReturnValue:
 *           type: number
 *           description: Average return value per item
 *           example: 12500.00
 *         totalValue:
 *           type: number
 *           description: Total returns value
 *           example: 15562500.00
 *     
 *     StateBreakdownItem:
 *       type: object
 *       properties:
 *         state:
 *           type: string
 *           description: State name (from pharmacy physical_address)
 *           example: "California"
 *         pharmacies:
 *           type: integer
 *           description: Number of pharmacies in this state
 *           example: 45
 *         totalReturns:
 *           type: integer
 *           description: Total number of return items from pharmacies in this state
 *           example: 1245
 *         avgReturnValue:
 *           type: number
 *           description: Average return value per item
 *           example: 12500.00
 *         totalValue:
 *           type: number
 *           description: Total returns value from pharmacies in this state
 *           example: 15562500.00
 *     
 *     AnalyticsResponse:
 *       type: object
 *       properties:
 *         keyMetrics:
 *           $ref: '#/components/schemas/KeyMetrics'
 *         charts:
 *           type: object
 *           properties:
 *             returnsValueTrend:
 *               type: array
 *               description: Monthly returns value trend (past 12 months)
 *               items:
 *                 $ref: '#/components/schemas/MonthlyTrendItem'
 *             topProducts:
 *               type: array
 *               description: Top 5 products by returns value
 *               items:
 *                 $ref: '#/components/schemas/TopProductItem'
 *         distributorBreakdown:
 *           type: array
 *           description: Returns breakdown by distributor
 *           items:
 *             $ref: '#/components/schemas/DistributorBreakdownItem'
 *         stateBreakdown:
 *           type: array
 *           description: Returns breakdown by state (from pharmacy physical_address)
 *           items:
 *             $ref: '#/components/schemas/StateBreakdownItem'
 *         generatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when analytics were generated
 */

/**
 * @swagger
 * /api/admin/analytics:
 *   get:
 *     summary: Get all analytics data for admin dashboard
 *     description: |
 *       Returns comprehensive analytics data including:
 *       - **Key Metrics**: Total returns value, total returns count, average return value, active pharmacies
 *         - Each metric includes % change vs last month
 *       - **Charts Data**:
 *         - Returns Value Trend: Monthly totals for past 12 months (using report_date from uploaded_documents)
 *         - Top Products: Top 5 products by total returns value (using itemName from return reports)
 *       - **Distributor Breakdown**: Returns statistics by reverse distributor
 *       - **State Breakdown**: Returns statistics grouped by state (from pharmacy physical_address)
 *       
 *       All data is calculated from return_reports table using RPC function.
 *     tags: [Admin - Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/AnalyticsResponse'
 *             example:
 *               status: success
 *               data:
 *                 keyMetrics:
 *                   totalReturnsValue:
 *                     value: 2456890.50
 *                     change: 15.8
 *                     changeLabel: "vs last month"
 *                   totalReturns:
 *                     value: 4858
 *                     change: 8.3
 *                     changeLabel: "vs last month"
 *                   avgReturnValue:
 *                     value: 505.67
 *                     change: 6.9
 *                     changeLabel: "vs last month"
 *                   activePharmacies:
 *                     value: 248
 *                     change: 12.5
 *                     changeLabel: "vs last month"
 *                 charts:
 *                   returnsValueTrend:
 *                     - month: "Jan 2025"
 *                       monthKey: "2025-01"
 *                       totalValue: 125430.50
 *                       itemsCount: 245
 *                   topProducts:
 *                     - productName: "Lisinopril 10mg Tablets"
 *                       totalValue: 45678.90
 *                       totalQuantity: 1250
 *                       returnCount: 156
 *                 distributorBreakdown:
 *                   - distributorId: "abc-123"
 *                     distributorName: "Stericycle Returns"
 *                     pharmaciesCount: 45
 *                     totalReturns: 1245
 *                     avgReturnValue: 12500.00
 *                     totalValue: 15562500.00
 *                 stateBreakdown:
 *                   - state: "California"
 *                     pharmacies: 45
 *                     totalReturns: 1245
 *                     avgReturnValue: 12500.00
 *                     totalValue: 15562500.00
 *                   - state: "New York"
 *                     pharmacies: 38
 *                     totalReturns: 987
 *                     avgReturnValue: 11200.00
 *                     totalValue: 11054400.00
 *                 generatedAt: "2025-12-23T12:00:00.000Z"
 *       401:
 *         description: Unauthorized - invalid or missing admin token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', getAnalyticsHandler);

/**
 * @swagger
 * /api/admin/analytics/ask-vs-received:
 *   get:
 *     summary: Ask vs Received analytics (grouped by manufacturer or period)
 *     tags: [Payment Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: group_by
 *         schema: { type: string, enum: [manufacturer, period], default: manufacturer }
 *         description: Group results by manufacturer or by month
 *       - in: query
 *         name: period
 *         schema: { type: string }
 *         description: Filter to specific month (YYYY-MM format)
 *     responses:
 *       200:
 *         description: Ask vs received breakdown with totals
 */
router.get('/ask-vs-received', askVsReceivedHandler);

/**
 * @swagger
 * /api/admin/analytics/manufacturer-payments:
 *   get:
 *     summary: Per-manufacturer payment summary
 *     tags: [Payment Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by manufacturer name or labeler ID
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Per-manufacturer payment stats
 */
router.get('/manufacturer-payments', manufacturerPaymentsHandler);

export default router;

