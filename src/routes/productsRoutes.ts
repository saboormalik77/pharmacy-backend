import express from 'express';
import {
  validateNDCHandler,
  searchProductsHandler,
  createProductHandler,
} from '../controllers/productsController';

const router = express.Router();

/**
 * @swagger
 * /api/products/validate:
 *   post:
 *     summary: Validate NDC format and lookup product
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ValidateNDCRequest'
 *     responses:
 *       200:
 *         description: NDC is valid and product found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidateNDCResponse'
 *       400:
 *         description: Invalid NDC format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: NDC not found in database
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidateNDCResponse'
 */
router.post('/validate', validateNDCHandler);

/**
 * @swagger
 * /api/products/validate:
 *   get:
 *     summary: Validate NDC format and lookup product (GET method)
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: ndc
 *         required: true
 *         description: NDC code to validate (format XXXXX-XXXX-XX)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: NDC is valid and product found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidateNDCResponse'
 *       400:
 *         description: Invalid NDC format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: NDC not found in database
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidateNDCResponse'
 */
router.get('/validate', validateNDCHandler);

/**
 * @swagger
 * /api/products/search:
 *   get:
 *     summary: Search products by name, NDC, or manufacturer
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: search
 *         required: true
 *         schema:
 *           type: string
 *         description: Search term (product name, NDC, or manufacturer)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Maximum number of results to return
 *     responses:
 *       200:
 *         description: List of matching products
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductsSearchResponse'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/search', searchProductsHandler);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create or update a product
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProductRequest'
 *     responses:
 *       201:
 *         description: Product created or updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', createProductHandler);

export default router;

