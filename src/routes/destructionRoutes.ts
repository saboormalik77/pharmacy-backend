import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authenticateAdmin, requirePermission } from '../middleware/adminAuth';
import {
  listHandler,
  pendingHandler,
  statsHandler,
  getHandler,
  createHandler,
  updateHandler,
} from '../controllers/destructionController';

const authenticateAny = async (req: any, res: any, next: any) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return next();

  await authenticateAdmin(req, res, async (adminErr: any) => {
    if (!adminErr) return next();
    await authenticate(req, res, next);
  });
};

const router = Router();

router.use(authenticateAny);
router.use((req, res, next) => {
  if (!req.adminId) return next();
  return requirePermission('destruction')(req, res, next);
});

/**
 * @swagger
 * tags:
 *   - name: Destruction Records
 *     description: Management of items routed to destruction (Module 6)
 */

/**
 * @swagger
 * /api/admin/destruction:
 *   get:
 *     summary: List destruction records
 *     tags: [Destruction Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: pharmacy_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, scheduled, picked_up, destroyed, cancelled] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by NDC, product name, or manufacturer
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: List of destruction records with pagination
 */
router.get('/', listHandler);

/**
 * @swagger
 * /api/admin/destruction/pending:
 *   get:
 *     summary: Get items awaiting destruction (pending + scheduled)
 *     tags: [Destruction Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: pharmacy_id
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Pending destruction items
 */
router.get('/pending', pendingHandler);

/**
 * @swagger
 * /api/admin/destruction/stats:
 *   get:
 *     summary: Get destruction statistics (counts by status)
 *     tags: [Destruction Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: pharmacy_id
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Statistics object with counts per status
 */
router.get('/stats', statsHandler);

/**
 * @swagger
 * /api/admin/destruction/{id}:
 *   get:
 *     summary: Get a single destruction record
 *     tags: [Destruction Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Destruction record details
 *       404:
 *         description: Record not found
 */
router.get('/:id', getHandler);

/**
 * @swagger
 * /api/admin/destruction:
 *   post:
 *     summary: Create a destruction record (when item is marked for destruction)
 *     tags: [Destruction Records]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pharmacyId]
 *             properties:
 *               pharmacyId: { type: string, format: uuid }
 *               transactionItemId: { type: string, format: uuid }
 *               ndc: { type: string }
 *               productName: { type: string }
 *               manufacturer: { type: string }
 *               lotNumber: { type: string }
 *               quantity: { type: integer, default: 1 }
 *               weightLbs: { type: number }
 *               destructionReason: { type: string, default: non_returnable }
 *               destructionCompany: { type: string }
 *               scheduledDate: { type: string, format: date }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Destruction record created
 *       400:
 *         description: Validation error
 */
router.post('/', createHandler);

/**
 * @swagger
 * /api/admin/destruction/{id}:
 *   patch:
 *     summary: Update a destruction record (pickup date, form number, status, etc.)
 *     tags: [Destruction Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string, enum: [pending, scheduled, picked_up, destroyed, cancelled] }
 *               federalFormNumber: { type: string }
 *               destructionCompany: { type: string }
 *               scheduledDate: { type: string, format: date }
 *               pickedUpAt: { type: string, format: date-time }
 *               destroyedAt: { type: string, format: date-time }
 *               formUrl: { type: string }
 *               weightLbs: { type: number }
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Updated destruction record
 *       404:
 *         description: Record not found
 */
router.patch('/:id', updateHandler);

export default router;
