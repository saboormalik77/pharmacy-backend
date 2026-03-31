import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { listReverseDistributorsHandler } from '../controllers/adminDistributorsController';

const router = Router();

// GET /api/reverse-distributors — pharmacy-facing destination dropdown data
router.get('/', authenticate, listReverseDistributorsHandler);

export default router;
