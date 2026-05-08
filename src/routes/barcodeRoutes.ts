import { Router } from 'express';
import {
  generateSingleBarcode,
  generateMultipleBarcodesHandler,
} from '../controllers/barcodeController';
import { authenticateAdmin } from '../middleware/adminAuth';

const router = Router();

// ============================================================
// General Barcode Generation Routes
// ============================================================

/**
 * @swagger
 * /barcodes/generate/{value}:
 *   get:
 *     summary: Generate barcode for any value
 *     tags: [Barcodes]
 *     parameters:
 *       - in: path
 *         name: value
 *         required: true
 *         schema: { type: string }
 *         description: Value to encode in barcode
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [CODE128, CODE39, EAN13, EAN8, UPC] }
 *         description: Barcode format (auto-detected if not specified)
 *       - in: query
 *         name: width
 *         schema: { type: integer, minimum: 1, maximum: 10 }
 *         description: Bar width multiplier
 *       - in: query
 *         name: height
 *         schema: { type: integer, minimum: 20, maximum: 300 }
 *         description: Barcode height in pixels
 *       - in: query
 *         name: displayValue
 *         schema: { type: boolean }
 *         description: Show text below barcode
 *       - in: query
 *         name: fontSize
 *         schema: { type: integer, minimum: 8, maximum: 24 }
 *         description: Font size for displayed text
 *       - in: query
 *         name: background
 *         schema: { type: string }
 *         description: Background color (hex or name)
 *       - in: query
 *         name: lineColor
 *         schema: { type: string }
 *         description: Barcode line color (hex or name)
 *     responses:
 *       200:
 *         description: Barcode image
 *         content:
 *           image/png:
 *             description: PNG barcode image
 *       400:
 *         description: Invalid barcode value or parameters
 */
router.get('/generate/:value', authenticateAdmin, generateSingleBarcode);

/**
 * @swagger
 * /barcodes/generate-multiple:
 *   post:
 *     summary: Generate multiple barcodes as ZIP file
 *     tags: [Barcodes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [values]
 *             properties:
 *               values:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 100
 *                 description: Array of values to encode (max 100)
 *               options:
 *                 type: object
 *                 properties:
 *                   format:
 *                     type: string
 *                     enum: [CODE128, CODE39, EAN13, EAN8, UPC]
 *                   width:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 10
 *                   height:
 *                     type: integer
 *                     minimum: 20
 *                     maximum: 300
 *                   displayValue:
 *                     type: boolean
 *                   fontSize:
 *                     type: integer
 *                     minimum: 8
 *                     maximum: 24
 *                   background:
 *                     type: string
 *                   lineColor:
 *                     type: string
 *     responses:
 *       200:
 *         description: ZIP file containing barcode images
 *         content:
 *           application/zip:
 *             description: ZIP archive with PNG barcode files
 *       400:
 *         description: Invalid request or barcode values
 */
router.post('/generate-multiple', authenticateAdmin, generateMultipleBarcodesHandler);

export default router;