import express from 'express';
import { signupHandler, signinHandler, googleSigninHandler, refreshTokenHandler, logoutHandler, logoutAllHandler, forgotPasswordHandler, resetPasswordHandler, verifyResetTokenHandler, verifyInviteHandler, completeSetupHandler } from '../controllers/authController';
import { loginHandler, adminForgotPasswordHandler, adminVerifyResetTokenHandler, adminResetPasswordHandler } from '../controllers/adminController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a new pharmacy user with Supabase Auth
 *     description: Creates a new user in Supabase Auth and links it to a pharmacy profile. Returns access token and custom refresh token for authentication.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignupRequest'
 *     responses:
 *       201:
 *         description: User successfully registered and authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Bad request - validation error or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               validationError:
 *                 value:
 *                   status: 'fail'
 *                   message: 'Please provide email, password, name, and pharmacyName'
 *               userExists:
 *                 value:
 *                   status: 'fail'
 *                   message: 'User with this email already exists'
 *       500:
 *         description: Server error - Supabase admin client not configured
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/signup', signupHandler);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Admin login endpoint
 *     description: Authenticates admin user with email and password. Returns JWT token and user data. This endpoint is specifically for admin panel authentication.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@pharmadmin.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: your_password_here
 *     responses:
 *       200:
 *         description: Admin successfully authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 accessToken:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 access_token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: user_id_here
 *                     email:
 *                       type: string
 *                       example: admin@pharmadmin.com
 *                     name:
 *                       type: string
 *                       example: Admin User
 *                     role:
 *                       type: string
 *                       example: admin
 *       401:
 *         description: Unauthorized - invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invalid email or password
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Please provide email and password
 */
router.post('/login', loginHandler);

/**
 * @swagger
 * /api/auth/signin:
 *   post:
 *     summary: Login with email and password using Supabase Auth
 *     description: Authenticates user with Supabase Auth and returns access token and custom refresh token. The access token expires in 1 hour, while the refresh token is valid for 30 days.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SigninRequest'
 *     responses:
 *       200:
 *         description: User successfully authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Unauthorized - invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: 'fail'
 *               message: 'Invalid email or password'
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: 'fail'
 *               message: 'Please provide email and password'
 *       404:
 *         description: Pharmacy profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: 'fail'
 *               message: 'Pharmacy profile not found'
 */
router.post('/signin', signinHandler);

/**
 * @swagger
 * /api/auth/google-signin:
 *   post:
 *     summary: Sign in with Google (Clerk OAuth)
 *     description: |
 *       Authenticates a pharmacy user via Google email (verified by Clerk on the frontend).
 *       Looks up the pharmacy by email, validates status, and returns JWT tokens.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Google email from Clerk OAuth
 *                 example: pharmacy@gmail.com
 *     responses:
 *       200:
 *         description: Successfully authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       404:
 *         description: No pharmacy found with this email
 *       403:
 *         description: Pharmacy account is suspended, pending, or blacklisted
 */
router.post('/google-signin', googleSigninHandler);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token using custom refresh token
 *     description: |
 *       Uses a custom refresh token to obtain a new access token. 
 *       
 *       **Important:** 
 *       - Custom refresh tokens are valid for 30 days (independent of Supabase session expiry)
 *       - Tokens are rotated on each refresh - always use the new refresh token from the response
 *       - Each refresh token can only be used once for security
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *     responses:
 *       200:
 *         description: Token successfully refreshed. Returns new access token and rotated refresh token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Unauthorized - invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: 'fail'
 *               message: 'Invalid or expired refresh token. Please sign in again.'
 *       400:
 *         description: Bad request - refresh token not provided
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: 'fail'
 *               message: 'Refresh token is required'
 *       404:
 *         description: Pharmacy profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/refresh', refreshTokenHandler);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout and revoke refresh token
 *     description: Revokes the provided refresh token, preventing it from being used to obtain new access tokens. Client should also clear local token storage.
 *     tags: [Authentication]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LogoutRequest'
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LogoutResponse'
 */
router.post('/logout', logoutHandler);

/**
 * @swagger
 * /api/auth/logout-all:
 *   post:
 *     summary: Logout from all devices
 *     description: Revokes all refresh tokens for the authenticated user, effectively logging them out from all devices. Requires authentication.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out from all devices successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LogoutResponse'
 *             example:
 *               status: 'success'
 *               message: 'Logged out from all devices successfully'
 *       401:
 *         description: Unauthorized - no valid access token provided
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: 'fail'
 *               message: 'Authentication required'
 */
router.post('/logout-all', authenticate, logoutAllHandler);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset email
 *     description: |
 *       Sends a password reset email to the provided email address if a pharmacy account exists.
 *       
 *       **Flow:**
 *       1. User submits their email
 *       2. If account exists and is active, Supabase sends a password reset email
 *       3. User clicks the link in the email
 *       4. User is redirected to the frontend with an access token
 *       5. Frontend calls `/api/auth/reset-password` with the token and new password
 *       
 *       **Security:** Response is always the same whether email exists or not to prevent email enumeration.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address of the pharmacy account
 *                 example: pharmacy@example.com
 *               redirectTo:
 *                 type: string
 *                 format: uri
 *                 description: Optional custom redirect URL after password reset (defaults to configured URL)
 *                 example: https://yourapp.com/reset-password
 *     responses:
 *       200:
 *         description: Password reset email sent (or would be sent if account exists)
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
 *                   example: If an account with this email exists, a password reset link has been sent.
 *       400:
 *         description: Bad request - email not provided
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: fail
 *               message: Email is required
 *       403:
 *         description: Account is blocked or suspended
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: fail
 *               message: This account has been suspended. Please contact support to reactivate.
 *       500:
 *         description: Server error - failed to send email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/forgot-password', forgotPasswordHandler);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using reset token
 *     description: |
 *       Resets the user's password using the access token received from the password reset email link.
 *       
 *       **How to get the access token:**
 *       - After user clicks the reset link in their email, they are redirected to your frontend
 *       - The URL will contain the access token in the hash fragment: `#access_token=xxx&type=recovery`
 *       - Extract this token and send it with the new password to this endpoint
 *       
 *       **After successful reset:**
 *       - All existing refresh tokens are revoked (user logged out from all devices)
 *       - User must login with their new password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accessToken
 *               - newPassword
 *             properties:
 *               accessToken:
 *                 type: string
 *                 description: The access token from the password reset redirect URL
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: The new password (minimum 8 characters)
 *                 example: MyNewSecurePassword123!
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
 *                   example: Password has been reset successfully. Please login with your new password.
 *       400:
 *         description: Bad request - missing fields or password too short
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missingToken:
 *                 value:
 *                   status: fail
 *                   message: Access token is required
 *               missingPassword:
 *                 value:
 *                   status: fail
 *                   message: New password is required
 *               weakPassword:
 *                 value:
 *                   status: fail
 *                   message: Password must be at least 8 characters long
 *       401:
 *         description: Invalid or expired reset token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: fail
 *               message: Invalid or expired reset token. Please request a new password reset.
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/reset-password', resetPasswordHandler);

/**
 * @swagger
 * /api/auth/verify-reset-token:
 *   post:
 *     summary: Verify if password reset token is valid
 *     description: |
 *       Checks if the provided access token from the password reset redirect is still valid.
 *       
 *       **Use case:** Frontend can call this when user lands on the reset password page
 *       to verify the token before showing the password reset form.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accessToken
 *             properties:
 *               accessToken:
 *                 type: string
 *                 description: The access token from the password reset redirect URL
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Token validation result
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
 *                     valid:
 *                       type: boolean
 *                       description: Whether the token is valid
 *                       example: true
 *                     email:
 *                       type: string
 *                       format: email
 *                       description: Email associated with the token (only if valid)
 *                       example: pharmacy@example.com
 */
router.post('/verify-reset-token', verifyResetTokenHandler);

// ============================================================
// Pharmacy Invite / Setup Routes (public — no auth required)
// ============================================================
router.post('/verify-invite', verifyInviteHandler);
router.post('/complete-setup', completeSetupHandler);

// ============================================================
// Admin Password Reset Routes
// ============================================================

/**
 * @swagger
 * /api/auth/admin/forgot-password:
 *   post:
 *     summary: Request password reset for admin user
 *     description: Sends a password reset link to the admin's email address. For security, always returns success even if email doesn't exist.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@pharmadmin.com
 *               redirectTo:
 *                 type: string
 *                 format: url
 *                 description: Optional URL to redirect to after password reset
 *                 example: http://localhost:3002/reset-password
 *     responses:
 *       200:
 *         description: Password reset request processed
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
 *                   example: If an account with this email exists, a password reset link has been sent.
 *       400:
 *         description: Bad request - email not provided
 */
router.post('/admin/forgot-password', adminForgotPasswordHandler);

/**
 * @swagger
 * /api/auth/admin/verify-reset-token:
 *   post:
 *     summary: Verify admin password reset token
 *     description: Checks if a password reset token is valid and not expired
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: The password reset token
 *                 example: abc123def456...
 *     responses:
 *       200:
 *         description: Token verification result
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
 *                     valid:
 *                       type: boolean
 *                       example: true
 *                     email:
 *                       type: string
 *                       example: admin@pharmadmin.com
 *                     name:
 *                       type: string
 *                       example: Admin User
 *       400:
 *         description: Bad request - token not provided
 */
router.post('/admin/verify-reset-token', adminVerifyResetTokenHandler);

/**
 * @swagger
 * /api/auth/admin/reset-password:
 *   post:
 *     summary: Reset admin password using reset token
 *     description: Sets a new password for the admin user using the reset token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: The password reset token
 *                 example: abc123def456...
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: NewSecurePassword123!
 *     responses:
 *       200:
 *         description: Password reset successful
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
 *                   example: Password has been reset successfully. You can now login with your new password.
 *       400:
 *         description: Bad request - invalid token or password
 */
router.post('/admin/reset-password', adminResetPasswordHandler);

export default router;
