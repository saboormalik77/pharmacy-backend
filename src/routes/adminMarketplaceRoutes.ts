import { Router } from 'express';
import {
  getMarketplaceDealsHandler,
  getMarketplaceStatsHandler,
  getMarketplaceCategoriesHandler,
  getMarketplaceDealByIdHandler,
  createMarketplaceDealHandler,
  updateMarketplaceDealHandler,
  markDealAsSoldHandler,
  deleteMarketplaceDealHandler,
  setDealOfTheDayHandler,
  unsetDealOfTheDayHandler,
  getDealOfTheDayInfoHandler,
  getAllFeaturedDealsInfoHandler,
} from '../controllers/adminMarketplaceController';
import { authenticateAdmin, requirePermission } from '../middleware/adminAuth';
import { uploadImage } from '../middleware/uploadImage';

const router = Router();

// Apply admin authentication to all routes
router.use(authenticateAdmin);
router.use(requirePermission('marketplace'));

// ============================================================
// Swagger Schemas
// ============================================================

/**
 * @swagger
 * components:
 *   schemas:
 *     MarketplaceDeal:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Deal ID
 *         dealNumber:
 *           type: string
 *           description: Auto-generated deal number
 *           example: "DEAL-001"
 *         productName:
 *           type: string
 *           description: Product name
 *           example: "Ibuprofen 200mg"
 *         category:
 *           type: string
 *           description: Product category
 *           example: "Pain Relief"
 *         ndc:
 *           type: string
 *           nullable: true
 *           description: NDC code
 *           example: "00069-0600-66"
 *         quantity:
 *           type: integer
 *           description: Available quantity
 *           example: 500
 *         minimumBuyQuantity:
 *           type: integer
 *           description: Minimum quantity pharmacy must buy
 *           example: 5
 *         unit:
 *           type: string
 *           enum: [bottles, boxes, units, packs]
 *           description: Unit type
 *           example: "bottles"
 *         originalPrice:
 *           type: number
 *           format: float
 *           description: Original price per unit
 *           example: 15.00
 *         dealPrice:
 *           type: number
 *           format: float
 *           description: Deal price per unit
 *           example: 12.00
 *         savings:
 *           type: integer
 *           description: Savings percentage
 *           example: 20
 *         margin:
 *           type: integer
 *           description: Margin percentage
 *           example: 80
 *         distributorId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: Distributor ID reference
 *         distributor:
 *           type: string
 *           description: Distributor name
 *           example: "MediSupply Corp"
 *         expiryDate:
 *           type: string
 *           format: date
 *           description: Product expiry date
 *           example: "2025-06-30"
 *         postedDate:
 *           type: string
 *           format: date
 *           description: Deal posted date
 *           example: "2024-12-10"
 *         status:
 *           type: string
 *           enum: [active, sold, expired]
 *           description: Deal status
 *           example: "active"
 *         notes:
 *           type: string
 *           nullable: true
 *           description: Additional notes
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *         isDealOfTheDay:
 *           type: boolean
 *           description: Whether this deal is set as Deal of the Day
 *         dealOfTheDayUntil:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Expiration timestamp for Deal of the Day status
 *         isDealOfTheWeek:
 *           type: boolean
 *           description: Whether this deal is set as Deal of the Week
 *         dealOfTheWeekUntil:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Expiration timestamp for Deal of the Week status
 *         isDealOfTheMonth:
 *           type: boolean
 *           description: Whether this deal is set as Deal of the Month
 *         dealOfTheMonthUntil:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Expiration timestamp for Deal of the Month status
 *     
 *     MarketplaceStats:
 *       type: object
 *       properties:
 *         totalDeals:
 *           type: integer
 *           description: Total number of deals
 *           example: 25
 *         activeDeals:
 *           type: integer
 *           description: Number of active deals
 *           example: 18
 *         soldDeals:
 *           type: integer
 *           description: Number of sold deals
 *           example: 5
 *         expiredDeals:
 *           type: integer
 *           description: Number of expired deals
 *           example: 2
 *         totalItems:
 *           type: integer
 *           description: Total quantity of items
 *           example: 5000
 *         totalValue:
 *           type: number
 *           format: float
 *           description: Total value of all deals
 *           example: 75000.00
 *         avgSavings:
 *           type: number
 *           format: float
 *           description: Average savings percentage
 *           example: 22.5
 *     
 *     CategoryOption:
 *       type: object
 *       properties:
 *         value:
 *           type: string
 *           description: Category value
 *           example: "Pain Relief"
 *         label:
 *           type: string
 *           description: Category display label
 *           example: "Pain Relief"
 *         count:
 *           type: integer
 *           description: Number of deals in category
 *           example: 5
 *     
 *     CreateDealRequest:
 *       type: object
 *       required:
 *         - productName
 *         - category
 *         - quantity
 *         - unit
 *         - originalPrice
 *         - dealPrice
 *         - distributorName
 *         - expiryDate
 *       properties:
 *         productName:
 *           type: string
 *           description: Product name
 *           example: "Ibuprofen 200mg"
 *         category:
 *           type: string
 *           description: Product category
 *           example: "Pain Relief"
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           description: Available quantity
 *           example: 500
 *         unit:
 *           type: string
 *           enum: [bottles, boxes, units, packs]
 *           description: Unit type
 *           example: "bottles"
 *         originalPrice:
 *           type: number
 *           format: float
 *           minimum: 0.01
 *           description: Original price per unit
 *           example: 15.00
 *         dealPrice:
 *           type: number
 *           format: float
 *           minimum: 0.01
 *           description: Deal price per unit (must be less than original)
 *           example: 12.00
 *         distributorName:
 *           type: string
 *           description: Distributor name
 *           example: "MediSupply Corp"
 *         expiryDate:
 *           type: string
 *           format: date
 *           description: Product expiry date (must be future)
 *           example: "2025-06-30"
 *         ndc:
 *           type: string
 *           description: Optional NDC code
 *           example: "00069-0600-66"
 *         distributorId:
 *           type: string
 *           format: uuid
 *           description: Optional distributor ID reference
 *         notes:
 *           type: string
 *           description: Additional notes
 *         minimumBuyQuantity:
 *           type: integer
 *           minimum: 1
 *           description: Minimum quantity pharmacy must buy (default 1)
 *           example: 5
 *     
 *     UpdateDealRequest:
 *       type: object
 *       properties:
 *         productName:
 *           type: string
 *           description: Product name
 *         category:
 *           type: string
 *           description: Product category
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           description: Available quantity
 *         unit:
 *           type: string
 *           enum: [bottles, boxes, units, packs]
 *           description: Unit type
 *         originalPrice:
 *           type: number
 *           format: float
 *           description: Original price per unit
 *         dealPrice:
 *           type: number
 *           format: float
 *           description: Deal price per unit
 *         distributorName:
 *           type: string
 *           description: Distributor name
 *         expiryDate:
 *           type: string
 *           format: date
 *           description: Product expiry date
 *         ndc:
 *           type: string
 *           description: NDC code
 *         status:
 *           type: string
 *           enum: [active, sold, expired]
 *           description: Deal status
 *         notes:
 *           type: string
 *           description: Additional notes
 *         minimumBuyQuantity:
 *           type: integer
 *           minimum: 1
 *           description: Minimum quantity pharmacy must buy
 *     
 *     MarketplaceListResponse:
 *       type: object
 *       properties:
 *         deals:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/MarketplaceDeal'
 *         stats:
 *           $ref: '#/components/schemas/MarketplaceStats'
 *         pagination:
 *           type: object
 *           properties:
 *             page:
 *               type: integer
 *               example: 1
 *             limit:
 *               type: integer
 *               example: 12
 *             total:
 *               type: integer
 *               example: 25
 *             totalPages:
 *               type: integer
 *               example: 3
 */

// ============================================================
// Routes
// ============================================================

/**
 * @swagger
 * /api/admin/marketplace:
 *   get:
 *     summary: Get list of marketplace deals with stats
 *     description: |
 *       Returns a paginated list of marketplace deals with filtering, search, and sorting options.
 *       Also includes statistics about deals.
 *       
 *       **Available Status:**
 *       - **active**: Deal is currently available
 *       - **sold**: Deal has been sold
 *       - **expired**: Deal has expired (auto-updated based on expiry date)
 *     tags: [Admin - Marketplace]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 12
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by product name, distributor, deal number, or category
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, active, sold, expired]
 *         description: Filter by status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [product_name, category, distributor, status, posted_date, expiry_date, deal_price, quantity]
 *           default: posted_date
 *         description: Sort by field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Marketplace deals retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/MarketplaceListResponse'
 *       401:
 *         description: Unauthorized - invalid or missing admin token
 *       500:
 *         description: Internal server error
 */
router.get('/', getMarketplaceDealsHandler);

/**
 * @swagger
 * /api/admin/marketplace/stats:
 *   get:
 *     summary: Get marketplace statistics
 *     description: Returns statistics about marketplace deals.
 *     tags: [Admin - Marketplace]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
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
 *                       $ref: '#/components/schemas/MarketplaceStats'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/stats', getMarketplaceStatsHandler);

/**
 * @swagger
 * /api/admin/marketplace/categories:
 *   get:
 *     summary: Get all marketplace categories
 *     description: Returns all unique categories with deal counts.
 *     tags: [Admin - Marketplace]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
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
 *                     categories:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CategoryOption'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/categories', getMarketplaceCategoriesHandler);

// ============================================================
// Featured Deal Routes (Unified for Day, Week, Month)
// MUST be before /:id routes
// ============================================================

/**
 * @swagger
 * /api/admin/marketplace/deal-of-the-day:
 *   get:
 *     summary: Get Featured Deal info
 *     description: |
 *       Returns information about the current Featured Deal.
 *       Use the `type` query parameter to specify day, week, or month.
 *       
 *       **Type Options:**
 *       - `day` - Deal of the Day (default)
 *       - `week` - Deal of the Week
 *       - `month` - Deal of the Month
 *     tags: [Admin - Marketplace]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: day
 *         description: Featured deal type
 *     responses:
 *       200:
 *         description: Featured deal info retrieved successfully
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
 *                     type:
 *                       type: string
 *                       example: day
 *                     typeLabel:
 *                       type: string
 *                       example: Day
 *                     deal:
 *                       $ref: '#/components/schemas/MarketplaceDeal'
 *                     manualDeal:
 *                       type: object
 *                       nullable: true
 *                     hasManualSelection:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/deal-of-the-day', getDealOfTheDayInfoHandler);

/**
 * @swagger
 * /api/admin/marketplace/deal-of-the-day:
 *   delete:
 *     summary: Unset Featured Deal
 *     description: |
 *       Removes the current Featured Deal status.
 *       System will fall back to automatic selection.
 *       
 *       **Type Options:**
 *       - `day` - Deal of the Day (default)
 *       - `week` - Deal of the Week
 *       - `month` - Deal of the Month
 *     tags: [Admin - Marketplace]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: day
 *         description: Featured deal type to unset
 *     responses:
 *       200:
 *         description: Featured deal removed successfully
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
 *                   example: Deal of the Day removed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       example: day
 *                     dealsUnset:
 *                       type: integer
 *                       example: 1
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete('/deal-of-the-day', unsetDealOfTheDayHandler);

/**
 * @swagger
 * /api/admin/marketplace/deals/{id}/set-deal-of-the-day:
 *   post:
 *     summary: Set Featured Deal
 *     description: |
 *       Sets a specific deal as a Featured Deal (Day, Week, or Month).
 *       Automatically unsets the previous featured deal of the same type.
 *       Only active deals with remaining quantity can be set.
 *       
 *       **Type Options:**
 *       - `day` - Deal of the Day (default)
 *       - `week` - Deal of the Week
 *       - `month` - Deal of the Month
 *     tags: [Admin - Marketplace]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Deal ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [day, week, month]
 *                 default: day
 *                 description: Featured deal type
 *                 example: day
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Optional expiration timestamp. If not set, stays until manually changed.
 *                 example: "2024-12-31T23:59:59Z"
 *     responses:
 *       200:
 *         description: Featured deal set successfully
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
 *                   example: Deal of the Day updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     dealId:
 *                       type: string
 *                       format: uuid
 *                     productName:
 *                       type: string
 *                     type:
 *                       type: string
 *                       example: day
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *       400:
 *         description: Bad request - deal not active or invalid type
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/deals/:id/set-deal-of-the-day', setDealOfTheDayHandler);

/**
 * @swagger
 * /api/admin/marketplace/featured-deals:
 *   get:
 *     summary: Get all featured deals info
 *     description: |
 *       Returns information about all featured deals:
 *       Deal of the Day, Deal of the Week, and Deal of the Month.
 *       Useful for admin dashboard to see all featured deals at once.
 *     tags: [Admin - Marketplace]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Featured deals info retrieved successfully
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
 *                     dealOfTheDay:
 *                       $ref: '#/components/schemas/MarketplaceDeal'
 *                       nullable: true
 *                     dealOfTheWeek:
 *                       $ref: '#/components/schemas/MarketplaceDeal'
 *                       nullable: true
 *                     dealOfTheMonth:
 *                       $ref: '#/components/schemas/MarketplaceDeal'
 *                       nullable: true
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/featured-deals', getAllFeaturedDealsInfoHandler);

/**
 * @swagger
 * /api/admin/marketplace/{id}:
 *   get:
 *     summary: Get marketplace deal by ID
 *     description: Returns detailed information about a specific deal.
 *     tags: [Admin - Marketplace]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Deal ID
 *     responses:
 *       200:
 *         description: Deal retrieved successfully
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
 *                     deal:
 *                       $ref: '#/components/schemas/MarketplaceDeal'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Deal not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', getMarketplaceDealByIdHandler);

/**
 * @swagger
 * /api/admin/marketplace:
 *   post:
 *     summary: Create new marketplace deal
 *     description: |
 *       Creates a new marketplace deal.
 *       
 *       **Validation Rules:**
 *       - Deal price must be less than original price
 *       - Expiry date must be in the future
 *       - Quantity must be greater than 0
 *     tags: [Admin - Marketplace]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDealRequest'
 *     responses:
 *       201:
 *         description: Deal created successfully
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
 *                   example: Deal created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     deal:
 *                       $ref: '#/components/schemas/MarketplaceDeal'
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/', uploadImage.single('image') as any, createMarketplaceDealHandler);

/**
 * @swagger
 * /api/admin/marketplace/{id}:
 *   patch:
 *     summary: Update marketplace deal
 *     description: |
 *       Updates an existing deal. Only provided fields will be updated.
 *       
 *       **Image Upload:**
 *       - Send as `multipart/form-data`
 *       - Use field name `image` for the file
 *       - Supported formats: JPG, PNG, GIF, WebP
 *       - Max file size: 5MB
 *       
 *       **Alternative:**
 *       - Send as `application/json` with `imageUrl` field (if you already have the image URL)
 *     tags: [Admin - Marketplace]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Deal ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               productName:
 *                 type: string
 *                 description: Product name
 *               category:
 *                 type: string
 *                 description: Product category
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 description: Available quantity
 *               minimumBuyQuantity:
 *                 type: integer
 *                 minimum: 1
 *                 description: Minimum quantity pharmacy must buy
 *               unit:
 *                 type: string
 *                 enum: [bottles, boxes, units, packs]
 *                 description: Unit type
 *               originalPrice:
 *                 type: number
 *                 format: float
 *                 description: Original price per unit
 *               dealPrice:
 *                 type: number
 *                 format: float
 *                 description: Deal price per unit
 *               distributorName:
 *                 type: string
 *                 description: Distributor name
 *               expiryDate:
 *                 type: string
 *                 format: date
 *                 description: Product expiry date
 *               ndc:
 *                 type: string
 *                 description: NDC code
 *               status:
 *                 type: string
 *                 enum: [active, sold, expired]
 *                 description: Deal status
 *               notes:
 *                 type: string
 *                 description: Additional notes
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Product image file (JPG, PNG, GIF, WebP - max 5MB)
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateDealRequest'
 *     responses:
 *       200:
 *         description: Deal updated successfully
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
 *                   example: Deal updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     deal:
 *                       $ref: '#/components/schemas/MarketplaceDeal'
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Deal not found
 *       500:
 *         description: Internal server error
 */
router.patch('/:id', uploadImage.single('image') as any, updateMarketplaceDealHandler);

/**
 * @swagger
 * /api/admin/marketplace/{id}/sold:
 *   patch:
 *     summary: Mark deal as sold
 *     description: Quick action to mark a deal as sold.
 *     tags: [Admin - Marketplace]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Deal ID
 *     responses:
 *       200:
 *         description: Deal marked as sold successfully
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
 *                   example: Deal marked as sold successfully
 *       400:
 *         description: Bad request - deal already sold or expired
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Deal not found
 *       500:
 *         description: Internal server error
 */
router.patch('/:id/sold', markDealAsSoldHandler);

/**
 * @swagger
 * /api/admin/marketplace/{id}:
 *   delete:
 *     summary: Delete marketplace deal
 *     description: Deletes a deal from the marketplace.
 *     tags: [Admin - Marketplace]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Deal ID to delete
 *     responses:
 *       200:
 *         description: Deal deleted successfully
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
 *                   example: Deal deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Deal not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', deleteMarketplaceDealHandler);

export default router;

