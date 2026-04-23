import { Router } from 'express';
import { authenticateProcessor } from '../middleware/processorAuth';
import {
  listProcessorHandler,
  getProcessorByIdHandler,
  processorScheduleHandler,
  processorCompleteHandler,
  processorCancelHandler,
  processorReleaseHandler,
} from '../controllers/serviceRequestController';

const router = Router();

router.use(authenticateProcessor);

/**
 * @swagger
 * tags:
 *   - name: Processor Service Requests
 *     description: Field rep endpoints for on-site service requests
 */

/**
 * @swagger
 * /api/processors/service-requests:
 *   get:
 *     summary: List service requests visible to this processor
 *     description: |
 *       Returns requests the processor is eligible to claim, plus any requests
 *       the processor has already claimed. Once another processor claims a
 *       request, it disappears from this list.
 *     tags: [Processor Service Requests]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.get('/', listProcessorHandler);

router.get('/:id', getProcessorByIdHandler);

/**
 * @swagger
 * /api/processors/service-requests/{id}/schedule:
 *   post:
 *     summary: Claim and schedule a service request
 *     tags: [Processor Service Requests]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [scheduled_date]
 *             properties:
 *               scheduled_date: { type: string, format: date }
 *               notes:          { type: string, nullable: true }
 *     responses:
 *       200: { description: Scheduled }
 *       403: { description: Not eligible }
 *       409: { description: Already claimed by another processor }
 */
router.post('/:id/schedule', processorScheduleHandler);

router.post('/:id/complete', processorCompleteHandler);
router.post('/:id/cancel',   processorCancelHandler);
router.post('/:id/release',  processorReleaseHandler);

export default router;
