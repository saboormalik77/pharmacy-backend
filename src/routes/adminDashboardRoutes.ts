import { Router } from 'express';
import { getAdminDashboardHandler } from '../controllers/adminDashboardController';
import { authenticateAdmin } from '../middleware/adminAuth';

const router = Router();

// Apply admin authentication middleware to all routes
router.use(authenticateAdmin);

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard statistics
 *     description: |
 *       Returns overall admin dashboard statistics including:
 *       - Total Pharmacies (with % change vs last month)
 *       - Active Distributors (with % change vs last month)
 *       - Returns Value (with % change vs last month)
 *       - Returns Value Trend (monthly/yearly graph data)
 *       - All pharmacy names with IDs
 *       
 *       When pharmacyId query parameter is provided, the returnsValueTrend graph data
 *       is filtered to show only that pharmacy's data. Other stats (totalPharmacies,
 *       activeDistributors, returnsValue) remain overall/global and are not filtered.
 *       
 *       This endpoint is designed for admin dashboard views.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: pharmacyId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional pharmacy ID to filter graph data only. When provided, returnsValueTrend shows data for this pharmacy only.
 *         example: "3e19f01d-511d-421f-9cc6-ed83d33e034d"
 *       - in: query
 *         name: periodType
 *         schema:
 *           type: string
 *           enum: [monthly, yearly]
 *           default: monthly
 *         description: Group returns value trend by month or year
 *         example: monthly
 *       - in: query
 *         name: periods
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 60
 *           default: 12
 *         description: Number of periods for graph data (default 12, max 60 for monthly, max 10 for yearly)
 *         example: 12
 *     responses:
 *       200:
 *         description: Admin dashboard data retrieved successfully
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
 *                     stats:
 *                       type: object
 *                       description: Overall statistics (not filtered by pharmacyId)
 *                       properties:
 *                         totalPharmacies:
 *                           type: object
 *                           properties:
 *                             value:
 *                               type: integer
 *                               example: 248
 *                               description: Total number of pharmacies
 *                             change:
 *                               type: number
 *                               example: 12.5
 *                               description: Percentage change vs last month
 *                             changeLabel:
 *                               type: string
 *                               example: "vs last month"
 *                         activeDistributors:
 *                           type: object
 *                           properties:
 *                             value:
 *                               type: integer
 *                               example: 45
 *                               description: Number of active distributors
 *                             change:
 *                               type: number
 *                               example: 8.2
 *                               description: Percentage change vs last month
 *                             changeLabel:
 *                               type: string
 *                               example: "vs last month"
 *                         returnsValue:
 *                           type: object
 *                           properties:
 *                             value:
 *                               type: number
 *                               example: 2456890.00
 *                               description: Total returns value for current month
 *                             change:
 *                               type: number
 *                               example: 15.8
 *                               description: Percentage change vs last month
 *                             changeLabel:
 *                               type: string
 *                               example: "vs last month"
 *                     pharmacies:
 *                       type: array
 *                       description: List of all pharmacies with id and name
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                             example: "3e19f01d-511d-421f-9cc6-ed83d33e034d"
 *                           name:
 *                             type: string
 *                             example: "HealthPlus Pharmacy"
 *                     returnsValueTrend:
 *                       type: array
 *                       description: Graph data for returns value trend (filtered by pharmacyId if provided)
 *                       items:
 *                         type: object
 *                         properties:
 *                           period:
 *                             type: string
 *                             example: "2025-01"
 *                             description: Period identifier (YYYY-MM for monthly, YYYY for yearly)
 *                           label:
 *                             type: string
 *                             example: "Jan"
 *                             description: Short label for display
 *                           value:
 *                             type: number
 *                             example: 180000.00
 *                             description: Total returns value for this period
 *                           documentsCount:
 *                             type: integer
 *                             example: 45
 *                             description: Number of documents in this period
 *                     period:
 *                       type: object
 *                       description: Period information for the query
 *                       properties:
 *                         type:
 *                           type: string
 *                           enum: [monthly, yearly]
 *                           example: "monthly"
 *                         periods:
 *                           type: integer
 *                           example: 12
 *                         startDate:
 *                           type: string
 *                           format: date
 *                           example: "2024-01-01"
 *                         endDate:
 *                           type: string
 *                           format: date
 *                           example: "2025-12-19"
 *                         pharmacyId:
 *                           type: string
 *                           format: uuid
 *                           nullable: true
 *                           description: Pharmacy ID used to filter graph data (null if not filtered)
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-12-19T10:30:00.000Z"
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/dashboard', getAdminDashboardHandler);

export default router;

