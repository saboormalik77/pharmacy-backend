import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createHandler,
  listPharmacyHandler,
  getPharmacyByIdHandler,
  cancelPharmacyHandler,
} from '../controllers/serviceRequestController';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: On-Site Service
 *     description: Pharmacy on-site service (field rep visit) requests
 */

/**
 * @swagger
 * /api/on-site-service:
 *   post:
 *     summary: Create a new on-site service request
 *     tags: [On-Site Service]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [requested_date]
 *             properties:
 *               requested_date:
 *                 type: string
 *                 format: date
 *               branch_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               purpose:
 *                 type: string
 *                 enum: [return_pickup, training, inventory_review, destruction_pickup, other]
 *                 nullable: true
 *               special_instructions:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       201: { description: Created }
 */
router.post('/', createHandler);

/**
 * @swagger
 * /api/on-site-service:
 *   get:
 *     summary: List the pharmacy's on-site service requests
 *     tags: [On-Site Service]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: status,  schema: { type: string } }
 *       - { in: query, name: page,    schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit,   schema: { type: integer, default: 20 } }
 *     responses:
 *       200: { description: OK }
 */
router.get('/', listPharmacyHandler);

/**
 * @swagger
 * /api/on-site-service/{id}:
 *   get:
 *     summary: Get a single on-site service request
 *     tags: [On-Site Service]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: OK }
 *       403: { description: Not your request }
 *       404: { description: Not found }
 */
router.get('/:id', getPharmacyByIdHandler);

/**
 * @swagger
 * /api/on-site-service/{id}/cancel:
 *   post:
 *     summary: Cancel a pending on-site service request
 *     tags: [On-Site Service]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Cancelled }
 */
router.post('/:id/cancel', cancelPharmacyHandler);

export default router;
