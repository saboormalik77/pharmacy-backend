import express from 'express';
import { processReturnReportHandler, getReturnReportsByDistributorAndNdcHandler } from '../controllers/returnReportController';
import { upload } from '../middleware/upload';

const router = express.Router();

/**
 * @swagger
 * /api/return-reports/process:
 *   post:
 *     summary: Process return report PDF and extract structured data using Azure OpenAI
 *     description: Upload a PDF file containing a pharmacy return report. The API will extract text from the PDF and use Azure OpenAI to extract structured JSON data including distributor info, pharmacy info, returned items, prices, expiry dates, and more.
 *     tags: [Return Reports]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - pharmacy_id
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: PDF file containing the return report (max 10MB)
 *               pharmacy_id:
 *                 type: string
 *                 format: uuid
 *                 description: Pharmacy ID (can also be provided as query parameter)
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               reverse_distributor_id:
 *                 type: string
 *                 format: uuid
 *                 description: Optional reverse distributor ID. If not provided, the system will attempt to find or create one based on the extracted distributor information.
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *     parameters:
 *       - in: query
 *         name: pharmacy_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Pharmacy ID (alternative to providing in form data)
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Return report processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReturnReportResponse'
 *             example:
 *               status: success
 *               message: Return report processed successfully
 *               data:
 *                 distributor: ABC Distributors
 *                 pharmacy: City Pharmacy
 *                 reportDate: 2024-01-15
 *                 returnNumber: RET-2024-001
 *                 items:
 *                   - itemName: Medication A
 *                     itemCode: MED-A-001
 *                     quantity: 10
 *                     unitPrice: 25.50
 *                     totalPrice: 255.00
 *                     expiryDate: 2024-03-15
 *                     reason: Expired
 *                     batchNumber: BATCH-001
 *                 totalAmount: 255.00
 *                 totalItems: 1
 *                 notes: Return processed successfully
 *       400:
 *         description: Bad request - invalid file, missing file, or file is not a PDF
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missingFile:
 *                 value:
 *                   status: fail
 *                   message: Please upload a PDF file
 *               invalidFileType:
 *                 value:
 *                   status: fail
 *                   message: Only PDF files are allowed
 *       500:
 *         description: Internal server error - PDF processing or AI extraction failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: error
 *               message: Failed to extract structured data from PDF
 */
router.post('/process', upload.single('file') as any, processReturnReportHandler);

/**
 * @swagger
 * /api/return-reports/search:
 *   get:
 *     summary: Get matching return report records by distributor ID and NDC code
 *     description: Retrieves all return report records that match the specified distributor ID and NDC code, grouped by report date
 *     tags: [Return Reports]
 *     parameters:
 *       - in: query
 *         name: distributor_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Reverse distributor ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: query
 *         name: ndc_code
 *         required: true
 *         schema:
 *           type: string
 *         description: NDC code to search for
 *         example: "65862-0218-60"
 *       - in: query
 *         name: pharmacy_id
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Pharmacy ID to filter return reports by pharmacy
 *         example: "244261d5-e7f5-4205-84b6-fd3314ee73e6"
 *       - in: query
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *           enum: [full, partial]
 *         description: Filter by unit type - 'full' to match records with full > 0, 'partial' to match records with partial > 0. Returns the record with maximum full/partial value per date group.
 *         example: "full"
 *       - in: query
 *         name: format
 *         required: false
 *         schema:
 *           type: string
 *           enum: [graph, default]
 *           default: default
 *         description: Response format - 'graph' for chart-friendly format, 'default' for grouped format
 *     responses:
 *       200:
 *         description: Return reports retrieved successfully
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
 *                   example: Return reports retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       reportDate:
 *                         type: string
 *                         format: date
 *                         nullable: true
 *                         example: "2025-04-01"
 *                       ndcCode:
 *                         type: string
 *                         example: "65862-0218-60"
 *                       count:
 *                         type: integer
 *                         example: 5
 *                       records:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: uuid
 *                             document_id:
 *                               type: string
 *                               format: uuid
 *                             pharmacy_id:
 *                               type: string
 *                               format: uuid
 *                             data:
 *                               type: object
 *                               description: Return report item data (NDC code, item name, quantity, credit amount, etc.)
 *                             report_date:
 *                               type: string
 *                               format: date
 *                               nullable: true
 *                             created_at:
 *                               type: string
 *                               format: date-time
 *                 totalMatches:
 *                   type: integer
 *                   description: Total number of matching records across all report dates
 *                   example: 10
 *       200 (graph format):
 *         description: Return reports retrieved successfully in graph format
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
 *                   example: Return reports retrieved successfully in graph format
 *                 data:
 *                   type: object
 *                   properties:
 *                     ndcCode:
 *                       type: string
 *                       example: "21922-0016-05"
 *                     itemName:
 *                       type: string
 *                       example: "Clobetasol 0.05% Topical Cream"
 *                     dataPoints:
 *                       type: array
 *                       description: Array of data points sorted chronologically by report date
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                             example: "2025-09-04"
 *                           pricePerUnit:
 *                             type: number
 *                             example: 10.88
 *                           quantity:
 *                             type: number
 *                             example: 1
 *                           creditAmount:
 *                             type: number
 *                             example: 10.88
 *                           recordId:
 *                             type: string
 *                             format: uuid
 *                           itemName:
 *                             type: string
 *                           expirationDate:
 *                             type: string
 *                           lotNumber:
 *                             type: string
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalRecords:
 *                           type: integer
 *                         dateRange:
 *                           type: object
 *                           properties:
 *                             earliest:
 *                               type: string
 *                               format: date
 *                             latest:
 *                               type: string
 *                               format: date
 *                         priceStats:
 *                           type: object
 *                           properties:
 *                             min:
 *                               type: number
 *                             max:
 *                               type: number
 *                             average:
 *                               type: number
 *                         totalQuantity:
 *                           type: number
 *                         totalCreditAmount:
 *                           type: number
 *       400:
 *         description: Bad request - missing required query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missingDistributorId:
 *                 value:
 *                   status: fail
 *                   message: distributor_id query parameter is required
 *               missingNdcCode:
 *                 value:
 *                   status: fail
 *                   message: ndc_code query parameter is required
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/search', getReturnReportsByDistributorAndNdcHandler as any);

export default router;

