import { Router } from 'express';
import {
  createCustomPackageHandler,
  getCustomPackagesHandler,
  getCustomPackageByIdHandler,
  deleteCustomPackageHandler,
  updatePackageStatusHandler,
  addItemsToPackageHandler,
  updatePackageItemHandler,
  deletePackageItemHandler,
} from '../controllers/customPackagesController';

const router = Router();

// Note: Authentication is handled by the parent route (optimizationRoutes)

/**
 * @swagger
 * /api/optimization/custom-packages:
 *   post:
 *     summary: Create a custom package
 *     description: Creates a custom package with specified items and distributor. Pharmacy can create packages from optimization suggestions.
 *     tags: [Optimization]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCustomPackageRequest'
 *     responses:
 *       201:
 *         description: Package created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateCustomPackageResponse'
 *       400:
 *         description: Bad request - validation error or missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', createCustomPackageHandler);

/**
 * @swagger
 * /api/optimization/custom-packages:
 *   get:
 *     summary: Get all custom packages for pharmacy
 *     description: Retrieves all custom packages created by the pharmacy. Supports filtering by status and pagination.
 *     tags: [Optimization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: boolean
 *         description: Filter by package status (true = marked/active, false = draft/inactive)
 *         example: false
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of packages to return
 *         example: 10
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Number of packages to skip (for pagination)
 *         example: 0
 *     responses:
 *       200:
 *         description: Packages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetCustomPackagesResponse'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', getCustomPackagesHandler);

/**
 * @swagger
 * /api/optimization/custom-packages/{id}:
 *   get:
 *     summary: Get a single custom package by ID
 *     description: Retrieves details of a specific custom package including all items.
 *     tags: [Optimization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Package ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Package retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetCustomPackageResponse'
 *       404:
 *         description: Package not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', getCustomPackageByIdHandler);

/**
 * @swagger
 * /api/optimization/custom-packages/{id}:
 *   delete:
 *     summary: Delete a custom package
 *     description: Deletes a custom package. Only draft packages can be deleted.
 *     tags: [Optimization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Package ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Package deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeleteCustomPackageResponse'
 *       400:
 *         description: Cannot delete package (not in draft status) or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               notDraftStatus:
 *                 summary: Package not in draft status
 *                 value:
 *                   status: "error"
 *                   message: "Cannot delete package with status: ready_to_ship. Only draft packages can be deleted."
 *       404:
 *         description: Package not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', deleteCustomPackageHandler);

/**
 * @swagger
 * /api/optimization/custom-packages/{id}/mark-status:
 *   patch:
 *     summary: Mark package as delivered or not delivered
 *     description: |
 *       Marks a custom package as delivered (status = true) or not delivered (status = false).
 *       When marking as delivered, delivery information is required in the request body.
 *       When marking as not delivered, delivery information is cleared.
 *     tags: [Optimization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Package ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: false
 *       description: Delivery information (required when marking as delivered)
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deliveryInfo:
 *                 type: object
 *                 required:
 *                   - deliveryDate
 *                   - receivedBy
 *                 properties:
 *                   deliveryDate:
 *                     type: string
 *                     format: date-time
 *                     description: Date and time when the package was delivered
 *                     example: "2025-12-05T10:30:00Z"
 *                   receivedBy:
 *                     type: string
 *                     description: Name of the person who received the package
 *                     example: "John Doe"
 *                   deliveryCondition:
 *                     type: string
 *                     enum: [good, damaged, partial, missing_items, other]
 *                     default: good
 *                     description: Condition of the package upon delivery
 *                     example: "good"
 *                   deliveryNotes:
 *                     type: string
 *                     description: Additional notes about the delivery
 *                     example: "Package received in good condition"
 *                   trackingNumber:
 *                     type: string
 *                     description: Shipping tracking number
 *                     example: "1Z999AA10123456784"
 *                   carrier:
 *                     type: string
 *                     enum: [UPS, FedEx, USPS, DHL, Other]
 *                     description: Shipping carrier
 *                     example: "UPS"
 *     responses:
 *       200:
 *         description: Package status updated successfully
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
 *                   example: Package marked as delivered successfully
 *                 data:
 *                   $ref: '#/components/schemas/GetCustomPackageResponse'
 *       400:
 *         description: Bad request - missing required delivery information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missingDeliveryInfo:
 *                 value:
 *                   status: fail
 *                   message: Delivery information is required when marking package as delivered
 *               missingDeliveryDate:
 *                 value:
 *                   status: fail
 *                   message: Delivery date is required
 *               missingReceivedBy:
 *                 value:
 *                   status: fail
 *                   message: Received by (person name) is required
 *       404:
 *         description: Package not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id/mark-status', updatePackageStatusHandler);

/**
 * @swagger
 * /api/optimization/custom-packages/{id}/add-items:
 *   patch:
 *     summary: Add or update items in an existing custom package
 *     description: |
 *       Adds or updates items in an existing custom package. Only non-delivered packages (status = false) can be updated.
 *       
 *       **Upsert Behavior:**
 *       - If an item with the same `productId` already exists in the package, the quantities (full/partial) are INCREMENTED
 *       - If the `productId` is new (doesn't exist), the item is inserted as a new item
 *       - If no `productId` is provided, the item is always inserted as new
 *       
 *       All logic is handled by an RPC function with no JavaScript loops.
 *     tags: [Optimization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Package ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 description: Array of items to add or update in the package
 *                 minItems: 1
 *                 items:
 *                   $ref: '#/components/schemas/CustomPackageItem'
 *           examples:
 *             addSingleItem:
 *               summary: Add single item (or update if productId exists)
 *               value:
 *                 items:
 *                   - ndc: "59746017110"
 *                     productId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                     productName: "prednisone 1 MG Oral Tablet"
 *                     full: 0
 *                     partial: 5
 *                     pricePerUnit: 35.42
 *                     totalValue: 177.10
 *             addMultipleItems:
 *               summary: Add multiple items (updates existing productIds)
 *               value:
 *                 items:
 *                   - ndc: "59746017110"
 *                     productId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                     productName: "prednisone 1 MG Oral Tablet"
 *                     full: 2
 *                     partial: 0
 *                     pricePerUnit: 35.42
 *                     totalValue: 70.84
 *                   - ndc: "00187-5115-60"
 *                     productId: "b2c3d4e5-f6a7-8901-bcde-f23456789012"
 *                     productName: "Aspirin 100mg"
 *                     full: 1
 *                     partial: 0
 *                     pricePerUnit: 50.00
 *                     totalValue: 50.00
 *     responses:
 *       200:
 *         description: Items added/updated in package successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/CustomPackage'
 *                 message:
 *                   type: string
 *                   example: "1 item(s) added, 1 item(s) updated"
 *                 itemsAdded:
 *                   type: integer
 *                   description: Number of new items inserted
 *                   example: 1
 *                 itemsUpdated:
 *                   type: integer
 *                   description: Number of existing items with quantities incremented
 *                   example: 1
 *       400:
 *         description: Bad request - validation error, package is delivered, or missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               packageDelivered:
 *                 summary: Package already delivered
 *                 value:
 *                   status: "error"
 *                   message: "Cannot add items to a delivered package. Only non-delivered packages can be updated."
 *               emptyItems:
 *                 summary: Empty items array
 *                 value:
 *                   status: "error"
 *                   message: "Items array is required and cannot be empty"
 *       404:
 *         description: Package not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id/add-items', addItemsToPackageHandler);

/**
 * @swagger
 * /api/optimization/custom-packages/{id}/items/{itemId}:
 *   patch:
 *     summary: Update a single package item
 *     description: |
 *       Updates a single item in a custom package. Only non-delivered packages (status = false) can be updated.
 *       All logic is handled by an RPC function with no JavaScript loops.
 *       
 *       **Note:** Package totals (totalItems, totalEstimatedValue, feeAmount, netEstimatedValue) are automatically recalculated.
 *     tags: [Optimization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Package ID
 *       - in: path
 *         name: itemId
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
 *             type: object
 *             properties:
 *               ndc:
 *                 type: string
 *                 description: NDC code
 *                 example: "59746017110"
 *               productName:
 *                 type: string
 *                 description: Product name
 *                 example: "prednisone 1 MG Oral Tablet"
 *               full:
 *                 type: integer
 *                 description: Number of full units
 *                 example: 5
 *               partial:
 *                 type: integer
 *                 description: Number of partial units
 *                 example: 2
 *               pricePerUnit:
 *                 type: number
 *                 description: Price per unit
 *                 example: 35.42
 *               totalValue:
 *                 type: number
 *                 description: Total value for this item
 *                 example: 248.94
 *     responses:
 *       200:
 *         description: Item updated successfully
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
 *                   example: Item updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     item:
 *                       $ref: '#/components/schemas/CustomPackageItem'
 *                     packageTotals:
 *                       type: object
 *                       properties:
 *                         totalItems:
 *                           type: integer
 *                         totalEstimatedValue:
 *                           type: number
 *                         feeAmount:
 *                           type: number
 *                         netEstimatedValue:
 *                           type: number
 *       400:
 *         description: Bad request - validation error or package is delivered
 *       404:
 *         description: Package or item not found
 *       401:
 *         description: Unauthorized
 */
router.patch('/:id/items/:itemId', updatePackageItemHandler);

/**
 * @swagger
 * /api/optimization/custom-packages/{id}/items/{itemId}:
 *   delete:
 *     summary: Delete a single package item
 *     description: |
 *       Deletes a single item from a custom package. Only non-delivered packages (status = false) can be updated.
 *       Cannot delete the last item in a package - delete the entire package instead.
 *       All logic is handled by an RPC function with no JavaScript loops.
 *       
 *       **Note:** Package totals are automatically recalculated after deletion.
 *     tags: [Optimization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Package ID
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Item ID to delete
 *     responses:
 *       200:
 *         description: Item deleted successfully
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
 *                   example: Item deleted successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     deletedItem:
 *                       $ref: '#/components/schemas/CustomPackageItem'
 *                     packageTotals:
 *                       type: object
 *                       properties:
 *                         totalItems:
 *                           type: integer
 *                         totalEstimatedValue:
 *                           type: number
 *                         feeAmount:
 *                           type: number
 *                         netEstimatedValue:
 *                           type: number
 *       400:
 *         description: Bad request - cannot delete last item or package is delivered
 *       404:
 *         description: Package or item not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id/items/:itemId', deletePackageItemHandler);

export default router;

