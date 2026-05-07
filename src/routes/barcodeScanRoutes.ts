import { Router } from 'express';
import { scanBarcodeHandler } from '../controllers/returnTransactionItemsController';
import { authenticateAdmin } from '../middleware/adminAuth';
import { authenticateProcessor } from '../middleware/processorAuth';
import { authenticate as authenticatePharmacy } from '../middleware/auth';

const router = Router();

const authenticateAny = async (req: any, res: any, next: any) => {
  try {
    await new Promise<void>((resolve, reject) => {
      authenticateProcessor(req, res, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
    return next();
  } catch {
    // Not a processor — try pharmacy auth
  }
  
  try {
    await new Promise<void>((resolve, reject) => {
      authenticatePharmacy(req, res, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
    return next();
  } catch {
    // Not a pharmacy — fall through to admin auth
  }
  
  authenticateAdmin(req, res, next);
};

/**
 * @swagger
 * /api/barcode/scan:
 *   post:
 *     summary: Parse a GS1 QR code / barcode and look up product info
 *     description: |
 *       Accepts any scanned string (GS1 Digital Link URL, GS1 element string, or raw NDC).
 *       1. Parses GS1 data to extract GTIN, lot, serial, expiry
 *       2. Converts GTIN to NDC candidates
 *       3. Looks up product info via openFDA → RxNav → Azure OpenAI
 *       4. Returns a unified `autoFill` object ready to populate the Add Item form
 *     tags: [Barcode]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [scanData]
 *             properties:
 *               scanData:
 *                 type: string
 *                 description: Scanned GS1 Digital Link URL, element string, or plain NDC
 *                 example: "https://go.gs1.org/01/00343547325060/10/0000054575/21/100000033382?17=251110"
 *     responses:
 *       200:
 *         description: Parsed scan data, product info, and auto-fill fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: object
 *                   properties:
 *                     scan:
 *                       type: object
 *                       description: Raw GS1 parsed fields
 *                     product:
 *                       type: object
 *                       description: Product info from FDA/RxNav/AI
 *                     autoFill:
 *                       type: object
 *                       description: Ready-to-use fields for the Add Item form
 */
router.post('/scan', authenticateAny, scanBarcodeHandler);

export default router;
