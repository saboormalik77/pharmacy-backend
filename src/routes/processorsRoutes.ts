import { Router } from 'express';
import {
  getProcessorsHandler,
  getProcessorByIdHandler,
  createProcessorHandler,
  updateProcessorHandler,
  deleteProcessorHandler,
  getProcessorStoresHandler,
  assignStoresHandler,
  unassignStoreHandler,
} from '../controllers/processorsController';
import { authenticateAdmin } from '../middleware/adminAuth';

const router = Router();

router.use(authenticateAdmin);

// ============================================================
// Swagger Schemas
// ============================================================

/**
 * @swagger
 * components:
 *   schemas:
 *     Processor:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *           example: "John Doe"
 *         email:
 *           type: string
 *           example: "john@example.com"
 *         phone:
 *           type: string
 *           example: "(555) 111-2222"
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *         notes:
 *           type: string
 *           nullable: true
 *         assignedStoresCount:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

// ============================================================
// Routes
// ============================================================

/**
 * @swagger
 * /api/admin/processors:
 *   get:
 *     summary: List all processors
 *     tags: [Admin - Processors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, active, inactive]
 *           default: all
 *     responses:
 *       200:
 *         description: List of processors
 */
router.get('/', getProcessorsHandler);

/**
 * @swagger
 * /api/admin/processors:
 *   post:
 *     summary: Create a new processor
 *     tags: [Admin - Processors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 description: Processor's full name
 *               email:
 *                 type: string
 *                 description: Email used for login to admin panel
 *               password:
 *                 type: string
 *                 description: Password for admin panel login (min 8 chars)
 *               phone:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Processor created with admin login account
 *       409:
 *         description: Email already exists
 */
router.post('/', createProcessorHandler);

/**
 * @swagger
 * /api/admin/processors/{id}:
 *   get:
 *     summary: Get processor by ID
 *     tags: [Admin - Processors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Processor details
 *       404:
 *         description: Not found
 */
router.get('/:id', getProcessorByIdHandler);

/**
 * @swagger
 * /api/admin/processors/{id}:
 *   patch:
 *     summary: Update processor
 *     tags: [Admin - Processors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated
 *       404:
 *         description: Not found
 *       409:
 *         description: Email already exists
 */
router.patch('/:id', updateProcessorHandler);

/**
 * @swagger
 * /api/admin/processors/{id}:
 *   delete:
 *     summary: Deactivate processor (soft delete)
 *     tags: [Admin - Processors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Deactivated
 */
router.delete('/:id', deleteProcessorHandler);

/**
 * @swagger
 * /api/admin/processors/{id}/stores:
 *   get:
 *     summary: Get stores assigned to a processor
 *     tags: [Admin - Processors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of assigned stores
 */
router.get('/:id/stores', getProcessorStoresHandler);

/**
 * @swagger
 * /api/admin/processors/{id}/assign-stores:
 *   post:
 *     summary: Assign stores to a processor
 *     tags: [Admin - Processors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pharmacyIds
 *             properties:
 *               pharmacyIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Stores assigned
 *       404:
 *         description: Processor or pharmacy not found
 */
router.post('/:id/assign-stores', assignStoresHandler);

/**
 * @swagger
 * /api/admin/processors/{id}/stores/{pharmacyId}:
 *   delete:
 *     summary: Unassign a store from processor
 *     tags: [Admin - Processors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: pharmacyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Store unassigned
 */
router.delete('/:id/stores/:pharmacyId', unassignStoreHandler);

export default router;
