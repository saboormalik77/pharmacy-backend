import { Router } from 'express';
import {
  getWarehousesHandler,
  getDefaultWarehouseHandler,
  createWarehouseHandler,
  updateWarehouseHandler,
  deleteWarehouseHandler,
} from '../controllers/warehouseManagementController';
import { authenticateAdmin, requirePermission } from '../middleware/adminAuth';

const router = Router();

// Apply admin authentication to all routes
router.use(authenticateAdmin);

// ============================================================
// Swagger Schemas
// ============================================================

/**
 * @swagger
 * components:
 *   schemas:
 *     Warehouse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Warehouse unique identifier
 *         name:
 *           type: string
 *           description: Warehouse name
 *           example: "Main Distribution Center"
 *         contactName:
 *           type: string
 *           nullable: true
 *           description: Contact person name
 *           example: "John Doe"
 *         phone:
 *           type: string
 *           nullable: true
 *           description: Contact phone number
 *           example: "4695557890"
 *         street:
 *           type: string
 *           nullable: true
 *           description: Street address
 *           example: "14951 Dallas Pkwy, Suite 300"
 *         city:
 *           type: string
 *           nullable: true
 *           description: City
 *           example: "Addison"
 *         state:
 *           type: string
 *           nullable: true
 *           description: State/Province
 *           example: "TX"
 *         zip:
 *           type: string
 *           nullable: true
 *           description: ZIP/Postal code
 *           example: "75001"
 *         country:
 *           type: string
 *           description: Country code
 *           example: "US"
 *         isActive:
 *           type: boolean
 *           description: Whether warehouse is active
 *         isDefault:
 *           type: boolean
 *           description: Whether this is the default warehouse
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 */

// ============================================================
// Routes
// ============================================================

/**
 * @swagger
 * /api/admin/warehouse-management:
 *   get:
 *     summary: Get all warehouses (MainAdmin only)
 *     description: Returns all warehouses in the system. Only accessible to MainAdmin users.
 *     tags: [Warehouse Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Warehouses retrieved successfully
 *       403:
 *         description: Access denied - not MainAdmin
 *       500:
 *         description: Internal server error
 */
router.get('/', getWarehousesHandler);

/**
 * @swagger
 * /api/admin/warehouse-management/default:
 *   get:
 *     summary: Get default warehouse
 *     description: Returns the default warehouse for system operations.
 *     tags: [Warehouse Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Default warehouse retrieved successfully
 *       404:
 *         description: No default warehouse found
 *       500:
 *         description: Internal server error
 */
router.get('/default', getDefaultWarehouseHandler);

/**
 * @swagger
 * /api/admin/warehouse-management:
 *   post:
 *     summary: Create new warehouse (MainAdmin only)
 *     description: Creates a new warehouse. Only accessible to MainAdmin users.
 *     tags: [Warehouse Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Warehouse created successfully
 *       403:
 *         description: Access denied - not MainAdmin
 *       500:
 *         description: Internal server error
 */
router.post('/', createWarehouseHandler);

/**
 * @swagger
 * /api/admin/warehouse-management/{id}:
 *   patch:
 *     summary: Update warehouse (MainAdmin only)
 *     description: Updates an existing warehouse. Only accessible to MainAdmin users.
 *     tags: [Warehouse Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Warehouse ID
 *     responses:
 *       200:
 *         description: Warehouse updated successfully
 *       403:
 *         description: Access denied - not MainAdmin
 *       404:
 *         description: Warehouse not found
 *       500:
 *         description: Internal server error
 */
router.patch('/:id', updateWarehouseHandler);

/**
 * @swagger
 * /api/admin/warehouse-management/{id}:
 *   delete:
 *     summary: Delete warehouse (MainAdmin only)
 *     description: Deletes a warehouse. Only accessible to MainAdmin users.
 *     tags: [Warehouse Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Warehouse ID
 *       - in: query
 *         name: hardDelete
 *         schema:
 *           type: boolean
 *         description: Whether to perform hard delete
 *     responses:
 *       200:
 *         description: Warehouse deleted successfully
 *       403:
 *         description: Access denied - not MainAdmin
 *       404:
 *         description: Warehouse not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', deleteWarehouseHandler);

export default router;