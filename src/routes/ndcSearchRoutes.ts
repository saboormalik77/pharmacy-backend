/**
 * NDC Search Routes
 * Fast NDC search API endpoints using pre-computed pricing index
 * This is a NEW route file - does NOT modify existing routes
 */

import { Router } from 'express';
import {
  searchNDCHandler,
  getNDCIndexHandler,
  getCacheStatsHandler,
  clearCacheHandler
} from '../controllers/ndcSearchController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @swagger
 * components:
 *   schemas:
 *     DistributorPricing:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Distributor ID
 *         name:
 *           type: string
 *           description: Distributor name
 *         fullPrice:
 *           type: number
 *           description: Price per full unit
 *         partialPrice:
 *           type: number
 *           description: Price per partial unit
 *         email:
 *           type: string
 *           description: Distributor email
 *         phone:
 *           type: string
 *           description: Distributor phone
 *         location:
 *           type: string
 *           description: Distributor location
 *         reportDate:
 *           type: string
 *           format: date
 *           description: Date of the price report
 *     NDCSearchResult:
 *       type: object
 *       properties:
 *         ndc:
 *           type: string
 *           description: Original NDC code with dashes
 *           example: "60219-1748-02"
 *         ndcNormalized:
 *           type: string
 *           description: Normalized NDC code without dashes
 *           example: "60219174802"
 *         productName:
 *           type: string
 *           description: Product name/description
 *         distributors:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/DistributorPricing'
 *         bestFullPrice:
 *           type: number
 *           description: Best (highest) price for full units
 *         bestPartialPrice:
 *           type: number
 *           description: Best (highest) price for partial units
 *         lastUpdated:
 *           type: string
 *           format: date-time
 *           description: When this pricing was last updated
 *     NDCSearchResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: success
 *         data:
 *           type: object
 *           properties:
 *             results:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/NDCSearchResult'
 *             count:
 *               type: integer
 *               description: Number of results returned
 *             searchTerm:
 *               type: string
 *               description: The search term used
 */

/**
 * @swagger
 * /api/ndc-search:
 *   get:
 *     summary: Fast NDC search using pre-computed pricing index
 *     description: |
 *       Searches the NDC pricing index for instant results.
 *       This endpoint is optimized for autocomplete/typeahead functionality.
 *       Results include all distributors and their pricing for each matching NDC.
 *     tags: [NDC Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Search term (NDC code or product name). Minimum 2 characters.
 *         example: "60219-1748"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *         description: Maximum number of results to return
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NDCSearchResponse'
 *       401:
 *         description: Unauthorized - invalid or missing token
 */
router.get('/', searchNDCHandler);

/**
 * @swagger
 * /api/ndc-search/index:
 *   get:
 *     summary: Get full NDC pricing index for client-side caching
 *     description: |
 *       Returns the complete NDC pricing index for local caching on mobile apps.
 *       Supports pagination and incremental sync via updatedAfter parameter.
 *       Use this to download data for offline/instant search on client side.
 *     tags: [NDC Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10000
 *           maximum: 50000
 *         description: Maximum number of records to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of records to skip (for pagination)
 *       - in: query
 *         name: updatedAfter
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Only return records updated after this timestamp (for incremental sync)
 *         example: "2024-01-01T00:00:00Z"
 *     responses:
 *       200:
 *         description: NDC pricing index data
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
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/NDCSearchResult'
 *                     total:
 *                       type: integer
 *                       description: Total number of records available
 *                     limit:
 *                       type: integer
 *                       description: Number of records returned
 *                     offset:
 *                       type: integer
 *                       description: Offset used
 *       401:
 *         description: Unauthorized - invalid or missing token
 */
router.get('/index', getNDCIndexHandler);

/**
 * @swagger
 * /api/ndc-search/cache-stats:
 *   get:
 *     summary: Get server cache statistics
 *     description: Returns statistics about the server-side NDC search cache
 *     tags: [NDC Search]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache statistics
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
 *                     size:
 *                       type: integer
 *                       description: Number of cached entries
 */
router.get('/cache-stats', getCacheStatsHandler);

/**
 * @swagger
 * /api/ndc-search/clear-cache:
 *   post:
 *     summary: Clear server cache
 *     description: Clears the server-side NDC search cache (admin function)
 *     tags: [NDC Search]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache cleared successfully
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
 *                     message:
 *                       type: string
 *                       example: Cache cleared successfully
 */
router.post('/clear-cache', clearCacheHandler);

export default router;

