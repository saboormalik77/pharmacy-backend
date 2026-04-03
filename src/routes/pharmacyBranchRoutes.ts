import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  createBranchHandler,
  listBranchesHandler,
  getBranchDetailHandler,
  updateBranchStatusHandler,
  getPendingBranchInvitesHandler,
  resendBranchInviteHandler,
  getPharmacyContextHandler,
  switchToBranchHandler,
} from '../controllers/pharmacyBranchController';

const router = express.Router();

router.get('/context', authenticate, getPharmacyContextHandler);
router.get('/invites', authenticate, getPendingBranchInvitesHandler);
router.post('/invites/:id/resend', authenticate, resendBranchInviteHandler);
router.post('/switch/:branchId', authenticate, switchToBranchHandler);
router.post('/', authenticate, createBranchHandler);
router.get('/', authenticate, listBranchesHandler);
router.get('/:id', authenticate, getBranchDetailHandler);
router.put('/:id/status', authenticate, updateBranchStatusHandler);

export default router;
