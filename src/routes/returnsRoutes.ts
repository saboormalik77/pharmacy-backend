import express from 'express';
import {
  createReturnHandler,
  getReturnsHandler,
  getReturnByIdHandler,
  updateReturnHandler,
  deleteReturnHandler,
  checkLockStatusHandler,
} from '../controllers/returnsController';

const router = express.Router();

/**
 * @swagger
 * /api/returns:
 *   post:
 *     summary: Create a new return with items
 *     tags: [Returns]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateReturnRequest'
 *     responses:
 *       201:
 *         description: Return created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Return'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', createReturnHandler);

/**
 * @swagger
 * /api/returns:
 *   get:
 *     summary: Get all returns
 *     tags: [Returns]
 *     parameters:
 *       - in: query
 *         name: pharmacy_id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: Pharmacy ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, ready_to_ship, in_transit, processing, completed, cancelled]
 *         description: Filter by status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Number of returns to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of returns to skip
 *     responses:
 *       200:
 *         description: List of returns
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReturnsListResponse'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', getReturnsHandler);

/**
 * @swagger
 * /api/returns/{id}:
 *   get:
 *     summary: Get return by ID
 *     tags: [Returns]
 *     parameters:
 *       - in: query
 *         name: pharmacy_id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: Pharmacy ID
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Return ID
 *     responses:
 *       200:
 *         description: Return details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Return'
 *       404:
 *         description: Return not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', getReturnByIdHandler);

/**
 * @swagger
 * /api/returns/{id}:
 *   patch:
 *     summary: Update return
 *     tags: [Returns]
 *     parameters:
 *       - in: query
 *         name: pharmacy_id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: Pharmacy ID
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Return ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateReturnRequest'
 *     responses:
 *       200:
 *         description: Return updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Return'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id', updateReturnHandler);

/**
 * @swagger
 * /api/returns/{id}:
 *   delete:
 *     summary: Delete return
 *     tags: [Returns]
 *     parameters:
 *       - in: query
 *         name: pharmacy_id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: Pharmacy ID
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Return ID
 *     responses:
 *       204:
 *         description: Return deleted successfully
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', deleteReturnHandler);

/**
 * @swagger
 * /api/returns/{id}/lock-status:
 *   get:
 *     summary: Check if return is locked for editing
 *     tags: [Returns]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Return ID
 *     responses:
 *       200:
 *         description: Lock status information
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
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     status:
 *                       type: string
 *                     isLocked:
 *                       type: boolean
 *                     canEdit:
 *                       type: boolean
 *                     lockReason:
 *                       type: string
 *                       nullable: true
 */
router.get('/:id/lock-status', checkLockStatusHandler);

export default router;

