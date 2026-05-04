import { Router } from 'express';
import { authenticateAdmin } from '../middleware/adminAuth';
import {
  listAdminHandler,
  getAdminByIdHandler,
  adminReassignHandler,
} from '../controllers/serviceRequestController';

const router = Router();

router.use(authenticateAdmin);

/**
 * @swagger
 * tags:
 *   - name: Admin Service Requests
 *     description: Admin oversight for on-site service requests
 */

router.get('/', listAdminHandler);
router.get('/:id', getAdminByIdHandler);

/**
 * @swagger
 * /api/admin/service-requests/{id}/reassign:
 *   post:
 *     summary: Clear the current claim and reassign to a new set of processors
 *     tags: [Admin Service Requests]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [processor_ids]
 *             properties:
 *               processor_ids:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *     responses:
 *       200: { description: Reassigned }
 */
router.post('/:id/reassign', adminReassignHandler);

export default router;
