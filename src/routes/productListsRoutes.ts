import { Router } from 'express';
import {
  getProductListItemsHandler,
  addProductListItemHandler,
  updateProductListItemHandler,
  removeItemHandler,
  clearAllProductListItemsHandler,
} from '../controllers/productListsController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * @swagger
 * /api/product-lists/items:
 *   get:
 *     summary: Get all product list items for a pharmacy
 *     tags: [Product Lists]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of product list items
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductListItemsResponse'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/items', getProductListItemsHandler);

/**
 * @swagger
 * /api/product-lists/items:
 *   post:
 *     summary: Add product list item
 *     tags: [Product Lists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddProductListItemRequest'
 *     responses:
 *       201:
 *         description: Item added to product list successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductListItemResponse'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Bad request (missing required fields)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/items', addProductListItemHandler);

/**
 * @swagger
 * /api/product-lists/items/{id}:
 *   put:
 *     summary: Update product list item
 *     tags: [Product Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProductListItemRequest'
 *     responses:
 *       200:
 *         description: Item updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductListItemResponse'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - item does not belong to authenticated pharmacy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/items/:id', updateProductListItemHandler);

/**
 * @swagger
 * /api/product-lists/items/{id}:
 *   delete:
 *     summary: Remove item from product list
 *     tags: [Product Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Item ID
 *     responses:
 *       200:
 *         description: Item removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RemoveItemResponse'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/items/:id', removeItemHandler);

/**
 * @swagger
 * /api/product-lists/items:
 *   delete:
 *     summary: Clear all product list items for authenticated pharmacy
 *     description: Deletes all product list items for the authenticated pharmacy. Pharmacy ID is automatically determined from authentication token.
 *     tags: [Product Lists]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All product list items cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: All product list items cleared successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     deletedCount:
 *                       type: number
 *                       example: 15
 *                       description: Number of items deleted
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/items', clearAllProductListItemsHandler);

export default router;

