import express from 'express';
import {
  getPlans,
  getPlanById,
  getSubscription,
  createCheckout,
  createPortal,
  cancel,
  reactivate,
  changePlan,
} from '../controllers/subscriptionController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Public routes (no auth required)
router.get('/plans', getPlans);
router.get('/plans/:planId', getPlanById);

// Protected routes (auth required)
router.use(authenticate);

router.get('/', getSubscription);
router.post('/checkout', createCheckout);
router.post('/portal', createPortal);
router.post('/cancel', cancel);
router.post('/reactivate', reactivate);
router.post('/change-plan', changePlan);

export default router;

