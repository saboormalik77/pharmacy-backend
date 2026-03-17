import express from 'express';
import { authenticateAdmin } from '../middleware/adminAuth';
import * as emailController from '../controllers/emailManagementController';

const router = express.Router();

/**
 * @swagger
 * /api/admin/emails/logs:
 *   get:
 *     summary: List email logs with filtering and pagination
 *     tags: [Email Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [sent, delivered, bounced, failed, complained]
 *         description: Filter by email status
 *       - in: query
 *         name: emailType
 *         schema:
 *           type: string
 *           enum: [ra-request, ra-reminder]
 *         description: Filter by email type
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter emails from this date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter emails to this date
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in memo number, pharmacy name, or recipient email
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
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Email logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EmailLogWithMemoInfo'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 */
router.get('/logs', authenticateAdmin, emailController.listEmailLogsHandler);

/**
 * @swagger
 * /api/admin/emails/logs/{id}:
 *   get:
 *     summary: Get detailed email log by ID
 *     tags: [Email Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Email log ID
 *     responses:
 *       200:
 *         description: Email log retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/EmailLogWithMemoInfo'
 */
router.get('/logs/:id', authenticateAdmin, emailController.getEmailLogHandler);

/**
 * @swagger
 * /api/admin/emails/stats:
 *   get:
 *     summary: Get email delivery statistics
 *     tags: [Email Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Statistics from this date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Statistics to this date
 *     responses:
 *       200:
 *         description: Email statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/EmailStats'
 */
router.get('/stats', authenticateAdmin, emailController.getEmailStatsHandler);

/**
 * @swagger
 * /api/admin/emails/stats/by-type:
 *   get:
 *     summary: Get email statistics grouped by type
 *     tags: [Email Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: emailType
 *         schema:
 *           type: string
 *           enum: [ra-request, ra-reminder]
 *         description: Filter by specific email type
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Statistics from this date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Statistics to this date
 *     responses:
 *       200:
 *         description: Email statistics by type retrieved successfully
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
 *                   additionalProperties:
 *                     $ref: '#/components/schemas/EmailStats'
 */
router.get('/stats/by-type', authenticateAdmin, emailController.getEmailStatsByTypeHandler);

/**
 * @swagger
 * /api/admin/emails/logs/{id}/retry:
 *   post:
 *     summary: Retry a failed or bounced email
 *     tags: [Email Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Email log ID
 *     responses:
 *       200:
 *         description: Email retry initiated successfully
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
 *                   example: Email retry initiated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     newEmailId:
 *                       type: string
 */
router.post('/logs/:id/retry', authenticateAdmin, emailController.retryEmailHandler);

/**
 * @swagger
 * /api/admin/emails/logs/{id}/resolve:
 *   post:
 *     summary: Mark an email issue as resolved
 *     tags: [Email Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Email log ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Resolution notes
 *     responses:
 *       200:
 *         description: Email marked as resolved successfully
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
 *                   example: Email marked as resolved successfully
 */
router.post('/logs/:id/resolve', authenticateAdmin, emailController.resolveEmailHandler);

/**
 * @swagger
 * /api/admin/emails/health:
 *   get:
 *     summary: Get comprehensive email system health report
 *     tags: [Email Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email health report retrieved successfully
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
 *                     overall:
 *                       $ref: '#/components/schemas/EmailStats'
 *                     byType:
 *                       type: object
 *                       additionalProperties:
 *                         $ref: '#/components/schemas/EmailStats'
 *                     recentIssues:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/EmailLogWithMemoInfo'
 *                     recommendations:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.get('/health', authenticateAdmin, emailController.getEmailHealthHandler);

/**
 * @swagger
 * /api/admin/emails/test:
 *   post:
 *     summary: Send a test email for verification
 *     tags: [Email Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - to
 *             properties:
 *               to:
 *                 type: string
 *                 format: email
 *                 description: Recipient email address
 *               templateType:
 *                 type: string
 *                 enum: [ra-request, ra-reminder]
 *                 default: ra-request
 *                 description: Type of test email to send
 *     responses:
 *       200:
 *         description: Test email sent successfully
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
 *                   example: Test ra-request email sent successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     emailId:
 *                       type: string
 *                     recipient:
 *                       type: string
 *                     templateType:
 *                       type: string
 */
router.post('/test', authenticateAdmin, emailController.sendTestEmailHandler);

export default router;