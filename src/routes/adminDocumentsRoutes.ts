import { Router } from 'express';
import {
  getDocumentsHandler,
  getDocumentByIdHandler,
  deleteDocumentHandler,
} from '../controllers/adminDocumentsController';
import { authenticateAdmin, requirePermission } from '../middleware/adminAuth';

const router = Router();

// Apply admin authentication middleware to all routes
router.use(authenticateAdmin);
router.use(requirePermission('documents'));

/**
 * @swagger
 * /api/admin/documents:
 *   get:
 *     summary: Get list of all documents with stats
 *     description: |
 *       Returns a paginated list of all uploaded documents with search and filter options.
 *       Includes pharmacy information, reverse distributor details, AND statistics.
 *       **Stats are included in the response** (totalDocuments, totalFileSize, totalCreditAmount, byStatus, bySource, recentUploads).
 *     tags: [Admin - Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by pharmacy name, owner name, file name, or document ID
 *         example: "HealthFirst"
 *       - in: query
 *         name: pharmacy_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by specific pharmacy ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page (max 100)
 *         example: 20
 *     responses:
 *       200:
 *         description: List of documents with stats retrieved successfully
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
 *                     documents:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           fileName:
 *                             type: string
 *                           fileSize:
 *                             type: integer
 *                           fileType:
 *                             type: string
 *                           fileUrl:
 *                             type: string
 *                           source:
 *                             type: string
 *                           status:
 *                             type: string
 *                           uploadedAt:
 *                             type: string
 *                             format: date-time
 *                           processedAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                           extractedItems:
 *                             type: integer
 *                           totalCreditAmount:
 *                             type: number
 *                             nullable: true
 *                           reportDate:
 *                             type: string
 *                             format: date
 *                             nullable: true
 *                           pharmacyId:
 *                             type: string
 *                             format: uuid
 *                           pharmacyName:
 *                             type: string
 *                           pharmacyOwner:
 *                             type: string
 *                           pharmacyEmail:
 *                             type: string
 *                           reverseDistributorId:
 *                             type: string
 *                             format: uuid
 *                             nullable: true
 *                           reverseDistributorName:
 *                             type: string
 *                             nullable: true
 *                           reverseDistributorCode:
 *                             type: string
 *                             nullable: true
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
 *                         pharmacyId:
 *                           type: string
 *                           nullable: true
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalDocuments:
 *                           type: integer
 *                           example: 156
 *                         totalFileSize:
 *                           type: integer
 *                           description: Total file size in bytes
 *                           example: 524288000
 *                         totalCreditAmount:
 *                           type: number
 *                           example: 45678.50
 *                         byStatus:
 *                           type: object
 *                           example:
 *                             completed: 120
 *                             processing: 10
 *                             failed: 5
 *                         bySource:
 *                           type: object
 *                           example:
 *                             manual_upload: 100
 *                             email_forward: 30
 *                         recentUploads:
 *                           type: integer
 *                           description: Uploads in last 7 days
 *                           example: 23
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized - invalid or missing token
 */
router.get('/', getDocumentsHandler);

/**
 * @swagger
 * /api/admin/documents/{id}:
 *   get:
 *     summary: Get single document details
 *     description: |
 *       Returns detailed information about a specific document including
 *       file info, pharmacy details, and reverse distributor information.
 *     tags: [Admin - Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Document details retrieved successfully
 *       404:
 *         description: Document not found
 *       401:
 *         description: Unauthorized - invalid or missing token
 */
router.get('/:id', getDocumentByIdHandler);

/**
 * @swagger
 * /api/admin/documents/{id}:
 *   delete:
 *     summary: Delete a document
 *     description: |
 *       Permanently deletes a document from the system.
 *       This action cannot be undone.
 *     tags: [Admin - Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Document deleted successfully
 *       404:
 *         description: Document not found
 *       401:
 *         description: Unauthorized - invalid or missing token
 */
router.delete('/:id', deleteDocumentHandler);

export default router;
