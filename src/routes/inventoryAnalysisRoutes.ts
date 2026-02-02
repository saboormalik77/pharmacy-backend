/**
 * Inventory Analysis Routes
 * 
 * Routes for uploading inventory files, getting recommendations,
 * and managing inventory reminders.
 */

import { Router } from 'express';
import {
  uploadAndAnalyzeHandler,
  getSummaryHandler,
  getItemsHandler,
  getItemsToReturnHandler,
  getItemsToKeepHandler,
  getUploadsHandler,
  markReturnedHandler,
  dismissItemsHandler,
  getRemindersHandler,
  cancelReminderHandler,
  refreshRecommendationsHandler,
} from '../controllers/inventoryAnalysisController';
import { authenticate } from '../middleware/auth';
import { inventoryUpload } from '../middleware/inventoryUpload';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// ============================================================
// Swagger Schemas
// ============================================================

/**
 * @swagger
 * components:
 *   schemas:
 *     InventoryItemRecommendation:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         ndcCode:
 *           type: string
 *           example: "60219-1748-02"
 *         ndcNormalized:
 *           type: string
 *           example: "60219174802"
 *         productName:
 *           type: string
 *           example: "Atropine Sulfate 1% Ophthalmic Solution"
 *         manufacturer:
 *           type: string
 *           nullable: true
 *         quantity:
 *           type: integer
 *           example: 10
 *         fullUnits:
 *           type: integer
 *           example: 8
 *         partialUnits:
 *           type: integer
 *           example: 2
 *         expirationDate:
 *           type: string
 *           format: date
 *           nullable: true
 *         lotNumber:
 *           type: string
 *           nullable: true
 *         recommendationType:
 *           type: string
 *           enum: [return_now, keep, monitor, no_data]
 *           description: |
 *             - return_now: High value, recommend returning immediately
 *             - keep: Low value, recommend keeping in inventory
 *             - monitor: Moderate value, watch for price changes
 *             - no_data: No pricing data available
 *         recommendedDistributor:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             name:
 *               type: string
 *               example: "Return Solutions, Inc."
 *             email:
 *               type: string
 *             phone:
 *               type: string
 *             location:
 *               type: string
 *         estimatedReturnValue:
 *           type: number
 *           format: float
 *           example: 245.50
 *         bestFullPrice:
 *           type: number
 *           format: float
 *           example: 28.00
 *         bestPartialPrice:
 *           type: number
 *           format: float
 *           example: 5.50
 *         confidenceScore:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *           example: 85
 *         reason:
 *           type: string
 *           example: "High return value of $245.50 available from Return Solutions, Inc."
 *     
 *     InventoryAnalysisResult:
 *       type: object
 *       properties:
 *         uploadId:
 *           type: string
 *           format: uuid
 *         totalItems:
 *           type: integer
 *           example: 150
 *         itemsToReturn:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/InventoryItemRecommendation'
 *         itemsToKeep:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/InventoryItemRecommendation'
 *         itemsNoData:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/InventoryItemRecommendation'
 *         totalPotentialValue:
 *           type: number
 *           format: float
 *           example: 2500.75
 *         summary:
 *           type: object
 *           properties:
 *             returnNow:
 *               type: integer
 *               example: 45
 *             keep:
 *               type: integer
 *               example: 80
 *             monitor:
 *               type: integer
 *               example: 15
 *             noData:
 *               type: integer
 *               example: 10
 *         generatedAt:
 *           type: string
 *           format: date-time
 *     
 *     InventorySummary:
 *       type: object
 *       properties:
 *         totalItems:
 *           type: integer
 *           example: 150
 *         itemsToReturn:
 *           type: integer
 *           example: 45
 *         itemsToKeep:
 *           type: integer
 *           example: 105
 *         totalPotentialValue:
 *           type: number
 *           format: float
 *           example: 2500.75
 *         itemsByRecommendation:
 *           type: object
 *           additionalProperties:
 *             type: integer
 *           example:
 *             return_now: 45
 *             keep: 80
 *             monitor: 15
 *             no_data: 10
 *         topReturnItems:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               ndcCode:
 *                 type: string
 *               productName:
 *                 type: string
 *               quantity:
 *                 type: integer
 *               estimatedReturnValue:
 *                 type: number
 *               recommendedDistributor:
 *                 type: string
 *               expirationDate:
 *                 type: string
 *         upcomingExpirations:
 *           type: integer
 *           description: Number of items expiring in next 90 days
 *           example: 12
 *     
 *     InventoryReminder:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         pharmacyId:
 *           type: string
 *           format: uuid
 *         reminderType:
 *           type: string
 *           enum: [monthly_review, expiration_warning, return_opportunity, price_increase]
 *         title:
 *           type: string
 *           example: "Inventory Return Reminder - $2,500.75 Potential Value"
 *         message:
 *           type: string
 *         totalItems:
 *           type: integer
 *         totalPotentialValue:
 *           type: number
 *         itemsSummary:
 *           type: array
 *           items:
 *             type: object
 *         scheduledFor:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           enum: [pending, sent, cancelled, failed]
 *     
 *     UploadRecord:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         fileName:
 *           type: string
 *         fileType:
 *           type: string
 *           enum: [csv, pdf, txt]
 *         fileSize:
 *           type: integer
 *         totalItems:
 *           type: integer
 *         totalValue:
 *           type: number
 *         itemsToReturn:
 *           type: integer
 *         itemsToKeep:
 *           type: integer
 *         status:
 *           type: string
 *           enum: [processing, completed, failed]
 *         errorMessage:
 *           type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 */

// ============================================================
// Routes
// ============================================================

/**
 * @swagger
 * /api/inventory-analysis/upload:
 *   post:
 *     summary: Upload and analyze inventory file
 *     description: |
 *       Upload a CSV, TXT, or PDF file containing your pharmacy inventory.
 *       The system will:
 *       1. Parse the file and extract inventory items (NDC codes, quantities, etc.)
 *       2. Look up current return prices from all distributors
 *       3. Generate recommendations for each item (return now, keep, or monitor)
 *       4. Schedule a monthly reminder to follow up on items
 *       
 *       **Supported File Formats:**
 *       - **CSV**: Must have columns for NDC code. Optional: product name, quantity, full, partial, expiration, lot number
 *       - **TXT**: System will auto-detect NDC codes in the text
 *       - **PDF**: Uses AI to extract inventory items from the document
 *       
 *       **Response includes:**
 *       - Items recommended for immediate return (high value)
 *       - Items recommended to keep (low value)
 *       - Items with no pricing data available
 *       - Total potential return value
 *     tags: [Inventory Analysis]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Inventory file (CSV, TXT, or PDF, max 10MB)
 *     responses:
 *       200:
 *         description: Inventory analyzed successfully
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
 *                   example: "Successfully analyzed 150 inventory items"
 *                 data:
 *                   $ref: '#/components/schemas/InventoryAnalysisResult'
 *       400:
 *         description: Bad request - invalid file type or parsing error
 *       401:
 *         description: Unauthorized
 */
router.post('/upload', inventoryUpload.single('file'), uploadAndAnalyzeHandler);

/**
 * @swagger
 * /api/inventory-analysis/summary:
 *   get:
 *     summary: Get inventory analysis summary
 *     description: |
 *       Get a dashboard summary of your analyzed inventory including:
 *       - Total items analyzed
 *       - Items recommended for return
 *       - Total potential return value
 *       - Top items to return
 *       - Upcoming expirations
 *     tags: [Inventory Analysis]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/InventorySummary'
 *       401:
 *         description: Unauthorized
 */
router.get('/summary', getSummaryHandler);

/**
 * @swagger
 * /api/inventory-analysis/items:
 *   get:
 *     summary: Get inventory items with filters
 *     description: Get all analyzed inventory items with optional filters for status, recommendation type, etc.
 *     tags: [Inventory Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, returned, expired, dismissed]
 *           default: active
 *         description: Filter by item status
 *       - in: query
 *         name: recommendation_type
 *         schema:
 *           type: string
 *           enum: [return_now, keep, monitor, no_data]
 *         description: Filter by recommendation type
 *       - in: query
 *         name: upload_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by specific upload batch
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by NDC code or product name
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 200
 *         description: Number of items per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of items to skip
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [estimated_return_value, product_name, expiration_date, created_at]
 *           default: estimated_return_value
 *         description: Sort field
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/InventoryItemRecommendation'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         offset:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/items', getItemsHandler);

/**
 * @swagger
 * /api/inventory-analysis/items/return:
 *   get:
 *     summary: Get items recommended for return
 *     description: |
 *       Get all inventory items that are recommended for immediate return.
 *       These are items with high return value that should be sent to distributors.
 *       
 *       **Response includes a message like:**
 *       "You have 45 products recommended for return with a total potential value of $2,500.75"
 *     tags: [Inventory Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           default: estimated_return_value
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Items to return retrieved successfully
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
 *                   example: "You have 45 products recommended for return with a total potential value of $2,500.75"
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/InventoryItemRecommendation'
 *                     totalPotentialValue:
 *                       type: number
 *                       example: 2500.75
 *                     pagination:
 *                       type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/items/return', getItemsToReturnHandler);

/**
 * @swagger
 * /api/inventory-analysis/items/keep:
 *   get:
 *     summary: Get items recommended to keep
 *     description: Get inventory items that are recommended to keep due to low return value.
 *     tags: [Inventory Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Items to keep retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/items/keep', getItemsToKeepHandler);

/**
 * @swagger
 * /api/inventory-analysis/uploads:
 *   get:
 *     summary: Get upload history
 *     description: Get history of all inventory file uploads with their analysis results.
 *     tags: [Inventory Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Upload history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     uploads:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/UploadRecord'
 *                     pagination:
 *                       type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/uploads', getUploadsHandler);

/**
 * @swagger
 * /api/inventory-analysis/items/mark-returned:
 *   post:
 *     summary: Mark items as returned
 *     description: |
 *       Mark inventory items as returned to a distributor.
 *       This removes them from the active recommendations and records the return.
 *     tags: [Inventory Analysis]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemIds
 *               - distributorId
 *             properties:
 *               itemIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Array of inventory item IDs to mark as returned
 *                 example: ["uuid-1", "uuid-2"]
 *               distributorId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the distributor items were returned to
 *               actualReturnValue:
 *                 type: number
 *                 description: Actual amount received from the return (optional)
 *                 example: 245.50
 *     responses:
 *       200:
 *         description: Items marked as returned successfully
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
 *                   example: "Successfully marked 5 items as returned"
 *                 data:
 *                   type: object
 *                   properties:
 *                     updated:
 *                       type: integer
 *       400:
 *         description: Bad request - missing required fields
 *       401:
 *         description: Unauthorized
 */
router.post('/items/mark-returned', markReturnedHandler);

/**
 * @swagger
 * /api/inventory-analysis/items/dismiss:
 *   post:
 *     summary: Dismiss items from recommendations
 *     description: |
 *       Dismiss inventory items so they no longer appear in recommendations.
 *       Use this for items you don't want to return or track anymore.
 *     tags: [Inventory Analysis]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemIds
 *             properties:
 *               itemIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Array of inventory item IDs to dismiss
 *     responses:
 *       200:
 *         description: Items dismissed successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/items/dismiss', dismissItemsHandler);

/**
 * @swagger
 * /api/inventory-analysis/reminders:
 *   get:
 *     summary: Get inventory reminders
 *     description: |
 *       Get scheduled reminders for inventory follow-ups.
 *       Reminders are automatically created when you upload inventory and notify you monthly about items that should be returned.
 *     tags: [Inventory Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, sent, cancelled, failed]
 *         description: Filter by reminder status
 *     responses:
 *       200:
 *         description: Reminders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     reminders:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/InventoryReminder'
 *                     total:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/reminders', getRemindersHandler);

/**
 * @swagger
 * /api/inventory-analysis/reminders/{id}:
 *   delete:
 *     summary: Cancel a reminder
 *     description: Cancel a pending reminder so it won't be sent.
 *     tags: [Inventory Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Reminder ID
 *     responses:
 *       200:
 *         description: Reminder cancelled successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.delete('/reminders/:id', cancelReminderHandler);

/**
 * @swagger
 * /api/inventory-analysis/refresh:
 *   post:
 *     summary: Refresh recommendations with latest pricing
 *     description: |
 *       Re-analyze existing inventory items to update recommendations based on the latest pricing data.
 *       Use this to check if prices have changed since your last upload.
 *     tags: [Inventory Analysis]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               uploadId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional - refresh only items from a specific upload
 *     responses:
 *       200:
 *         description: Recommendations refreshed successfully
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
 *                   example: "Successfully refreshed 150 items with latest pricing"
 *                 data:
 *                   type: object
 *                   properties:
 *                     updated:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.post('/refresh', refreshRecommendationsHandler);

export default router;

