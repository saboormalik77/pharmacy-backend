import { Router } from 'express';
import {
  getAdminSettingsHandler,
  updateAdminSettingsHandler,
  getTimezonesHandler,
  getLanguagesHandler,
  getAdminProfileHandler,
  resetPasswordHandler,
  uploadLogoMiddleware,
  uploadLogoHandler,
} from '../controllers/adminSettingsController';
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
 *     AdminSettings:
 *       type: object
 *       properties:
 *         siteName:
 *           type: string
 *           description: System site name
 *           example: "PharmAdmin"
 *         siteEmail:
 *           type: string
 *           format: email
 *           description: System email address
 *           example: "admin@pharmadmin.com"
 *         timezone:
 *           type: string
 *           description: System timezone
 *           example: "America/New_York"
 *         language:
 *           type: string
 *           description: System language code
 *           example: "en"
 *         emailNotifications:
 *           type: boolean
 *           description: Email notifications enabled
 *           example: true
 *         documentApprovalNotif:
 *           type: boolean
 *           description: Document approval notifications enabled
 *           example: true
 *         paymentNotif:
 *           type: boolean
 *           description: Payment notifications enabled
 *           example: true
 *         shipmentNotif:
 *           type: boolean
 *           description: Shipment notifications enabled
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Settings creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Settings last update timestamp
 *     
 *     UpdateAdminSettingsRequest:
 *       type: object
 *       properties:
 *         siteName:
 *           type: string
 *           description: System site name
 *           example: "PharmAdmin"
 *         siteEmail:
 *           type: string
 *           format: email
 *           description: System email address
 *           example: "admin@pharmadmin.com"
 *         timezone:
 *           type: string
 *           enum: [America/New_York, America/Chicago, America/Denver, America/Los_Angeles, America/Phoenix, America/Anchorage, Pacific/Honolulu, UTC]
 *           description: System timezone
 *           example: "America/New_York"
 *         language:
 *           type: string
 *           enum: [en, es, fr]
 *           description: System language code
 *           example: "en"
 *         emailNotifications:
 *           type: boolean
 *           description: Email notifications enabled
 *           example: true
 *         documentApprovalNotif:
 *           type: boolean
 *           description: Document approval notifications enabled
 *           example: true
 *         paymentNotif:
 *           type: boolean
 *           description: Payment notifications enabled
 *           example: true
 *         shipmentNotif:
 *           type: boolean
 *           description: Shipment notifications enabled
 *           example: true
 *     
 *     TimezoneOption:
 *       type: object
 *       properties:
 *         value:
 *           type: string
 *           description: Timezone value
 *           example: "America/New_York"
 *         label:
 *           type: string
 *           description: Timezone display label
 *           example: "Eastern Time (ET)"
 *     
 *     LanguageOption:
 *       type: object
 *       properties:
 *         value:
 *           type: string
 *           description: Language code
 *           example: "en"
 *         label:
 *           type: string
 *           description: Language display label
 *           example: "English"
 *     
 *     AdminProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Admin user ID
 *         email:
 *           type: string
 *           format: email
 *           description: Admin email
 *         name:
 *           type: string
 *           description: Admin full name
 *         role:
 *           type: string
 *           enum: [super_admin, manager, reviewer, support]
 *           description: Admin role
 *         roleDisplay:
 *           type: string
 *           description: Admin role display name
 *         isActive:
 *           type: boolean
 *           description: Whether admin account is active
 *         lastLoginAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Last login timestamp
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Account creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *     
 *     ResetPasswordRequest:
 *       type: object
 *       required:
 *         - currentPassword
 *         - newPassword
 *         - confirmPassword
 *       properties:
 *         currentPassword:
 *           type: string
 *           description: Current password
 *           example: "OldPassword123"
 *         newPassword:
 *           type: string
 *           minLength: 8
 *           description: New password (min 8 characters)
 *           example: "NewSecurePass456"
 *         confirmPassword:
 *           type: string
 *           description: Confirm new password
 *           example: "NewSecurePass456"
 */

// ============================================================
// Routes
// ============================================================

/**
 * @swagger
 * /api/admin/settings:
 *   get:
 *     summary: Get admin settings
 *     description: |
 *       Returns system-wide admin settings including general settings
 *       (site name, email, timezone, language) and notification preferences.
 *     tags: [Admin - Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin settings retrieved successfully
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
 *                     settings:
 *                       $ref: '#/components/schemas/AdminSettings'
 *       401:
 *         description: Unauthorized - invalid or missing admin token
 *       500:
 *         description: Internal server error
 */
// All authenticated admins can read settings (needed for branding, warehouse address, etc.)
router.get('/', getAdminSettingsHandler);

/**
 * @swagger
 * /api/admin/settings:
 *   patch:
 *     summary: Update admin settings
 *     description: |
 *       Updates system-wide admin settings. Only provided fields will be updated.
 *       
 *       **Available Timezones:**
 *       - America/New_York (Eastern Time)
 *       - America/Chicago (Central Time)
 *       - America/Denver (Mountain Time)
 *       - America/Los_Angeles (Pacific Time)
 *       - America/Phoenix (Arizona Time)
 *       - America/Anchorage (Alaska Time)
 *       - Pacific/Honolulu (Hawaii Time)
 *       - UTC
 *       
 *       **Available Languages:**
 *       - en (English)
 *       - es (Spanish)
 *       - fr (French)
 *     tags: [Admin - Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateAdminSettingsRequest'
 *     responses:
 *       200:
 *         description: Admin settings updated successfully
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
 *                   example: Settings updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     settings:
 *                       $ref: '#/components/schemas/AdminSettings'
 *       400:
 *         description: Bad request - invalid timezone or language
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.patch('/', requirePermission('settings'), updateAdminSettingsHandler);

/**
 * @swagger
 * /api/admin/settings/timezones:
 *   get:
 *     summary: Get available timezones
 *     description: Returns list of supported timezones for dropdown selection.
 *     tags: [Admin - Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Timezones retrieved successfully
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
 *                     timezones:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/TimezoneOption'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
// Reference data - accessible to all authenticated admins
router.get('/timezones', getTimezonesHandler);

/**
 * @swagger
 * /api/admin/settings/languages:
 *   get:
 *     summary: Get available languages
 *     description: Returns list of supported languages for dropdown selection.
 *     tags: [Admin - Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Languages retrieved successfully
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
 *                     languages:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/LanguageOption'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
// Reference data - accessible to all authenticated admins
router.get('/languages', getLanguagesHandler);

/**
 * @swagger
 * /api/admin/settings/profile:
 *   get:
 *     summary: Get current admin profile
 *     description: Returns the profile information of the currently authenticated admin.
 *     tags: [Admin - Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin profile retrieved successfully
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
 *                     admin:
 *                       $ref: '#/components/schemas/AdminProfile'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Admin user not found
 *       500:
 *         description: Internal server error
 */
router.get('/profile', getAdminProfileHandler);

/**
 * @swagger
 * /api/admin/settings/reset-password:
 *   post:
 *     summary: Reset admin password
 *     description: |
 *       Allows the currently authenticated admin to reset their own password.
 *       Requires current password for verification.
 *       
 *       **Password Requirements:**
 *       - Minimum 8 characters
 *       - New password must match confirm password
 *     tags: [Admin - Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *     responses:
 *       200:
 *         description: Password reset successfully
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
 *                   example: Password reset successfully
 *       400:
 *         description: Bad request - passwords don't match or too short
 *       401:
 *         description: Unauthorized - current password incorrect
 *       404:
 *         description: Admin user not found
 *       500:
 *         description: Internal server error
 */
router.post('/reset-password', resetPasswordHandler);
router.post('/upload-logo', requirePermission('settings'), uploadLogoMiddleware as any, uploadLogoHandler);

export default router;

