import express from 'express';
import {
  mainAdminLoginHandler,
  getBuyingGroupsHandler,
  getBuyingGroupByIdHandler,
  createBuyingGroupHandler,
  updateBuyingGroupHandler,
  deleteBuyingGroupHandler,
} from '../controllers/mainAdminController';
import { authenticateMainAdmin } from '../middleware/mainAdminAuth';

const router = express.Router();

// Auth (public)
router.post('/auth/login', mainAdminLoginHandler);

// Buying Groups (protected)
router.get('/buying-groups', authenticateMainAdmin, getBuyingGroupsHandler);
router.get('/buying-groups/:id', authenticateMainAdmin, getBuyingGroupByIdHandler);
router.post('/buying-groups', authenticateMainAdmin, createBuyingGroupHandler);
router.put('/buying-groups/:id', authenticateMainAdmin, updateBuyingGroupHandler);
router.delete('/buying-groups/:id', authenticateMainAdmin, deleteBuyingGroupHandler);

export default router;
