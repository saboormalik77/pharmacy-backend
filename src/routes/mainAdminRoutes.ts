import express from 'express';
import {
  mainAdminLoginHandler,
  getMeHandler,
  getBuyingGroupsHandler,
  getBuyingGroupByIdHandler,
  createBuyingGroupHandler,
  updateBuyingGroupHandler,
  deleteBuyingGroupHandler,
  getBuyingGroupDomainsHandler,
  upsertBuyingGroupDomainHandler,
  deleteBuyingGroupDomainHandler,
} from '../controllers/mainAdminController';
import {
  getPermissionsListHandler,
  createSubMainAdminHandler,
  getSubMainAdminsHandler,
  getSubMainAdminByIdHandler,
  updateSubMainAdminHandler,
  deleteSubMainAdminHandler,
  resendInviteHandler,
  validateInviteTokenHandler,
  acceptInviteHandler,
} from '../controllers/subMainAdminController';
import { authenticateMainAdmin } from '../middleware/mainAdminAuth';

const router = express.Router();

// Auth (public)
router.post('/auth/login', mainAdminLoginHandler);

// Auth (protected) — fetch fresh user/permissions on page refresh
router.get('/auth/me', authenticateMainAdmin, getMeHandler);

// Sub-admin invite flow (public — no auth needed)
router.get('/sub-admins/invite/validate', validateInviteTokenHandler);
router.post('/sub-admins/invite/accept', acceptInviteHandler);

// Buying Groups (protected)
router.get('/buying-groups', authenticateMainAdmin, getBuyingGroupsHandler);
router.get('/buying-groups/:id', authenticateMainAdmin, getBuyingGroupByIdHandler);
router.post('/buying-groups', authenticateMainAdmin, createBuyingGroupHandler);
router.put('/buying-groups/:id', authenticateMainAdmin, updateBuyingGroupHandler);
router.delete('/buying-groups/:id', authenticateMainAdmin, deleteBuyingGroupHandler);

// Buying Group domain management (protected)
router.get('/buying-groups/:id/domains', authenticateMainAdmin, getBuyingGroupDomainsHandler);
router.post('/buying-groups/:id/domains', authenticateMainAdmin, upsertBuyingGroupDomainHandler);
router.delete('/buying-groups/domains/:domainId', authenticateMainAdmin, deleteBuyingGroupDomainHandler);

// Sub-admin management (protected)
router.get('/sub-admins/permissions', authenticateMainAdmin, getPermissionsListHandler);
router.get('/sub-admins', authenticateMainAdmin, getSubMainAdminsHandler);
router.get('/sub-admins/:id', authenticateMainAdmin, getSubMainAdminByIdHandler);
router.post('/sub-admins', authenticateMainAdmin, createSubMainAdminHandler);
router.put('/sub-admins/:id', authenticateMainAdmin, updateSubMainAdminHandler);
router.delete('/sub-admins/:id', authenticateMainAdmin, deleteSubMainAdminHandler);
router.post('/sub-admins/:id/resend-invite', authenticateMainAdmin, resendInviteHandler);

export default router;
