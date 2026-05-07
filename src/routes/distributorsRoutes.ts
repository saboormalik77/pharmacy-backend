import express from 'express';
import { getTopDistributorsHandler } from '../controllers/distributorsController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * @swagger
 * /api/distributors/top:
 *   get:
 *     summary: Get top distributors for authenticated pharmacy
 *     description: Returns a list of top distributors ranked by document count, total credit amount, and recent activity. Active status is false if pharmacy has any document with report_date within last 30 days, true otherwise. Pharmacy ID is automatically determined from authentication token.
 *     tags: [Distributors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of top distributors
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
 *                     $ref: '#/components/schemas/TopDistributor'
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
router.get('/top', getTopDistributorsHandler);

export default router;

