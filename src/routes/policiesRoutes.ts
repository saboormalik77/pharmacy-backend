import { Router } from 'express';
import {
  listPoliciesHandler,
  getPolicyByIdHandler,
  createPolicyHandler,
  updatePolicyHandler,
  deletePolicyHandler,
  addReturnPolicyHandler,
  updateReturnPolicyHandler,
  deleteReturnPolicyHandler,
  getExceptionsHandler,
  addExceptionHandler,
  deleteExceptionHandler,
  getNotesHandler,
  addNoteHandler,
  deleteNoteHandler,
  bulkImportHandler,
  checkReturnabilityHandler,
} from '../controllers/policiesController';
import { authenticateAdmin } from '../middleware/adminAuth';
import { authenticateProcessor } from '../middleware/processorAuth';

// ============================================================
// Admin Policies Router  →  /api/admin/policies
// ============================================================
export const adminPoliciesRouter = Router();
adminPoliciesRouter.use(authenticateAdmin);

/**
 * @swagger
 * tags:
 *   name: Admin - Policies
 *   description: Manufacturer return policies management (Module 5)
 */

// ── Manufacturer Policies CRUD ─────────────────────────────

/**
 * @swagger
 * /api/admin/policies:
 *   get:
 *     summary: List manufacturer policies (paginated, searchable)
 *     tags: [Admin - Policies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by manufacturer name, labeler ID, or email
 *       - in: query
 *         name: labelerType
 *         schema: { type: string, enum: [all, generic, brand] }
 *       - in: query
 *         name: destination
 *         schema: { type: string, enum: [all, inmar, qualanex, pharmalink, other] }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, default: manufacturer_name }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc], default: asc }
 *     responses:
 *       200:
 *         description: Paginated list of manufacturer policies
 */
adminPoliciesRouter.get('/', listPoliciesHandler);

/**
 * @swagger
 * /api/admin/policies:
 *   post:
 *     summary: Create a manufacturer policy
 *     tags: [Admin - Policies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [labelerId, manufacturerName]
 *             properties:
 *               labelerId: { type: string, example: "43547" }
 *               labelerType: { type: string, enum: [generic, brand], default: generic }
 *               manufacturerName: { type: string, example: "Solco Healthcare US LLC" }
 *               address1: { type: string }
 *               city: { type: string }
 *               state: { type: string }
 *               zip: { type: string }
 *               mainContact: { type: string }
 *               mainPhone: { type: string }
 *               creditRequestEmail: { type: string }
 *               averagePayPercent: { type: number, example: 68.5 }
 *               averageDaysToPay: { type: integer, example: 210 }
 *     responses:
 *       201:
 *         description: Policy created
 *       409:
 *         description: Labeler ID already exists
 */
adminPoliciesRouter.post('/', createPolicyHandler);

/**
 * @swagger
 * /api/admin/policies/bulk-import:
 *   post:
 *     summary: Bulk import manufacturer policies from CSV/spreadsheet data
 *     tags: [Admin - Policies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rows]
 *             properties:
 *               rows:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [labelerId, manufacturerName]
 *                   properties:
 *                     labelerId: { type: string }
 *                     labelerType: { type: string }
 *                     manufacturerName: { type: string }
 *                     destination: { type: string }
 *                     policyDescription: { type: string }
 *                     monthsBeforeExpiration: { type: integer }
 *                     monthsAfterExpiration: { type: integer }
 *                     discountRate: { type: number }
 *                     partialsAccepted: { type: boolean }
 *                     reimbursementType: { type: string }
 *     responses:
 *       200:
 *         description: Import results with created/updated/skipped counts
 */
adminPoliciesRouter.post('/bulk-import', bulkImportHandler);

/**
 * @swagger
 * /api/admin/policies/{id}:
 *   get:
 *     summary: Get manufacturer policy with return policies, exceptions, and notes
 *     tags: [Admin - Policies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Full policy detail
 *       404:
 *         description: Not found
 */
adminPoliciesRouter.get('/:id', getPolicyByIdHandler);

/**
 * @swagger
 * /api/admin/policies/{id}:
 *   patch:
 *     summary: Update manufacturer policy
 *     tags: [Admin - Policies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               manufacturerName: { type: string }
 *               labelerType: { type: string }
 *               averagePayPercent: { type: number }
 *               averageDaysToPay: { type: integer }
 *               verifiedDate: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Updated
 */
adminPoliciesRouter.patch('/:id', updatePolicyHandler);

/**
 * @swagger
 * /api/admin/policies/{id}:
 *   delete:
 *     summary: Delete manufacturer policy (cascades to return policies, exceptions, notes)
 *     tags: [Admin - Policies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deleted
 */
adminPoliciesRouter.delete('/:id', deletePolicyHandler);

// ── Return Policies (sub-records) ──────────────────────────

/**
 * @swagger
 * /api/admin/policies/{id}/return-policies:
 *   post:
 *     summary: Add a return policy sub-record to a manufacturer
 *     tags: [Admin - Policies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [destination]
 *             properties:
 *               destination: { type: string, enum: [inmar, qualanex, pharmalink, other] }
 *               autoRaEmail: { type: string }
 *               policyNumber: { type: integer }
 *               policyDescription: { type: string, example: "6 Months Prior to 12 Months Post" }
 *               monthsBeforeExpiration: { type: integer, default: 6 }
 *               monthsAfterExpiration: { type: integer, default: 6 }
 *               discountRate: { type: number, example: 0.5 }
 *               partialsAccepted: { type: boolean, default: false }
 *               partialDosageForms: { type: array, items: { type: string } }
 *               reimbursementType: { type: string, enum: [batch, per_item] }
 *     responses:
 *       201:
 *         description: Return policy added
 */
adminPoliciesRouter.post('/:id/return-policies', addReturnPolicyHandler);

/**
 * @swagger
 * /api/admin/policies/{id}/return-policies/{returnPolicyId}:
 *   patch:
 *     summary: Update a return policy sub-record
 *     tags: [Admin - Policies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: returnPolicyId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated
 */
adminPoliciesRouter.patch('/:id/return-policies/:returnPolicyId', updateReturnPolicyHandler);

/**
 * @swagger
 * /api/admin/policies/{id}/return-policies/{returnPolicyId}:
 *   delete:
 *     summary: Delete a return policy sub-record
 *     tags: [Admin - Policies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: returnPolicyId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deleted
 */
adminPoliciesRouter.delete('/:id/return-policies/:returnPolicyId', deleteReturnPolicyHandler);

// ── Exceptions (non-returnable products) ───────────────────

/**
 * @swagger
 * /api/admin/policies/{id}/exceptions:
 *   get:
 *     summary: Get non-returnable product exceptions for a manufacturer
 *     tags: [Admin - Policies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: List of exceptions
 */
adminPoliciesRouter.get('/:id/exceptions', getExceptionsHandler);

/**
 * @swagger
 * /api/admin/policies/{id}/exceptions:
 *   post:
 *     summary: Add a non-returnable product exception
 *     tags: [Admin - Policies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ndc]
 *             properties:
 *               ndc: { type: string, example: "00093-0150-01" }
 *               productName: { type: string }
 *               reason: { type: string }
 *     responses:
 *       201:
 *         description: Exception added
 */
adminPoliciesRouter.post('/:id/exceptions', addExceptionHandler);

/**
 * @swagger
 * /api/admin/policies/{id}/exceptions/{exceptionId}:
 *   delete:
 *     summary: Delete a non-returnable product exception
 *     tags: [Admin - Policies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: exceptionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deleted
 */
adminPoliciesRouter.delete('/:id/exceptions/:exceptionId', deleteExceptionHandler);

// ── Notes ──────────────────────────────────────────────────

/**
 * @swagger
 * /api/admin/policies/{id}/notes:
 *   get:
 *     summary: Get policy notes
 *     tags: [Admin - Policies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: List of notes
 */
adminPoliciesRouter.get('/:id/notes', getNotesHandler);

/**
 * @swagger
 * /api/admin/policies/{id}/notes:
 *   post:
 *     summary: Add a policy note
 *     tags: [Admin - Policies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [noteText]
 *             properties:
 *               noteDate: { type: string, format: date }
 *               authorInitials: { type: string, example: "JV" }
 *               noteText: { type: string }
 *     responses:
 *       201:
 *         description: Note added
 */
adminPoliciesRouter.post('/:id/notes', addNoteHandler);

/**
 * @swagger
 * /api/admin/policies/{id}/notes/{noteId}:
 *   delete:
 *     summary: Delete a policy note
 *     tags: [Admin - Policies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: noteId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deleted
 */
adminPoliciesRouter.delete('/:id/notes/:noteId', deleteNoteHandler);


// ============================================================
// Policy Check Router  →  /api/policies
// Accessible by both admin and processor
// ============================================================
export const policyCheckRouter = Router();

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
    // fall through to admin
  }
  authenticateAdmin(req, res, next);
};

/**
 * @swagger
 * /api/policies/check:
 *   post:
 *     summary: Check returnability for an NDC (used during product scanning)
 *     description: |
 *       Runs the policy engine to determine if a product is returnable, non-returnable, or TBD.
 *       Returns destination, timing window, partial acceptance, and discount rate.
 *     tags: [Policies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ndc, expirationDate]
 *             properties:
 *               ndc:
 *                 type: string
 *                 description: NDC code (any format — dashed or plain digits)
 *                 example: "43547-325-06"
 *               expirationDate:
 *                 type: string
 *                 format: date
 *                 description: Product expiration date (YYYY-MM-DD)
 *                 example: "2026-06-15"
 *               isPartial:
 *                 type: boolean
 *                 description: Whether this is a partial package
 *                 default: false
 *               dosageForm:
 *                 type: string
 *                 description: Dosage form (e.g. TABLET, CAPSULE). Required when isPartial=true.
 *                 example: "TABLET, DELAYED RELEASE"
 *     responses:
 *       200:
 *         description: Returnability check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: object
 *                   properties:
 *                     status: { type: string, enum: [returnable, non_returnable, tbd] }
 *                     reason: { type: string, nullable: true }
 *                     destination: { type: string, nullable: true }
 *                     discountRate: { type: number, nullable: true }
 *                     windowStart: { type: string, nullable: true }
 *                     windowEnd: { type: string, nullable: true }
 *                     expectedReturnableDate: { type: string, nullable: true }
 *                     manufacturerName: { type: string, nullable: true }
 */
policyCheckRouter.post('/check', authenticateAny, checkReturnabilityHandler);
