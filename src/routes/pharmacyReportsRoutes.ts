import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  listReturnsHandler,
  returnPacketHandler,
  controlledSubstanceHandler,
  destructionControlsHandler,
  destructionNonControlsHandler,
} from '../controllers/pharmacyReportsController';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Pharmacy Reports
 *     description: Return-packet, controlled-substance and proof-of-destruction reports
 */

/**
 * @swagger
 * /api/pharmacy-reports/returns:
 *   get:
 *     summary: List the pharmacy's completed returns for the reports dropdown
 *     tags: [Pharmacy Reports]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: limit, schema: { type: integer, default: 200 } }
 *     responses:
 *       200: { description: OK }
 */
router.get('/returns', listReturnsHandler);

/**
 * @swagger
 * /api/pharmacy-reports/returns/{refNum}/return-packet:
 *   get:
 *     summary: Return packet report for a given license plate / reference number
 *     tags: [Pharmacy Reports]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: refNum, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Return not found }
 */
router.get('/returns/:refNum/return-packet', returnPacketHandler);

/**
 * @swagger
 * /api/pharmacy-reports/returns/{refNum}/controlled-substance:
 *   get:
 *     summary: Controlled Substance report for the given reference number
 *     tags: [Pharmacy Reports]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: refNum, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Return not found }
 */
router.get('/returns/:refNum/controlled-substance', controlledSubstanceHandler);

/**
 * @swagger
 * /api/pharmacy-reports/returns/{refNum}/destruction-controls:
 *   get:
 *     summary: Proof-of-destruction report for CONTROLLED items
 *     tags: [Pharmacy Reports]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: refNum, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Return not found }
 */
router.get('/returns/:refNum/destruction-controls', destructionControlsHandler);

/**
 * @swagger
 * /api/pharmacy-reports/returns/{refNum}/destruction-non-controls:
 *   get:
 *     summary: Proof-of-destruction report for NON-CONTROLLED items
 *     tags: [Pharmacy Reports]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: refNum, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Return not found }
 */
router.get('/returns/:refNum/destruction-non-controls', destructionNonControlsHandler);

export default router;
