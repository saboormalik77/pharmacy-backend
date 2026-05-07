import express from 'express';
import { estimateCreditsHandler } from '../controllers/creditsController';

const router = express.Router();

/**
 * @swagger
 * /api/credits/estimate:
 *   post:
 *     summary: Estimate credits for return items
 *     description: Calculate estimated credit amounts for a list of return items based on NDC, quantity, expiration date, and condition
 *     tags: [Credits]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EstimateCreditsRequest'
 *     responses:
 *       200:
 *         description: Credit estimates calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EstimateCreditsResponse'
 *       400:
 *         description: Bad request - invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/estimate', estimateCreditsHandler);

export default router;

