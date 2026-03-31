import express from 'express';
import {
  getDistributorsHandler,
  getDistributorByIdHandler,
  createDistributorHandler,
  updateDistributorHandler,
  updateDistributorStatusHandler,
  deleteDistributorHandler,
  getDistributorProductsHandler,
} from '../controllers/adminDistributorsController';
import { authenticateAdmin, requirePermission } from '../middleware/adminAuth';

const router = express.Router();

// All routes require admin authentication
router.use(authenticateAdmin);
router.use(requirePermission('distributors'));

/**
 * @swagger
 * components:
 *   schemas:
 *     DistributorStats:
 *       type: object
 *       properties:
 *         totalDistributors:
 *           type: integer
 *           example: 11
 *         activeDistributors:
 *           type: integer
 *           example: 10
 *         inactiveDistributors:
 *           type: integer
 *           example: 1
 *         totalDeals:
 *           type: integer
 *           example: 45
 * 
 *     DistributorListItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         companyName:
 *           type: string
 *           example: "MediSupply Corp"
 *         contactPerson:
 *           type: string
 *           example: "Robert Wilson"
 *         email:
 *           type: string
 *           example: "robert@medisupply.com"
 *         phone:
 *           type: string
 *           example: "(555) 111-2222"
 *         address:
 *           type: string
 *           example: "100 Medical Plaza"
 *         city:
 *           type: string
 *           example: "Boston"
 *         state:
 *           type: string
 *           example: "MA"
 *         zipCode:
 *           type: string
 *           example: "02101"
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *         licenseNumber:
 *           type: string
 *           example: "MA-DIST-001"
 *         specializations:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Antibiotics", "Pain Relief"]
 *         totalDeals:
 *           type: integer
 *           example: 28
 *         createdAt:
 *           type: string
 *           format: date-time
 * 
 *     DistributorDetails:
 *       allOf:
 *         - $ref: '#/components/schemas/DistributorListItem'
 *         - type: object
 *           properties:
 *             code:
 *               type: string
 *               example: "MEDI"
 *             portalUrl:
 *               type: string
 *               example: "https://portal.medisupply.com"
 *             supportedFormats:
 *               type: array
 *               items:
 *                 type: string
 *               example: ["PDF", "CSV"]
 *             feeRates:
 *               type: object
 *               example: {"30": {"percentage": 13.4, "reportDate": "2025-09-23"}}
 * 
 *     CreateDistributorRequest:
 *       type: object
 *       required:
 *         - companyName
 *       properties:
 *         companyName:
 *           type: string
 *           example: "New Distributor Inc"
 *         contactPerson:
 *           type: string
 *           example: "John Smith"
 *         email:
 *           type: string
 *           example: "john@newdist.com"
 *         phone:
 *           type: string
 *           example: "(555) 999-0000"
 *         address:
 *           type: string
 *           example: "500 Commerce St"
 *         city:
 *           type: string
 *           example: "Chicago"
 *         state:
 *           type: string
 *           example: "IL"
 *         zipCode:
 *           type: string
 *           example: "60601"
 *         licenseNumber:
 *           type: string
 *           example: "IL-DIST-500"
 *         specializations:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Vitamins", "Supplements"]
 * 
 *     UpdateDistributorRequest:
 *       type: object
 *       properties:
 *         companyName:
 *           type: string
 *         contactPerson:
 *           type: string
 *         email:
 *           type: string
 *         phone:
 *           type: string
 *         address:
 *           type: string
 *         city:
 *           type: string
 *         state:
 *           type: string
 *         zipCode:
 *           type: string
 *         licenseNumber:
 *           type: string
 *         specializations:
 *           type: array
 *           items:
 *             type: string
 * 
 *     UpdateDistributorStatusRequest:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *           example: "inactive"
 */

/**
 * @swagger
 * /api/admin/distributors:
 *   get:
 *     summary: Get list of distributors with stats
 *     description: |
 *       Returns paginated list of distributors with search and filter options.
 *       **Stats are included in the response** (totalDistributors, activeDistributors, inactiveDistributors, totalDeals).
 *     tags: [Admin - Distributors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by company name, contact person, email, or ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, active, inactive]
 *           default: all
 *         description: Filter by status
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
 *           default: 20
 *           maximum: 100
 *         description: Items per page (max 100)
 *     responses:
 *       200:
 *         description: List of distributors with stats
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
 *                     distributors:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/DistributorListItem'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                     filters:
 *                       type: object
 *                       properties:
 *                         search:
 *                           type: string
 *                           nullable: true
 *                         status:
 *                           type: string
 *                     stats:
 *                       $ref: '#/components/schemas/DistributorStats'
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized - Invalid or missing admin token
 *       500:
 *         description: Internal server error
 */
router.get('/', getDistributorsHandler);

/**
 * @swagger
 * /api/admin/distributors/{id}:
 *   get:
 *     summary: Get distributor by ID
 *     description: Returns detailed information about a specific distributor
 *     tags: [Admin - Distributors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Distributor ID
 *     responses:
 *       200:
 *         description: Distributor details
 *       401:
 *         description: Unauthorized - Invalid or missing admin token
 *       404:
 *         description: Distributor not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', getDistributorByIdHandler);

/**
 * @swagger
 * /api/admin/distributors/{id}/products:
 *   get:
 *     summary: Get unique products for a distributor
 *     description: |
 *       Returns unique products (by NDC) for a specific distributor.
 *       Only the latest record per NDC based on report_date is returned.
 *     tags: [Admin - Distributors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Distributor ID
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
 *           default: 50
 *           maximum: 100
 *         description: Items per page (max 100)
 *     responses:
 *       200:
 *         description: Unique products for the distributor
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
 *                     distributor:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         name:
 *                           type: string
 *                     products:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           reportId:
 *                             type: string
 *                             format: uuid
 *                           ndcCode:
 *                             type: string
 *                             example: "16729-0317-01"
 *                           productName:
 *                             type: string
 *                             example: "Oxybutynin 5mg ER Tablet"
 *                           manufacturer:
 *                             type: string
 *                             example: "ACCORD HEALTHCARE"
 *                           creditAmount:
 *                             type: number
 *                             example: 1.94
 *                           pricePerUnit:
 *                             type: number
 *                             example: 1.94
 *                           quantity:
 *                             type: integer
 *                             example: 1
 *                           fullUnits:
 *                             type: integer
 *                             example: 1
 *                           partialUnits:
 *                             type: integer
 *                             example: 0
 *                           lotNumber:
 *                             type: string
 *                             example: "M2215878"
 *                           expirationDate:
 *                             type: string
 *                             example: "2025-10-31"
 *                           packageSize:
 *                             type: string
 *                             example: "100"
 *                           reportDate:
 *                             type: string
 *                             format: date
 *                             example: "2025-09-04"
 *                           fileName:
 *                             type: string
 *                             example: "returnreports-9_4_25.pdf"
 *                           pharmacyId:
 *                             type: string
 *                             format: uuid
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized - Invalid or missing admin token
 *       404:
 *         description: Distributor not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id/products', getDistributorProductsHandler);

/**
 * @swagger
 * /api/admin/distributors:
 *   post:
 *     summary: Create a new distributor
 *     description: Creates a new reverse distributor
 *     tags: [Admin - Distributors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDistributorRequest'
 *     responses:
 *       201:
 *         description: Distributor created successfully
 *       400:
 *         description: Bad request - Invalid data
 *       401:
 *         description: Unauthorized - Invalid or missing admin token
 *       500:
 *         description: Internal server error
 */
router.post('/', createDistributorHandler);

/**
 * @swagger
 * /api/admin/distributors/{id}:
 *   put:
 *     summary: Update distributor details
 *     description: Updates an existing distributor's information
 *     tags: [Admin - Distributors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Distributor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateDistributorRequest'
 *     responses:
 *       200:
 *         description: Distributor updated successfully
 *       400:
 *         description: Bad request - Invalid data
 *       401:
 *         description: Unauthorized - Invalid or missing admin token
 *       404:
 *         description: Distributor not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', updateDistributorHandler);

/**
 * @swagger
 * /api/admin/distributors/{id}/status:
 *   put:
 *     summary: Update distributor status
 *     description: Activates or deactivates a distributor
 *     tags: [Admin - Distributors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Distributor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateDistributorStatusRequest'
 *     responses:
 *       200:
 *         description: Distributor status updated successfully
 *       400:
 *         description: Bad request - Invalid status
 *       401:
 *         description: Unauthorized - Invalid or missing admin token
 *       404:
 *         description: Distributor not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id/status', updateDistributorStatusHandler);

/**
 * @swagger
 * /api/admin/distributors/{id}:
 *   delete:
 *     summary: Delete a distributor
 *     description: Deletes a distributor (only if they have no existing deals)
 *     tags: [Admin - Distributors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Distributor ID
 *     responses:
 *       200:
 *         description: Distributor deleted successfully
 *       400:
 *         description: Bad request - Cannot delete distributor with existing deals
 *       401:
 *         description: Unauthorized - Invalid or missing admin token
 *       404:
 *         description: Distributor not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', deleteDistributorHandler);

export default router;
