import { Router } from 'express';
import { getOptimizationRecommendationsHandler, getPackageRecommendationsHandler, getPackageRecommendationsByNdcsHandler, getDistributorSuggestionsHandler, getPackageSuggestionsByNdcsHandler, getDistributorPackageSuggestionHandler } from '../controllers/optimizationController';
import customPackagesRoutes from './customPackagesRoutes';
import { authenticate } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * @swagger
 * /api/optimization/recommendations:
 *   get:
 *     summary: Get optimization recommendations for pharmacy products
 *     description: Analyzes product list items and matches them with return reports to find the best distributor prices and generate optimization recommendations. If ndc query parameter is provided, searches for those specific NDCs instead of pharmacy's product list. In search mode (with ndc), returns both fullPricePerUnit and partialPricePerUnit for each NDC. FullCount and PartialCount are optional - when provided, they filter results; when not provided, all records are fetched and both prices are returned.
 *     tags: [Optimization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ndc
 *         schema:
 *           type: string
 *         description: Comma-separated NDC codes to search for. If provided, uses these NDCs instead of pharmacy's product list.
 *         example: "42385097801,69315028209"
 *       - in: query
 *         name: FullCount
 *         schema:
 *           type: string
 *         description: Optional. Comma-separated values matching NDC order. When provided, filters return reports to only match records where full > 0.
 *         example: "10,0,5"
 *       - in: query
 *         name: PartialCount
 *         schema:
 *           type: string
 *         description: Optional. Comma-separated values matching NDC order. When provided, filters return reports to only match records where partial > 0.
 *         example: "0,5,0"
 *     responses:
 *       200:
 *         description: Optimization recommendations retrieved successfully. In search mode, includes fullPricePerUnit and partialPricePerUnit fields.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OptimizationResponse'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Bad request - array length mismatch between ndc and FullCount/PartialCount
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/recommendations', getOptimizationRecommendationsHandler);

/**
 * @swagger
 * /api/optimization/packages:
 *   get:
 *     summary: Get package recommendations for pharmacy products
 *     description: Analyzes pharmacy's product list and groups products by distributor based on best prices. Creates optimized packages showing which products should be sent to which distributor for maximum return value.
 *     tags: [Optimization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Package recommendations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PackageRecommendationResponse'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/packages', getPackageRecommendationsHandler);

/**
 * @swagger
 * /api/optimization/packages/by-ndc:
 *   get:
 *     summary: Get package recommendations by NDC codes
 *     description: Analyzes provided NDC codes and groups them by distributor based on best prices. Creates optimized packages showing which NDCs should be sent to which distributor for maximum return value. Accepts single or multiple comma-separated NDCs.
 *     tags: [Optimization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ndc
 *         required: true
 *         schema:
 *           type: string
 *         description: Single NDC code or comma-separated NDC codes to search for
 *         example: "42385097801,69315028209"
 *     responses:
 *       200:
 *         description: Package recommendations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PackageRecommendationResponse'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Bad request - NDC parameter is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/packages/by-ndc', getPackageRecommendationsByNdcsHandler);

/**
 * @swagger
 * /api/optimization/packages/suggestions:
 *   post:
 *     summary: Get package suggestions by NDC codes with alreadyCreated flag
 *     description: Analyzes provided NDC codes with full/partial units and groups them by distributor based on best prices. Also checks if a non-delivered package has already been created with each distributor for the pharmacy. Returns alreadyCreated boolean for each package suggestion. Delivered packages (status=true) are not counted as already created.
 *     tags: [Optimization]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 description: Array of NDC items with full and partial units. Each item is treated separately even if NDC is same.
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - ndc
 *                   properties:
 *                     ndc:
 *                       type: string
 *                       description: NDC code of the product
 *                       example: "00187-5115-60"
 *                     productId:
 *                       type: string
 *                       description: Product ID from product_list_items (optional, used for tracking)
 *                       example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                     productName:
 *                       type: string
 *                       description: Product name (optional, fallback to database if not provided)
 *                       example: "Aspirin 100mg Tablet"
 *                     full:
 *                       type: number
 *                       description: Number of full units
 *                       example: 2
 *                       minimum: 0
 *                       default: 0
 *                     partial:
 *                       type: number
 *                       description: Number of partial units
 *                       example: 1
 *                       minimum: 0
 *                       default: 0
 *           examples:
 *             singleNdc:
 *               summary: Single NDC with full units
 *               value:
 *                 items:
 *                   - ndc: "00187-5115-60"
 *                     productId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                     productName: "Aspirin 100mg Tablet"
 *                     full: 2
 *                     partial: 0
 *             multipleNdcs:
 *               summary: Multiple NDCs with mixed units
 *               value:
 *                 items:
 *                   - ndc: "00187-5115-60"
 *                     productId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                     full: 2
 *                     partial: 1
 *                   - ndc: "42385097801"
 *                     productId: "b2c3d4e5-f6a7-8901-bcde-f23456789012"
 *                     full: 1
 *                     partial: 0
 *     responses:
 *       200:
 *         description: Package suggestions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     packages:
 *                       type: array
 *                       description: Array of package suggestions grouped by distributor
 *                       items:
 *                         type: object
 *                         properties:
 *                           distributorName:
 *                             type: string
 *                             example: "Return Solutions, Inc."
 *                           distributorId:
 *                             type: string
 *                             nullable: true
 *                             example: "2da2ca2e-c3c9-4ffa-9a06-a226631a9b4f"
 *                           distributorContact:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               email:
 *                                 type: string
 *                                 nullable: true
 *                               phone:
 *                                 type: string
 *                                 nullable: true
 *                               location:
 *                                 type: string
 *                                 nullable: true
 *                               feeRates:
 *                                 type: object
 *                                 nullable: true
 *                                 description: Fee rates for different payment periods (30, 60, 90 days)
 *                                 additionalProperties:
 *                                   type: object
 *                                   properties:
 *                                     percentage:
 *                                       type: number
 *                                       example: 13.4
 *                                     reportDate:
 *                                       type: string
 *                                       example: "2025-01-10"
 *                                 example:
 *                                   "30": { "percentage": 13.4, "reportDate": "2025-01-10" }
 *                                   "60": { "percentage": 15.0, "reportDate": "2025-01-10" }
 *                           products:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 ndc:
 *                                   type: string
 *                                 productId:
 *                                   type: string
 *                                   nullable: true
 *                                   description: Product ID from product_list_items
 *                                 productName:
 *                                   type: string
 *                                 full:
 *                                   type: number
 *                                 partial:
 *                                   type: number
 *                                 pricePerUnit:
 *                                   type: number
 *                                 totalValue:
 *                                   type: number
 *                           totalItems:
 *                             type: number
 *                           totalEstimatedValue:
 *                             type: number
 *                           averagePricePerUnit:
 *                             type: number
 *                           alreadyCreated:
 *                             type: boolean
 *                             description: Whether a non-delivered package has already been created with this distributor for the pharmacy. Delivered packages (status=true) are not counted.
 *                             example: false
 *                           existingPackage:
 *                             type: object
 *                             nullable: true
 *                             description: Existing package info when alreadyCreated is true
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                                 example: "123e4567-e89b-12d3-a456-426614174000"
 *                               packageNumber:
 *                                 type: string
 *                                 example: "PKG-1704123456789-1234"
 *                               totalItems:
 *                                 type: number
 *                                 example: 10
 *                               totalEstimatedValue:
 *                                 type: number
 *                                 example: 250.50
 *                               feeRate:
 *                                 type: number
 *                                 nullable: true
 *                                 example: 13.4
 *                                 description: Fee rate percentage applied to this package
 *                               feeDuration:
 *                                 type: number
 *                                 nullable: true
 *                                 example: 30
 *                                 description: Fee duration in days (e.g., 30, 60, 90)
 *                               createdAt:
 *                                 type: string
 *                                 format: date-time
 *                                 example: "2024-01-15T10:30:00.000Z"
 *                     totalProducts:
 *                       type: number
 *                       description: Total number of products in the request
 *                     totalPackages:
 *                       type: number
 *                       description: Total number of package suggestions
 *                     totalEstimatedValue:
 *                       type: number
 *                       description: Total estimated value across all packages
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 *                     summary:
 *                       type: object
 *                       properties:
 *                         productsWithPricing:
 *                           type: number
 *                         productsWithoutPricing:
 *                           type: number
 *                         distributorsUsed:
 *                           type: number
 *                         packagesAlreadyCreated:
 *                           type: number
 *                           description: Number of non-delivered packages that already exist with the suggested distributors
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Bad request - missing or invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/packages/suggestions', getPackageSuggestionsByNdcsHandler);

/**
 * @swagger
 * /api/optimization/packages/distributor-suggestion:
 *   post:
 *     summary: Get package suggestion for a specific distributor
 *     description: Get package suggestion for a specific distributor provided in the payload. Unlike /packages/suggestions which finds the best distributor, this API uses the distributor provided in the request. All pricing logic is handled by an RPC function with no JS loops or logic.
 *     tags: [Optimization]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - distributorId
 *               - items
 *             properties:
 *               distributorId:
 *                 type: string
 *                 format: uuid
 *                 description: The UUID of the distributor to get pricing for
 *                 example: "9b67ae57-b566-4819-9ec8-03df64965897"
 *               items:
 *                 type: array
 *                 description: Array of NDC items with full and partial units
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - ndc
 *                   properties:
 *                     ndc:
 *                       type: string
 *                       description: NDC code of the product
 *                       example: "00187-5115-60"
 *                     productId:
 *                       type: string
 *                       description: Product ID from product_list_items (optional)
 *                       example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                     productName:
 *                       type: string
 *                       description: Product name (optional, fallback to database if not provided)
 *                       example: "Aspirin 100mg Tablet"
 *                     full:
 *                       type: number
 *                       description: Number of full units
 *                       example: 2
 *                       minimum: 0
 *                       default: 0
 *                     partial:
 *                       type: number
 *                       description: Number of partial units
 *                       example: 1
 *                       minimum: 0
 *                       default: 0
 *           examples:
 *             singleItem:
 *               summary: Single NDC with full units
 *               value:
 *                 distributorId: "9b67ae57-b566-4819-9ec8-03df64965897"
 *                 items:
 *                   - ndc: "00187-5115-60"
 *                     productId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                     productName: "Aspirin 100mg Tablet"
 *                     full: 2
 *                     partial: 0
 *             multipleItems:
 *               summary: Multiple NDCs with mixed units
 *               value:
 *                 distributorId: "9b67ae57-b566-4819-9ec8-03df64965897"
 *                 items:
 *                   - ndc: "00187-5115-60"
 *                     full: 2
 *                     partial: 1
 *                   - ndc: "42385097801"
 *                     full: 1
 *                     partial: 0
 *     responses:
 *       200:
 *         description: Package suggestion retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     packages:
 *                       type: array
 *                       description: Array containing single package suggestion for the specified distributor
 *                       items:
 *                         type: object
 *                         properties:
 *                           distributorName:
 *                             type: string
 *                             example: "Return Solutions, Inc."
 *                           distributorId:
 *                             type: string
 *                             example: "9b67ae57-b566-4819-9ec8-03df64965897"
 *                           distributorContact:
 *                             type: object
 *                             properties:
 *                               email:
 *                                 type: string
 *                                 nullable: true
 *                               phone:
 *                                 type: string
 *                                 nullable: true
 *                               location:
 *                                 type: string
 *                                 nullable: true
 *                               feeRates:
 *                                 type: object
 *                                 nullable: true
 *                           products:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 ndc:
 *                                   type: string
 *                                 productId:
 *                                   type: string
 *                                   nullable: true
 *                                 productName:
 *                                   type: string
 *                                 full:
 *                                   type: number
 *                                 partial:
 *                                   type: number
 *                                 pricePerUnit:
 *                                   type: number
 *                                 totalValue:
 *                                   type: number
 *                           totalItems:
 *                             type: number
 *                           totalEstimatedValue:
 *                             type: number
 *                           averagePricePerUnit:
 *                             type: number
 *                           alreadyCreated:
 *                             type: boolean
 *                             description: Whether a non-delivered package already exists with this distributor
 *                           existingPackage:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               id:
 *                                 type: string
 *                               packageNumber:
 *                                 type: string
 *                               totalItems:
 *                                 type: number
 *                               totalEstimatedValue:
 *                                 type: number
 *                               feeRate:
 *                                 type: number
 *                                 nullable: true
 *                               feeDuration:
 *                                 type: number
 *                                 nullable: true
 *                               createdAt:
 *                                 type: string
 *                     totalProducts:
 *                       type: number
 *                     totalPackages:
 *                       type: number
 *                     totalEstimatedValue:
 *                       type: number
 *                     generatedAt:
 *                       type: string
 *                     summary:
 *                       type: object
 *                       properties:
 *                         productsWithPricing:
 *                           type: number
 *                         productsWithoutPricing:
 *                           type: number
 *                         distributorsUsed:
 *                           type: number
 *                         packagesAlreadyCreated:
 *                           type: number
 *       400:
 *         description: Bad request - Missing required fields or invalid data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/packages/distributor-suggestion', getDistributorPackageSuggestionHandler);

/**
 * @swagger
 * /api/optimization/suggestions:
 *   post:
 *     summary: Get distributor suggestions for NDC(s) with full/partial units
 *     description: Checks if pharmacy has the product in inventory, then returns distributor suggestions with separate pricing for full and partial units. Supports multiple NDCs in one request. Returns distributors that accept ALL requested NDCs with their full and partial prices.
 *     tags: [Optimization]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Multiple NDCs request with full/partial units
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 description: Array of NDC items with full and partial units
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - ndc
 *                   properties:
 *                     ndc:
 *                       type: string
 *                       description: NDC code of the product
 *                       example: "00187-5115-60"
 *                     product:
 *                       type: string
 *                       description: Product name (optional, will be fetched from database if not provided)
 *                       example: "sertaconazole 20 MG/ML Topical Cream"
 *                     full:
 *                       type: number
 *                       description: Number of full units to return
 *                       example: 2
 *                       minimum: 0
 *                       default: 0
 *                     partial:
 *                       type: number
 *                       description: Number of partial units to return
 *                       example: 1
 *                       minimum: 0
 *                       default: 0
 *           examples:
 *             fullUnitsOnly:
 *               summary: Full units only
 *               value:
 *                 items:
 *                   - ndc: "00187-5115-60"
 *                     full: 1
 *                     partial: 0
 *             partialUnitsOnly:
 *               summary: Partial units only
 *               value:
 *                 items:
 *                   - ndc: "00187-5115-60"
 *                     full: 0
 *                     partial: 2
 *             mixedUnits:
 *               summary: Mixed full and partial units
 *               value:
 *                 items:
 *                   - ndc: "00187-5115-60"
 *                     full: 2
 *                     partial: 1
 *                   - ndc: "42385097801"
 *                     full: 1
 *                     partial: 0
 *     responses:
 *       200:
 *         description: Distributor suggestions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: Response with distributors grouped by those that accept ALL requested NDCs
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     distributors:
 *                       type: array
 *                       description: Array of distributors that accept ALL requested NDCs
 *                       items:
 *                         type: object
 *                         properties:
 *                           distributorName:
 *                             type: string
 *                             example: "Return Solutions, Inc."
 *                           distributorId:
 *                             type: string
 *                             nullable: true
 *                             example: "2da2ca2e-c3c9-4ffa-9a06-a226631a9b4f"
 *                           distributorContact:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               email:
 *                                 type: string
 *                                 nullable: true
 *                                 example: "contact@returnsolutions.com"
 *                               phone:
 *                                 type: string
 *                                 nullable: true
 *                                 example: "800-579-4804"
 *                               location:
 *                                 type: string
 *                                 nullable: true
 *                                 example: "10635 Dutchtown Road, Knoxville, TN, 37932, USA"
 *                           feeRates:
 *                             type: object
 *                             nullable: true
 *                             description: Fee rates for different payment periods (30, 60, 90 days)
 *                             additionalProperties:
 *                               type: object
 *                               properties:
 *                                 percentage:
 *                                   type: number
 *                                   example: 13.4
 *                                 reportDate:
 *                                   type: string
 *                                   example: "2025-01-10"
 *                             example:
 *                               "30": { "percentage": 13.4, "reportDate": "2025-01-10" }
 *                               "60": { "percentage": 15.0, "reportDate": "2025-01-10" }
 *                               "90": { "percentage": 18.0, "reportDate": "2025-01-10" }
 *                           products:
 *                             type: array
 *                             description: NDCs that this distributor accepts with full/partial pricing
 *                             items:
 *                               type: object
 *                               properties:
 *                                 ndc:
 *                                   type: string
 *                                   example: "00187-5115-60"
 *                                 productName:
 *                                   type: string
 *                                   example: "sertaconazole 20 MG/ML Topical Cream"
 *                                 full:
 *                                   type: number
 *                                   description: Number of full units requested
 *                                   example: 1
 *                                 partial:
 *                                   type: number
 *                                   description: Number of partial units requested
 *                                   example: 0
 *                                 fullPricePerUnit:
 *                                   type: number
 *                                   nullable: true
 *                                   description: Latest price per full unit from this distributor
 *                                   example: 682.93
 *                                 partialPricePerUnit:
 *                                   type: number
 *                                   nullable: true
 *                                   description: Latest price per partial unit from this distributor
 *                                   example: 45.50
 *                                 totalEstimatedValue:
 *                                   type: number
 *                                   description: Total value calculated as (full * fullPricePerUnit) + (partial * partialPricePerUnit)
 *                                   example: 682.93
 *                           totalItems:
 *                             type: number
 *                             description: Total number of units (full + partial) across all products
 *                             example: 1
 *                           totalEstimatedValue:
 *                             type: number
 *                             description: Total estimated value for all products from this distributor
 *                             example: 682.93
 *                           ndcsCount:
 *                             type: number
 *                             description: Number of different NDCs this distributor accepts
 *                             example: 1
 *                     ndcsWithoutDistributors:
 *                       type: array
 *                       description: NDCs that have no distributor offering returns
 *                       items:
 *                         type: object
 *                         properties:
 *                           ndc:
 *                             type: string
 *                             example: "70756024751"
 *                           productName:
 *                             type: string
 *                             example: "Product Name"
 *                           full:
 *                             type: number
 *                             description: Full units requested
 *                             example: 2
 *                           partial:
 *                             type: number
 *                             description: Partial units requested
 *                             example: 1
 *                           reason:
 *                             type: string
 *                             example: "No distributor found offering returns for this NDC"
 *                     totalItems:
 *                       type: number
 *                       description: Total units (full + partial) across all requested items
 *                       example: 3
 *                     totalDistributors:
 *                       type: number
 *                       description: Number of distributors that accept ALL requested NDCs
 *                       example: 2
 *                     totalEstimatedValue:
 *                       type: number
 *                       description: Total estimated value from the best distributor
 *                       example: 682.93
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00.000Z"
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Bad request - missing or invalid parameters, or product not in inventory
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalidUnits:
 *                 summary: Invalid full/partial units
 *                 value:
 *                   status: "error"
 *                   message: "Item 1: At least one of full or partial must be greater than 0"
 *               productNotFound:
 *                 summary: Product not found in inventory
 *                 value:
 *                   status: "error"
 *                   message: "You don't have this product in your inventory. NDC: 45963-0142-05, Product: Fluoxetine"
 */
router.post('/suggestions', getDistributorSuggestionsHandler);

// Custom packages routes
router.use('/custom-packages', customPackagesRoutes);

export default router;

