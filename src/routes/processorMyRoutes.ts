import { Router } from 'express';
import { getMyStoresHandler } from '../controllers/processorsController';
import { authenticateProcessor } from '../middleware/processorAuth';

const router = Router();

router.use(authenticateProcessor);

/**
 * @swagger
 * /api/processors/my-stores:
 *   get:
 *     summary: Get stores assigned to the logged-in processor
 *     description: |
 *       Returns the list of pharmacies assigned to the currently authenticated processor.
 *       The processor must log in with their admin credentials (role = processor).
 *     tags: [Processors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of assigned stores
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
 *                     stores:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           assignmentId:
 *                             type: string
 *                             format: uuid
 *                           pharmacyId:
 *                             type: string
 *                             format: uuid
 *                           businessName:
 *                             type: string
 *                           storeNumber:
 *                             type: string
 *                             nullable: true
 *                           city:
 *                             type: string
 *                           state:
 *                             type: string
 *                           address:
 *                             type: string
 *                           serviceType:
 *                             type: string
 *                           lastVisitDate:
 *                             type: string
 *                             format: date
 *                             nullable: true
 *                           nextVisitDate:
 *                             type: string
 *                             format: date
 *                             nullable: true
 *                     total:
 *                       type: integer
 *       401:
 *         description: Unauthorized - not authenticated
 *       403:
 *         description: Forbidden - not a processor role
 */
router.get('/my-stores', getMyStoresHandler);

export default router;
