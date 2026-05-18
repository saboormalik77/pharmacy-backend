import { Router } from 'express';
import {
  getAdminUsersHandler,
  getAdminByIdHandler,
  getAdminRolesHandler,
  createAdminHandler,
  updateAdminHandler,
  updateAdminPasswordHandler,
  deleteAdminHandler,
} from '../controllers/adminUsersController';
import { authenticateAdmin, requirePermission } from '../middleware/adminAuth';
import { ALL_ADMIN_PERMISSIONS } from '../services/adminService';

const router = Router();

// Apply admin authentication to all routes
router.use(authenticateAdmin);
router.use(requirePermission('admins'));

// ============================================================
// Swagger Schemas
// ============================================================

/**
 * @swagger
 * components:
 *   schemas:
 *     AdminUser:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Admin user ID
 *           example: "abc123-def456-ghi789"
 *         email:
 *           type: string
 *           format: email
 *           description: Admin email address
 *           example: "admin@example.com"
 *         name:
 *           type: string
 *           description: Admin full name
 *           example: "John Admin"
 *         role:
 *           type: string
 *           enum: [super_admin, manager, reviewer, support]
 *           description: Admin role (internal value)
 *           example: "super_admin"
 *         roleDisplay:
 *           type: string
 *           description: Admin role (display value)
 *           example: "Super Admin"
 *         isActive:
 *           type: boolean
 *           description: Whether admin account is active
 *           example: true
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *           description: Admin status
 *           example: "active"
 *         lastLoginAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Last login timestamp
 *           example: "2025-12-23T10:30:00.000Z"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Account creation timestamp
 *           example: "2025-01-15T00:00:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *           example: "2025-12-23T10:30:00.000Z"
 *     
 *     AdminStats:
 *       type: object
 *       properties:
 *         totalAdmins:
 *           type: integer
 *           description: Total number of admin users
 *           example: 10
 *         activeAdmins:
 *           type: integer
 *           description: Number of active admin users
 *           example: 8
 *         inactiveAdmins:
 *           type: integer
 *           description: Number of inactive admin users
 *           example: 2
 *         superAdmins:
 *           type: integer
 *           description: Number of Super Admin users
 *           example: 2
 *         managers:
 *           type: integer
 *           description: Number of Manager users
 *           example: 3
 *         reviewers:
 *           type: integer
 *           description: Number of Reviewer users
 *           example: 3
 *         support:
 *           type: integer
 *           description: Number of Support users
 *           example: 2
 *         byRole:
 *           type: object
 *           properties:
 *             super_admin:
 *               type: integer
 *               example: 2
 *             manager:
 *               type: integer
 *               example: 3
 *             reviewer:
 *               type: integer
 *               example: 3
 *             support:
 *               type: integer
 *               example: 2
 *     
 *     AdminRole:
 *       type: object
 *       properties:
 *         value:
 *           type: string
 *           description: Role internal value
 *           example: "super_admin"
 *         label:
 *           type: string
 *           description: Role display label
 *           example: "Super Admin"
 *         description:
 *           type: string
 *           description: Role description
 *           example: "Full system access, manage all users, system configuration"
 *         color:
 *           type: string
 *           description: Role color for UI
 *           example: "danger"
 *     
 *     AdminListResponse:
 *       type: object
 *       properties:
 *         admins:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/AdminUser'
 *         stats:
 *           $ref: '#/components/schemas/AdminStats'
 *         pagination:
 *           type: object
 *           properties:
 *             page:
 *               type: integer
 *               example: 1
 *             limit:
 *               type: integer
 *               example: 10
 *             total:
 *               type: integer
 *               example: 10
 *             totalPages:
 *               type: integer
 *               example: 1
 *     
 *     CreateAdminRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - name
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Admin email address
 *           example: "newadmin@example.com"
 *         password:
 *           type: string
 *           minLength: 8
 *           description: Admin password (min 8 characters)
 *           example: "SecurePass123"
 *         name:
 *           type: string
 *           description: Admin full name
 *           example: "Jane Doe"
 *         role:
 *           type: string
 *           enum: [super_admin, manager, reviewer, support]
 *           default: support
 *           description: Admin role
 *           example: "manager"
 *     
 *     UpdateAdminRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Admin full name
 *           example: "Jane Updated"
 *         email:
 *           type: string
 *           format: email
 *           description: Admin email address
 *           example: "jane.updated@example.com"
 *         role:
 *           type: string
 *           enum: [super_admin, manager, reviewer, support]
 *           description: Admin role
 *           example: "reviewer"
 *         isActive:
 *           type: boolean
 *           description: Whether admin account is active
 *           example: true
 *     
 *     UpdatePasswordRequest:
 *       type: object
 *       required:
 *         - newPassword
 *       properties:
 *         newPassword:
 *           type: string
 *           minLength: 8
 *           description: New password (min 8 characters)
 *           example: "NewSecurePass456"
 */

// ============================================================
// Routes
// ============================================================

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get list of admin users with stats
 *     description: |
 *       Returns a paginated list of admin users with filtering, search, and sorting options.
 *       Also includes statistics about admin users.
 *       
 *       **Available Roles:**
 *       - **super_admin**: Full system access, manage all users, system configuration
 *       - **manager**: Manage pharmacies, approve documents, process payments, view analytics
 *       - **reviewer**: Review documents, approve/reject returns, view shipments
 *       - **support**: View-only access, customer support, answer queries, generate reports
 *     tags: [Admin - Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, or ID
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [all, super_admin, manager, reviewer, support]
 *         description: Filter by role
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, active, inactive]
 *         description: Filter by status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, email, role, created_at, last_login_at]
 *           default: created_at
 *         description: Sort by field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Admin users list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/AdminListResponse'
 *       401:
 *         description: Unauthorized - invalid or missing admin token
 *       500:
 *         description: Internal server error
 */
router.get('/', getAdminUsersHandler);

/**
 * @swagger
 * /api/admin/users/roles:
 *   get:
 *     summary: Get all available admin roles
 *     description: |
 *       Returns all available admin roles with their descriptions and colors.
 *       Use this endpoint to populate role dropdowns in the UI.
 *     tags: [Admin - Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin roles retrieved successfully
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
 *                     roles:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AdminRole'
 *             example:
 *               status: success
 *               data:
 *                 roles:
 *                   - value: "super_admin"
 *                     label: "Super Admin"
 *                     description: "Full system access, manage all users, system configuration"
 *                     color: "danger"
 *                   - value: "manager"
 *                     label: "Manager"
 *                     description: "Manage pharmacies, approve documents, process payments, view analytics"
 *                     color: "warning"
 *                   - value: "reviewer"
 *                     label: "Reviewer"
 *                     description: "Review documents, approve/reject returns, view shipments"
 *                     color: "info"
 *                   - value: "support"
 *                     label: "Support"
 *                     description: "View-only access, customer support, answer queries, generate reports"
 *                     color: "default"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/roles', getAdminRolesHandler);

router.get('/permissions', (_req, res) => {
  res.json({
    status: 'success',
    data: {
      permissions: ALL_ADMIN_PERMISSIONS,
    },
  });
});

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: Get admin user by ID
 *     description: Returns detailed information about a specific admin user.
 *     tags: [Admin - Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Admin user ID
 *     responses:
 *       200:
 *         description: Admin user retrieved successfully
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
 *                       $ref: '#/components/schemas/AdminUser'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Admin user not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', getAdminByIdHandler);

/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     summary: Create new admin user
 *     description: |
 *       Creates a new admin user with the specified role.
 *       Password will be hashed before storing.
 *       
 *       **Available Roles:**
 *       - super_admin
 *       - manager
 *       - reviewer
 *       - support (default)
 *     tags: [Admin - Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAdminRequest'
 *     responses:
 *       201:
 *         description: Admin user created successfully
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
 *                   example: Admin user created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     admin:
 *                       $ref: '#/components/schemas/AdminUser'
 *       400:
 *         description: Bad request - validation error or email already exists
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/', createAdminHandler);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   patch:
 *     summary: Update admin user
 *     description: |
 *       Updates an existing admin user's information.
 *       Only provided fields will be updated.
 *     tags: [Admin - Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Admin user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateAdminRequest'
 *     responses:
 *       200:
 *         description: Admin user updated successfully
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
 *                   example: Admin user updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     admin:
 *                       $ref: '#/components/schemas/AdminUser'
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Admin user not found
 *       500:
 *         description: Internal server error
 */
router.patch('/:id', updateAdminHandler);

/**
 * @swagger
 * /api/admin/users/{id}/password:
 *   patch:
 *     summary: Update admin password
 *     description: |
 *       Updates an admin user's password.
 *       Password must be at least 8 characters long.
 *     tags: [Admin - Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Admin user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePasswordRequest'
 *     responses:
 *       200:
 *         description: Password updated successfully
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
 *                   example: Password updated successfully
 *       400:
 *         description: Bad request - password too short
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Admin user not found
 *       500:
 *         description: Internal server error
 */
router.patch('/:id/password', updateAdminPasswordHandler);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Delete admin user
 *     description: |
 *       Deletes an admin user.
 *       
 *       **Restrictions:**
 *       - Cannot delete your own account
 *       - Cannot delete the last Super Admin
 *     tags: [Admin - Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Admin user ID to delete
 *     responses:
 *       200:
 *         description: Admin user deleted successfully
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
 *                   example: Admin user deleted successfully
 *       400:
 *         description: Bad request - cannot delete last Super Admin or self
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Admin user not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', deleteAdminHandler);

export default router;

