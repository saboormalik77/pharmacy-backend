import express from 'express';
import { getEarningsEstimationHandler } from '../controllers/earningsEstimationController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * /api/earnings-estimation:
 *   get:
 *     summary: Get earnings estimation and optimization analysis for authenticated pharmacy
 *     description: |
 *       Analyzes the authenticated pharmacy's return reports and compares their actual earnings 
 *       (creditAmount from their reports) with potential earnings if they had used the best 
 *       distributor for each NDC.
 *       
 *       **Authentication Required**: This endpoint requires a valid Bearer token. The pharmacy ID
 *       is automatically extracted from the authenticated user's token.
 *       
 *       **New Logic**:
 *       1. Fetches all uploaded documents for the pharmacy
 *       2. Fetches return reports for those documents
 *       3. Sums creditAmount per NDC from each document
 *       4. Compares with best prices from all distributors in our database
 *       5. Groups by month/year based on report_date from uploaded_documents
 *       6. Returns chart-friendly response showing actual vs potential earnings per period
 *       
 *       **Full vs Partial Pricing**: The API separately tracks FULL and PARTIAL prices:
 *       - For FULL records (full > 0, partial = 0): Compares with FULL prices from other distributors
 *       - For PARTIAL records (partial > 0, full = 0): Compares with PARTIAL prices from other distributors
 *       
 *       Use this API to show pharmacies:
 *       - "You earned $X this month, but with our system you could have earned $Y"
 *       - Visual chart data showing actual vs potential earnings over time
 *     tags: [Earnings Estimation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period_type
 *         required: false
 *         schema:
 *           type: string
 *           enum: [monthly, yearly]
 *           default: monthly
 *         description: How to group the analysis - monthly or yearly
 *       - in: query
 *         name: periods
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 60
 *           default: 12
 *         description: Number of periods to analyze (e.g., 12 months or 5 years)
 *     responses:
 *       200:
 *         description: Earnings estimation retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Earnings estimation retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       description: High-level summary of the analysis
 *                       properties:
 *                         totalActualEarnings:
 *                           type: number
 *                           description: Total creditAmount from pharmacy's reports
 *                           example: 15000.50
 *                         totalPotentialEarnings:
 *                           type: number
 *                           description: Total they could have earned with best distributor prices
 *                           example: 18500.75
 *                         totalMissedEarnings:
 *                           type: number
 *                           description: Difference (potential - actual)
 *                           example: 3500.25
 *                         optimizationScore:
 *                           type: integer
 *                           description: Score 0-100 showing how optimal their earnings were (100 = already best)
 *                           example: 81
 *                         isAlreadyOptimal:
 *                           type: boolean
 *                           description: True if pharmacy is already earning the best possible
 *                           example: false
 *                         periodType:
 *                           type: string
 *                           enum: [monthly, yearly]
 *                           example: monthly
 *                         dateRange:
 *                           type: object
 *                           properties:
 *                             startDate:
 *                               type: string
 *                               format: date
 *                               example: "2024-01-01"
 *                             endDate:
 *                               type: string
 *                               format: date
 *                               example: "2024-12-31"
 *                     chartData:
 *                       type: array
 *                       description: Earnings data by period for charts (line/bar graphs)
 *                       items:
 *                         type: object
 *                         properties:
 *                           period:
 *                             type: string
 *                             description: Period key (YYYY-MM for monthly, YYYY for yearly)
 *                             example: "2024-12"
 *                           label:
 *                             type: string
 *                             description: Human-readable label
 *                             example: "December 2024"
 *                           actualEarnings:
 *                             type: number
 *                             description: What they actually earned (sum of creditAmount)
 *                             example: 1250.00
 *                           potentialEarnings:
 *                             type: number
 *                             description: What they could have earned with best prices
 *                             example: 1500.00
 *                           difference:
 *                             type: number
 *                             description: Missed earnings (potential - actual)
 *                             example: 250.00
 *                     topMissedOpportunities:
 *                       type: array
 *                       description: Top 10 NDCs where better distributor could have yielded more
 *                       items:
 *                         type: object
 *                         properties:
 *                           ndcCode:
 *                             type: string
 *                             example: "65862-0218-60"
 *                           productName:
 *                             type: string
 *                             example: "Metformin 500mg Tablets"
 *                           quantity:
 *                             type: integer
 *                             example: 100
 *                           full:
 *                             type: integer
 *                             example: 5
 *                           partial:
 *                             type: integer
 *                             example: 0
 *                           actualEarned:
 *                             type: number
 *                             description: Total creditAmount earned for this NDC
 *                             example: 500.00
 *                           bestDistributor:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                                 example: "Best Returns Inc"
 *                               pricePerUnit:
 *                                 type: number
 *                                 example: 5.75
 *                               potentialEarnings:
 *                                 type: number
 *                                 example: 575.00
 *                           potentialAdditionalEarnings:
 *                             type: number
 *                             description: How much more they could have earned
 *                             example: 75.00
 *                           percentageDifference:
 *                             type: number
 *                             description: Percentage increase (e.g., 15.0 means 15% more)
 *                             example: 15.0
 *       400:
 *         description: Bad request - invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalidPeriodType:
 *                 value:
 *                   status: fail
 *                   message: period_type must be either "monthly" or "yearly"
 *               invalidPeriods:
 *                 value:
 *                   status: fail
 *                   message: periods must be between 1 and 60
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missingToken:
 *                 value:
 *                   status: fail
 *                   message: Authorization token is required
 *               invalidToken:
 *                 value:
 *                   status: fail
 *                   message: Invalid or expired token
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', authenticate, getEarningsEstimationHandler as any);

export default router;
