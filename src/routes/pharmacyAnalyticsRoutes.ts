import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { pharmacyDashboardHandler } from '../controllers/reportingAnalyticsController';

const router = Router();

// Pharmacy auth
router.use(authenticate);

/**
 * @swagger
 * /api/analytics/pharmacy-dashboard:
 *   get:
 *     summary: Pharmacy-facing analytics dashboard
 *     description: |
 *       Returns comprehensive analytics for the authenticated pharmacy:
 *       - Overview metrics (returns count, items, values)
 *       - Monthly returns trend
 *       - Credits summary (estimated vs actual, payout breakdown)
 *       - Top returned products
 *       - Recent returns
 *     tags: [Pharmacy - Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period_start
 *         schema: { type: string, format: date }
 *         description: Start date (YYYY-MM-DD). Defaults to 12 months ago.
 *       - in: query
 *         name: period_end
 *         schema: { type: string, format: date }
 *         description: End date (YYYY-MM-DD). Defaults to today.
 *     responses:
 *       200:
 *         description: Pharmacy analytics dashboard data
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
 *                     periodStart:
 *                       type: string
 *                       format: date
 *                     periodEnd:
 *                       type: string
 *                       format: date
 *                     overview:
 *                       type: object
 *                       properties:
 *                         totalReturns: { type: integer }
 *                         totalItems: { type: integer }
 *                         totalReturnableValue: { type: number }
 *                         totalNonReturnableValue: { type: number }
 *                         inProgressReturns: { type: integer }
 *                         completedReturns: { type: integer }
 *                         avgItemsPerReturn: { type: number }
 *                     returnsTrend:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           period: { type: string }
 *                           periodKey: { type: string }
 *                           returns: { type: integer }
 *                           totalValue: { type: number }
 *                           totalItems: { type: integer }
 *                     creditsSummary:
 *                       type: object
 *                       properties:
 *                         totalCreditsReceived: { type: number }
 *                         totalCompanyFee: { type: number }
 *                         totalGpoShare: { type: number }
 *                         totalPayout: { type: number }
 *                         paidPayout: { type: number }
 *                         pendingPayout: { type: number }
 *                         totalPayments: { type: integer }
 *                         estimatedVsActual:
 *                           type: object
 *                           properties:
 *                             estimatedValue: { type: number }
 *                             actualReceived: { type: number }
 *                             recoveryPercent: { type: number }
 *                     topProducts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           ndc: { type: string }
 *                           productName: { type: string }
 *                           manufacturer: { type: string }
 *                           totalQuantity: { type: integer }
 *                           totalValue: { type: number }
 *                           returnCount: { type: integer }
 *                     recentReturns:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string }
 *                           licensePlate: { type: string }
 *                           status: { type: string }
 *                           totalItems: { type: integer }
 *                           returnableValue: { type: number }
 *                           serviceType: { type: string }
 *                           createdAt: { type: string }
 *       401:
 *         description: Unauthorized
 */
router.get('/pharmacy-dashboard', pharmacyDashboardHandler);

export default router;
