import { Router } from 'express';
import { getAdminRecentActivityHandler, markAllActivitiesAsReadHandler, markActivityAsReadHandler } from '../controllers/adminRecentActivityController';
import { authenticateAdmin } from '../middleware/adminAuth';

const router = Router();

// Apply admin authentication middleware to all routes
router.use(authenticateAdmin);

/**
 * @swagger
 * /api/admin/recent-activity:
 *   get:
 *     summary: Get admin recent activity
 *     description: Returns recent activity records for the admin dashboard including document uploads product additions and new pharmacy registrations. Activities are recorded automatically via database triggers. Supports filtering by activity type and pharmacy ID and pagination via limit and offset parameters. Use the filter parameter to quickly switch between views.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [notifications, recentactivity]
 *         description: Quick filter option. Use notifications for only pharmacy_registered records, or recentactivity for all activity types
 *         example: notifications
 *       - in: query
 *         name: activityType
 *         schema:
 *           type: string
 *           enum: [document_uploaded, product_added, pharmacy_registered]
 *         description: Filter by activity type. If not provided returns all types. When filter is notifications this is overridden to pharmacy_registered
 *         example: document_uploaded
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of records to return. Default 20 max 100
 *         example: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Offset for pagination default 0
 *         example: 0
 *       - in: query
 *         name: pharmacyId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter activities by specific pharmacy ID
 *         example: "3e19f01d-511d-421f-9cc6-ed83d33e034d"
 *     responses:
 *       200:
 *         description: Recent activity data retrieved successfully
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
 *                     activities:
 *                       type: array
 *                       description: List of recent activity records
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                             example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                           activityType:
 *                             type: string
 *                             enum: [document_uploaded, product_added, pharmacy_registered]
 *                             example: document_uploaded
 *                           entityId:
 *                             type: string
 *                             format: uuid
 *                             description: ID of the document or product
 *                             example: "d1e2f3a4-b5c6-7890-defg-hi1234567890"
 *                           entityName:
 *                             type: string
 *                             description: Name of the document file or product
 *                             example: "returns_report_2025.pdf"
 *                           metadata:
 *                             type: object
 *                             description: Additional details about the activity
 *                             example: {"file_size": 1024000, "file_type": "application/pdf", "source": "manual_upload"}
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-12-31T10:30:00.000Z"
 *                           isRead:
 *                             type: boolean
 *                             description: Whether the activity has been read by admin
 *                             example: false
 *                           readAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                             description: Timestamp when the activity was marked as read
 *                             example: "2025-12-31T11:00:00.000Z"
 *                           pharmacy:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                                 example: "3e19f01d-511d-421f-9cc6-ed83d33e034d"
 *                               name:
 *                                 type: string
 *                                 example: "John Doe"
 *                               pharmacyName:
 *                                 type: string
 *                                 example: "HealthPlus Pharmacy"
 *                               email:
 *                                 type: string
 *                                 format: email
 *                                 example: "pharmacy@example.com"
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           description: Total number of matching activities
 *                           example: 150
 *                         limit:
 *                           type: integer
 *                           example: 20
 *                         offset:
 *                           type: integer
 *                           example: 0
 *                         hasMore:
 *                           type: boolean
 *                           description: Whether there are more records to fetch
 *                           example: true
 *                     stats:
 *                       type: object
 *                       properties:
 *                         todayCount:
 *                           type: integer
 *                           description: Number of activities today
 *                           example: 12
 *                         thisWeekCount:
 *                           type: integer
 *                           description: Number of activities this week
 *                           example: 45
 *                         totalCount:
 *                           type: integer
 *                           description: Total number of activities
 *                           example: 150
 *                         unreadCount:
 *                           type: integer
 *                           description: Number of unread activities
 *                           example: 25
 *                     filters:
 *                       type: object
 *                       properties:
 *                         activityType:
 *                           type: string
 *                           nullable: true
 *                           description: Activity type filter applied
 *                         pharmacyId:
 *                           type: string
 *                           format: uuid
 *                           nullable: true
 *                           description: Pharmacy ID filter applied
 *                         filter:
 *                           type: string
 *                           nullable: true
 *                           enum: [notifications, recentactivity]
 *                           description: Quick filter applied - notifications or recentactivity
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-12-31T10:30:00.000Z"
 *       400:
 *         description: Invalid activity type provided
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Invalid activity type. Must be "document_uploaded", "product_added", or "pharmacy_registered"
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', getAdminRecentActivityHandler);

/**
 * @swagger
 * /api/admin/recent-activity/mark-all-read:
 *   post:
 *     summary: Mark all admin activities as read
 *     description: Marks all unread activity records as read.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All activities marked as read successfully
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
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: All activities marked as read
 *                     updatedCount:
 *                       type: integer
 *                       description: Number of activities marked as read
 *                       example: 15
 *                     markedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-01-02T10:30:00.000Z"
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/mark-all-read', markAllActivitiesAsReadHandler);

/**
 * @swagger
 * /api/admin/recent-activity/{id}/read:
 *   post:
 *     summary: Mark a single admin activity as read
 *     description: Marks a specific activity record as read.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Activity ID to mark as read
 *         example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *     responses:
 *       200:
 *         description: Activity marked as read successfully
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
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: Activity marked as read
 *                     activityId:
 *                       type: string
 *                       format: uuid
 *                       example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                     markedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-01-02T10:30:00.000Z"
 *       404:
 *         description: Activity not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Activity not found
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/:id/read', markActivityAsReadHandler);

export default router;

